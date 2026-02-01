import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CreateSceneDto, ContinueSceneDto, ListScenesQueryDto } from './dto';
import { SceneStatus, SegmentStatus, JobType, JobStatus } from '@prisma/client';

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
    private prisma: PrismaService,
    private redis: RedisService,
    @InjectQueue('generation') private generationQueue: Queue,
  ) {}

  async list(query: ListScenesQueryDto) {
    const { page = 1, limit = 20, topicId, sort = 'recent' } = query;
    const skip = (page - 1) * limit;

    const where: any = { status: SceneStatus.PUBLISHED };
    if (topicId) where.topicId = topicId;

    const orderBy = this.getOrderBy(sort);

    const [items, total] = await Promise.all([
      this.prisma.scene.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          topic: { select: { id: true, title: true } },
          createdBy: { select: { id: true, username: true, avatarUrl: true } },
        },
      }),
      this.prisma.scene.count({ where }),
    ]);

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

    const scene = await this.prisma.scene.findUnique({
      where: { id },
      include: {
        topic: { select: { id: true, title: true } },
        createdBy: { select: { id: true, username: true, avatarUrl: true } },
        segments: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            orderIndex: true,
            prompt: true,
            thumbnailUrl: true,
            imageUrl: true,
            numPanels: true,
            comicStyle: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!scene) {
      throw new NotFoundException('Scene not found');
    }

    // Cache for 1 minute
    await this.redis.set(`scene:${id}`, scene, 60);

    return scene;
  }

  async getPages(id: string) {
    const scene = await this.prisma.scene.findUnique({
      where: { id },
      include: {
        segments: {
          where: { status: SegmentStatus.COMPLETED },
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            orderIndex: true,
            imageUrl: true,
            thumbnailUrl: true,
            numPanels: true,
            comicStyle: true,
          },
        },
      },
    });

    if (!scene) {
      throw new NotFoundException('Scene not found');
    }

    return {
      sceneId: scene.id,
      totalPages: scene.segments.length,
      pages: scene.segments,
    };
  }

  async create(dto: CreateSceneDto, userId: string) {
    // Create scene
    const scene = await this.prisma.scene.create({
      data: {
        title: dto.title,
        description: dto.description,
        topicId: dto.topicId,
        createdById: userId,
        status: SceneStatus.DRAFT,
      },
    });

    // Create initial Scene Bible
    await this.prisma.sceneBible.create({
      data: { sceneId: scene.id },
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
    const segments = [];
    const jobs = [];

    for (const segInfo of segmentsToCreate) {
      const segment = await this.prisma.segment.create({
        data: {
          sceneId: scene.id,
          createdById: userId,
          orderIndex: segInfo.order_index,
          prompt: segInfo.prompt,
          status: SegmentStatus.PENDING,
        },
      });
      segments.push(segment);

      const job = await this.prisma.job.create({
        data: {
          type: JobType.GENERATE_COMIC,
          segmentId: segment.id,
          status: JobStatus.PENDING,
        },
      });
      jobs.push(job);

      // Queue job - add delay for subsequent segments to ensure ordering
      const delay = (segInfo.order_index - 1) * 1000; // 1 second delay between segments
      await this.generationQueue.add('generate-comic', {
        jobId: job.id,
        sceneId: scene.id,
        segmentId: segment.id,
        comicStyle: 'manga',  // Default style
      }, { delay });
      
      this.logger.log(`Queued comic page ${segInfo.order_index}/${segmentsToCreate.length}`);
    }

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
    const scene = await this.prisma.scene.findUnique({
      where: { id: sceneId },
      include: { segments: { orderBy: { orderIndex: 'desc' }, take: 1 } },
    });

    if (!scene) {
      throw new NotFoundException('Scene not found');
    }

    const lastOrderIndex = scene.segments[0]?.orderIndex || 0;

    // Create new segment
    const segment = await this.prisma.segment.create({
      data: {
        sceneId,
        createdById: userId,
        orderIndex: lastOrderIndex + 1,
        prompt: dto.prompt,
        status: SegmentStatus.PENDING,
      },
    });

    // Create job
    const job = await this.prisma.job.create({
      data: {
        type: JobType.GENERATE_COMIC,
        segmentId: segment.id,
        status: JobStatus.PENDING,
      },
    });

    // Queue job
    await this.generationQueue.add('generate-comic', {
      jobId: job.id,
      sceneId,
      segmentId: segment.id,
      comicStyle: 'manga',  // Default style
    });

    // Invalidate cache
    await this.redis.del(`scene:${sceneId}`);

    return { segment, job };
  }

  private getOrderBy(sort: string) {
    switch (sort) {
      case 'popular':
        return { upvotes: 'desc' as const };
      case 'trending':
        return [{ viewCount: 'desc' as const }, { createdAt: 'desc' as const }];
      case 'recent':
      default:
        return { createdAt: 'desc' as const };
    }
  }
}
