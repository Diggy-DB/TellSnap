import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { FirestoreService, SegmentStatus, JobType, JobStatus, Segment, Scene, Job, User } from '../../firestore/firestore.service';
import { SubmitSegmentDto, GenerateVideoDto } from './dto';

// Supported comic styles
type ComicStyle = 'manga' | 'manhwa' | 'western_comic' | 'webtoon';

@Injectable()
export class SegmentsService {
  constructor(
    private firestore: FirestoreService,
    @InjectQueue('generation') private generationQueue: Queue,
  ) {}

  async findById(id: string) {
    const segment = await this.firestore.findById<Segment>('segments', id);

    if (!segment) {
      throw new NotFoundException('Segment not found');
    }

    // Fetch related data
    let createdBy: Partial<User> | null = null;
    let scene: Partial<Scene> | null = null;

    if (segment.createdById) {
      createdBy = await this.firestore.findById<User>('users', segment.createdById);
    }
    if (segment.sceneId) {
      scene = await this.firestore.findById<Scene>('scenes', segment.sceneId);
    }

    return {
      ...segment,
      createdBy: createdBy
        ? { id: createdBy.id, username: createdBy.username, avatarUrl: createdBy.avatarUrl }
        : null,
      scene: scene ? { id: scene.id, title: scene.title } : null,
    };
  }

  async getForScene(sceneId: string) {
    const segments = await this.firestore.findMany<Segment>('segments', {
      where: [{ field: 'sceneId', op: '==', value: sceneId }],
    });
    // Sort in-memory to avoid composite index requirement
    segments.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    return Promise.all(
      segments.map(async (segment) => {
        let createdBy: Partial<User> | null = null;
        if (segment.createdById) {
          createdBy = await this.firestore.findById<User>('users', segment.createdById);
        }
        return {
          ...segment,
          createdBy: createdBy
            ? { id: createdBy.id, username: createdBy.username, avatarUrl: createdBy.avatarUrl }
            : null,
        };
      }),
    );
  }

  /**
   * Submit a new segment prompt for a scene.
   * Creates the segment and optionally starts video generation.
   */
  async submitSegment(dto: SubmitSegmentDto, userId: string) {
    // Verify scene exists
    const scene = await this.firestore.findById<Scene>('scenes', dto.sceneId);

    if (!scene) {
      throw new NotFoundException('Scene not found');
    }

    // Get last segment to determine order index
    const segments = await this.firestore.findMany<Segment>('segments', {
      where: [{ field: 'sceneId', op: '==', value: dto.sceneId }],
    });
    // Sort in-memory to get last segment
    segments.sort((a, b) => (b.orderIndex || 0) - (a.orderIndex || 0));

    // Determine order index
    let orderIndex = dto.orderIndex;
    if (!orderIndex) {
      const lastSegment = segments[0];
      orderIndex = lastSegment ? lastSegment.orderIndex + 1 : 1;
    }

    // Check for duplicate order index
    const existing = await this.firestore.findMany<Segment>('segments', {
      where: [
        { field: 'sceneId', op: '==', value: dto.sceneId },
        { field: 'orderIndex', op: '==', value: orderIndex },
      ],
      limit: 1,
    });

    if (existing.length > 0) {
      throw new BadRequestException(
        `Segment with order index ${orderIndex} already exists in this scene`,
      );
    }

    // Create the segment
    const segmentId = await this.firestore.create('segments', {
      sceneId: dto.sceneId,
      prompt: dto.prompt,
      orderIndex,
      status: SegmentStatus.PENDING,
      createdById: userId,
    });

    const segment = await this.firestore.findById<Segment>('segments', segmentId);

    // Update scene segment count
    await this.firestore.increment('scenes', dto.sceneId, 'segmentCount', 1);

    // Fetch related data for response
    let createdBy: Partial<User> | null = null;
    if (userId) {
      createdBy = await this.firestore.findById<User>('users', userId);
    }

    return {
      ...segment,
      createdBy: createdBy
        ? { id: createdBy.id, username: createdBy.username, avatarUrl: createdBy.avatarUrl }
        : null,
      scene: { id: scene.id, title: scene.title },
    };
  }

