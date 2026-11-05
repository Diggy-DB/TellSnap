import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { FirestoreService, SceneStatus, SegmentStatus, JobType, JobStatus, Scene, Segment, Job, Topic, User } from '../../firestore/firestore.service';
import { RedisService } from '../../redis/redis.service';
import { CreateSceneDto, ContinueSceneDto, ListScenesQueryDto } from './dto';

// Interface for segmentation API response
interface SegmentInfo {
  order_index: number;
  prompt: string;
  scene_description: string;
  duration_estimate: number;
  continuity_notes: string;
}

interface SegmentationResponse {
  needs_segmentation: boolean;
  total_duration_estimate: number;
  num_segments: number;
  segments: SegmentInfo[];
}

@Injectable()
export class ScenesService {
  private readonly logger = new Logger(ScenesService.name);
  private readonly generatorApiUrl = process.env.GENERATOR_API_URL || 'http://localhost:8080';

  constructor(
    private firestore: FirestoreService,
    private redis: RedisService,
    @InjectQueue('generation') private generationQueue: Queue,
  ) {}

  async list(query: ListScenesQueryDto) {
    const { page = 1, limit = 20, topicId, genre, sort = 'recent' } = query;
    const skip = (page - 1) * limit;

    // Build query conditions - show all scenes, not just published
    const whereConditions: Array<{ field: string; op: '=='; value: unknown }> = [];
    if (topicId) {
      whereConditions.push({ field: 'topicId', op: '==', value: topicId });
    }
    if (genre) {
      whereConditions.push({ field: 'genre', op: '==', value: genre });
    }

    // Determine sort field
    let orderField = 'createdAt';
    if (sort === 'popular') orderField = 'upvotes';
    else if (sort === 'trending') orderField = 'viewCount';

    // Query Firestore - skip orderBy when filtering by genre to avoid needing composite index
    let scenes = await this.firestore.findMany<Scene>('scenes', {
      where: whereConditions.length > 0 ? whereConditions : undefined,
      orderBy: genre ? undefined : [{ field: orderField, direction: 'desc' }],
    });

    // Sort in-memory when filtering by genre
    if (genre) {
      scenes.sort((a, b) => {
        const aVal = (a as unknown as Record<string, unknown>)[orderField];
        const bVal = (b as unknown as Record<string, unknown>)[orderField];
        if (aVal instanceof Date && bVal instanceof Date) {
          return bVal.getTime() - aVal.getTime();
        }
        return String(bVal).localeCompare(String(aVal));
      });
    }

    const total = scenes.length;
    scenes = scenes.slice(skip, skip + limit);

    // Enrich with topic and creator info, plus get thumbnail from first segment
    const items = await Promise.all(
      scenes.map(async (scene) => {
        let topic: Partial<Topic> | null = null;
        let createdBy: Partial<User> | null = null;
        let thumbnailUrl = scene.thumbnailUrl;

        if (scene.topicId) {
          topic = await this.firestore.findById<Topic>('topics', scene.topicId);
        }
        if (scene.createdById) {
          createdBy = await this.firestore.findById<User>('users', scene.createdById);
        }
        
        // If scene doesn't have thumbnail, get it from the first segment
        if (!thumbnailUrl) {
          try {
            // Query without orderBy to avoid composite index, then sort in-memory
            const segments = await this.firestore.findMany<Segment>('segments', {
              where: [{ field: 'sceneId', op: '==', value: scene.id }],
            });
            segments.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
            if (segments.length > 0 && segments[0].imageUrl) {
              thumbnailUrl = segments[0].imageUrl;
            } else if (segments.length > 0 && segments[0].thumbnailUrl) {
              thumbnailUrl = segments[0].thumbnailUrl;
            }
          } catch (e) {
            // Ignore errors fetching segments
          }
        }

        return {
          ...scene,
          thumbnailUrl,
          topic: topic ? { id: topic.id, title: topic.title } : null,
          createdBy: createdBy
            ? { id: createdBy.id, username: createdBy.username, avatarUrl: createdBy.avatarUrl }
            : null,
        };
      }),
    );

    return {
      items,
      meta: {
        page,
        limit,
        total,
        hasMore: skip + items.length < total,
      },
    };
  }

