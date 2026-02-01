import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { SegmentStatus, JobType, JobStatus } from '@prisma/client';
import { SubmitSegmentDto, GenerateVideoDto } from './dto';

// Supported comic styles
type ComicStyle = 'manga' | 'manhwa' | 'western_comic' | 'webtoon';

@Injectable()
export class SegmentsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('generation') private generationQueue: Queue,
  ) {}

  async findById(id: string) {
    const segment = await this.prisma.segment.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, username: true, avatarUrl: true } },
        scene: { select: { id: true, title: true } },
      },
    });

    if (!segment) {
      throw new NotFoundException('Segment not found');
    }

    return segment;
  }

  async getForScene(sceneId: string) {
    return this.prisma.segment.findMany({
      where: { sceneId },
      orderBy: { orderIndex: 'asc' },
      include: {
        createdBy: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
  }

  /**
   * Submit a new segment prompt for a scene.
   * Creates the segment and optionally starts video generation.
   */
  async submitSegment(dto: SubmitSegmentDto, userId: string) {
    // Verify scene exists
    const scene = await this.prisma.scene.findUnique({
      where: { id: dto.sceneId },
      include: {
        segments: { orderBy: { orderIndex: 'desc' }, take: 1 },
      },
    });

    if (!scene) {
      throw new NotFoundException('Scene not found');
    }

    // Determine order index
    let orderIndex = dto.orderIndex;
    if (!orderIndex) {
      const lastSegment = scene.segments[0];
      orderIndex = lastSegment ? lastSegment.orderIndex + 1 : 1;
    }

    // Check for duplicate order index
    const existing = await this.prisma.segment.findUnique({
      where: {
        sceneId_orderIndex: {
          sceneId: dto.sceneId,
          orderIndex,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Segment with order index ${orderIndex} already exists in this scene`,
      );
    }

    // Create the segment
    const segment = await this.prisma.segment.create({
      data: {
        sceneId: dto.sceneId,
        prompt: dto.prompt,
        orderIndex,
        status: SegmentStatus.PENDING,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, username: true, avatarUrl: true } },
        scene: { select: { id: true, title: true } },
      },
    });

    // Update scene segment count
    await this.prisma.scene.update({
      where: { id: dto.sceneId },
      data: { segmentCount: { increment: 1 } },
    });

    return segment;
  }

  /**
   * Start comic generation for a segment.
   * Creates a job and queues it for processing.
   */
  async generateComic(dto: GenerateVideoDto, userId: string) {
    const segment = await this.prisma.segment.findUnique({
      where: { id: dto.segmentId },
      include: { scene: true },
    });

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
    const job = await this.prisma.job.create({
      data: {
        type: JobType.GENERATE_COMIC,
        status: JobStatus.PENDING,
        segmentId: dto.segmentId,
      },
    });

    // Update segment status to QUEUED (will become PROCESSING when worker picks it up)
    await this.prisma.segment.update({
      where: { id: dto.segmentId },
      data: { 
        status: SegmentStatus.QUEUED,
        comicStyle: comicStyle,
      },
    });

    // Queue the job for the Python worker
    await this.generationQueue.add(
      'generate-comic',
      {
        jobId: job.id,
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
      jobId: job.id,
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
      { segmentId: segment.id, ...(dto as any).comicStyle && { comicStyle: (dto as any).comicStyle } },
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
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        segment: {
          select: {
            id: true,
            status: true,
            imageUrl: true,
            thumbnailUrl: true,
            numPanels: true,
            comicStyle: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return {
      jobId: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      error: job.error,
      segment: job.segment,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }

  /**
   * Get previous segments in a scene (for context).
   */
  async getPreviousSegments(sceneId: string, beforeOrderIndex: number) {
    return this.prisma.segment.findMany({
      where: {
        sceneId,
        orderIndex: { lt: beforeOrderIndex },
      },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        orderIndex: true,
        prompt: true,
        expandedScript: true,
        imageUrl: true,
        status: true,
      },
    });
  }

  async updateStatus(
    id: string,
    status: SegmentStatus,
    data?: { imageUrl?: string; thumbnailUrl?: string; numPanels?: number },
  ) {
    return this.prisma.segment.update({
      where: { id },
      data: {
        status,
        ...data,
        ...(status === SegmentStatus.COMPLETED ? { completedAt: new Date() } : {}),
      },
    });
  }
}