  /**
   * Start comic generation for a segment.
   * Creates a job and queues it for processing.
   */
  async generateComic(dto: GenerateVideoDto, userId: string) {
    const segment = await this.firestore.findById<Segment>('segments', dto.segmentId);

    if (!segment) {
      throw new NotFoundException('Segment not found');
    }

    // Check if already generating
    if (segment.status === SegmentStatus.PROCESSING || segment.status === SegmentStatus.QUEUED) {
      throw new BadRequestException('Comic generation already in progress');
    }

    // Determine comic style (default to manga)
    const comicStyle: ComicStyle = (dto as any).comicStyle || 'manga';

    // Create a job record
    const jobId = await this.firestore.create('jobs', {
      type: JobType.GENERATE_COMIC,
      status: JobStatus.PENDING,
      segmentId: dto.segmentId,
      priority: 0,
      progress: 0,
      attempts: 0,
      maxAttempts: 3,
    });

    // Update segment status to QUEUED
    await this.firestore.update<Segment>('segments', dto.segmentId, {
      status: SegmentStatus.QUEUED,
      comicStyle: comicStyle,
    });

    // Queue the job for the Python worker
    await this.generationQueue.add(
      'generate-comic',
      {
        jobId,
        sceneId: segment.sceneId,
        segmentId: dto.segmentId,
        comicStyle: comicStyle,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 30000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );

    return {
      jobId,
      segmentId: dto.segmentId,
      status: 'queued',
      message: 'Comic generation queued successfully',
    };
  }

  /**
   * Submit a segment AND start comic generation immediately.
   * Combines submitSegment and generateComic.
   */
  async submitAndGenerate(dto: SubmitSegmentDto, userId: string) {
    // Create segment
    const segment = await this.submitSegment(dto, userId);

    // Start generation
    const jobResult = await this.generateComic(
      { segmentId: segment!.id, ...(dto as any).comicStyle && { comicStyle: (dto as any).comicStyle } },
      userId,
    );

    return {
      segment,
      job: jobResult,
    };
  }

  /**
   * Get the status of a comic generation job.
   */
  async getJobStatus(jobId: string) {
    const job = await this.firestore.findById<Job>('jobs', jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    let segment: Partial<Segment> | null = null;
    if (job.segmentId) {
      segment = await this.firestore.findById<Segment>('segments', job.segmentId);
    }

    return {
      jobId: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      error: job.error,
      segment: segment
        ? {
            id: segment.id,
            status: segment.status,
            imageUrl: segment.imageUrl,
            thumbnailUrl: segment.thumbnailUrl,
            numPanels: segment.numPanels,
            comicStyle: segment.comicStyle,
          }
        : null,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }

  /**
   * Get previous segments in a scene (for context).
   */
  async getPreviousSegments(sceneId: string, beforeOrderIndex: number) {
    const segments = await this.firestore.findMany<Segment>('segments', {
      where: [{ field: 'sceneId', op: '==', value: sceneId }],
    });
    // Filter and sort in-memory to avoid composite index requirement
    return segments
      .filter(s => (s.orderIndex || 0) < beforeOrderIndex)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }

  async updateStatus(
    id: string,
    status: SegmentStatus,
    data?: { imageUrl?: string; thumbnailUrl?: string; numPanels?: number },
  ) {
    const updates: Partial<Segment> = {
      status,
      ...data,
    };

    if (status === SegmentStatus.COMPLETED) {
      updates.completedAt = new Date();
    }

    await this.firestore.update<Segment>('segments', id, updates);
    return this.firestore.findById<Segment>('segments', id);
  }
}