  async findById(id: string) {
    // Try cache first
    const cached = await this.redis.get(`scene:${id}`);
    if (cached) return cached;

    const scene = await this.firestore.findById<Scene>('scenes', id);

    if (!scene) {
      throw new NotFoundException('Scene not found');
    }

    // Fetch related data
    let topic: Partial<Topic> | null = null;
    let createdBy: Partial<User> | null = null;

    if (scene.topicId) {
      topic = await this.firestore.findById<Topic>('topics', scene.topicId);
    }
    if (scene.createdById) {
      createdBy = await this.firestore.findById<User>('users', scene.createdById);
    }

    // Fetch segments - query without orderBy to avoid composite index, sort in-memory
    const segments = await this.firestore.findMany<Segment>('segments', {
      where: [{ field: 'sceneId', op: '==', value: id }],
    });
    segments.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    const result = {
      ...scene,
      topic: topic ? { id: topic.id, title: topic.title } : null,
      createdBy: createdBy
        ? { id: createdBy.id, username: createdBy.username, avatarUrl: createdBy.avatarUrl }
        : null,
      segments: segments.map((s) => ({
        id: s.id,
        orderIndex: s.orderIndex,
        prompt: s.prompt,
        thumbnailUrl: s.thumbnailUrl,
        imageUrl: s.imageUrl,
        numPanels: s.numPanels,
        comicStyle: s.comicStyle,
        status: s.status,
        createdAt: s.createdAt,
      })),
    };

    // Cache for 1 minute
    await this.redis.set(`scene:${id}`, result, 60);

    return result;
  }

  async getPages(id: string) {
    const scene = await this.firestore.findById<Scene>('scenes', id);

    if (!scene) {
      throw new NotFoundException('Scene not found');
    }

    // Fetch completed segments - query without orderBy to avoid composite index, sort in-memory
    let segments = await this.firestore.findMany<Segment>('segments', {
      where: [{ field: 'sceneId', op: '==', value: id }],
    });
    // Filter completed and sort in-memory
    segments = segments.filter(s => s.status === SegmentStatus.COMPLETED);
    segments.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    return {
      sceneId: scene.id,
      totalPages: segments.length,
      pages: segments.map((s) => ({
        id: s.id,
        orderIndex: s.orderIndex,
        imageUrl: s.imageUrl,
        thumbnailUrl: s.thumbnailUrl,
        numPanels: s.numPanels,
        comicStyle: s.comicStyle,
      })),
    };
  }

  async create(dto: CreateSceneDto, userId: string) {
    // Create scene
    const sceneId = await this.firestore.create('scenes', {
      title: dto.title,
      description: dto.description,
      topicId: dto.topicId,
      createdById: userId,
      status: SceneStatus.DRAFT,
      segmentCount: 0,
      totalDuration: 0,
    });

    const scene = await this.firestore.findById<Scene>('scenes', sceneId);

    // Create initial Scene Bible
    await this.firestore.create('sceneBibles', {
      sceneId,
      characters: [],
      locations: [],
      objects: [],
      timeline: [],
      rules: [],
      version: 1,
    });

    // Analyze script to determine if it needs segmentation
    let segmentsToCreate: SegmentInfo[] = [];
    
    try {
      const segmentationResult = await this.analyzeScript(dto.initialPrompt);
      
      if (segmentationResult && segmentationResult.needs_segmentation) {
        this.logger.log(`Script needs segmentation: ${segmentationResult.num_segments} segments`);
        segmentsToCreate = segmentationResult.segments;
      } else {
        // Single segment
        segmentsToCreate = [{
          order_index: 1,
          prompt: dto.initialPrompt,
          scene_description: '',
          duration_estimate: 8,
          continuity_notes: '',
        }];
      }
    } catch (error) {
      this.logger.warn('Script analysis failed, creating single segment', error);
      // Fallback to single segment if analysis fails
      segmentsToCreate = [{
        order_index: 1,
        prompt: dto.initialPrompt,
        scene_description: '',
        duration_estimate: 8,
        continuity_notes: '',
      }];
    }

    // Create segments and queue jobs
    const segments: Segment[] = [];
    const jobs: Job[] = [];

    for (const segInfo of segmentsToCreate) {
      const segmentId = await this.firestore.create('segments', {
        sceneId,
        createdById: userId,
        orderIndex: segInfo.order_index,
        prompt: segInfo.prompt,
        status: SegmentStatus.PENDING,
      });
      const segment = await this.firestore.findById<Segment>('segments', segmentId);
      if (segment) segments.push(segment);

      const jobId = await this.firestore.create('jobs', {
        type: JobType.GENERATE_COMIC,
        segmentId,
        status: JobStatus.PENDING,
        priority: 0,
        progress: 0,
        attempts: 0,
        maxAttempts: 3,
      });
      const job = await this.firestore.findById<Job>('jobs', jobId);
      if (job) jobs.push(job);

      // Queue job - add delay for subsequent segments to ensure ordering
      const delay = (segInfo.order_index - 1) * 1000; // 1 second delay between segments
      await this.generationQueue.add('generate-comic', {
        jobId,
        sceneId,
        segmentId,
        comicStyle: 'manga',  // Default style
      }, { delay });
      
      this.logger.log(`Queued comic page ${segInfo.order_index}/${segmentsToCreate.length}`);
    }

    // Update scene segment count
    await this.firestore.update<Scene>('scenes', sceneId, {
      segmentCount: segments.length,
    });

    return { 
      scene, 
      segment: segments[0], 
      job: jobs[0],
      totalSegments: segments.length,
      segments,
    };
  }

  /**
   * Analyze a script to determine if it needs to be split into segments.
   */
  private async analyzeScript(prompt: string): Promise<SegmentationResponse | null> {
    try {
      const response = await fetch(`${this.generatorApiUrl}/api/analyze-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        this.logger.warn(`Script analysis returned ${response.status}`);
        return null;
      }

      return await response.json() as SegmentationResponse;
    } catch (error) {
      this.logger.warn('Failed to connect to generator API for script analysis', error);
      return null;
    }
  }

  async continue(sceneId: string, dto: ContinueSceneDto, userId: string) {
    const scene = await this.firestore.findById<Scene>('scenes', sceneId);

    if (!scene) {
      throw new NotFoundException('Scene not found');
    }

    // Get last segment order index - query without orderBy to avoid composite index requirement
    const segments = await this.firestore.findMany<Segment>('segments', {
      where: [{ field: 'sceneId', op: '==', value: sceneId }],
    });
    // Sort in-memory and get the last segment
    segments.sort((a, b) => (b.orderIndex || 0) - (a.orderIndex || 0));
    const lastOrderIndex = segments[0]?.orderIndex || 0;

    // Create new segment
    const segmentId = await this.firestore.create('segments', {
      sceneId,
      createdById: userId,
      orderIndex: lastOrderIndex + 1,
      prompt: dto.prompt,
      status: SegmentStatus.PENDING,
    });
    const segment = await this.firestore.findById<Segment>('segments', segmentId);

    // Create job
    const jobId = await this.firestore.create('jobs', {
      type: JobType.GENERATE_COMIC,
      segmentId,
      status: JobStatus.PENDING,
      priority: 0,
      progress: 0,
      attempts: 0,
      maxAttempts: 3,
    });
    const job = await this.firestore.findById<Job>('jobs', jobId);

    // Queue job
    await this.generationQueue.add('generate-comic', {
      jobId,
      sceneId,
      segmentId,
      comicStyle: 'manga',  // Default style
    });

    // Invalidate cache
    await this.redis.del(`scene:${sceneId}`);

    return { segment, job };
  }

  private getOrderBy(sort: string) {
    switch (sort) {
      case 'popular':
        return 'upvotes';
      case 'trending':
        return 'viewCount';
      case 'recent':
      default:
        return 'createdAt';
    }
  }
}
