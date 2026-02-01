import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { FirestoreService, JobStatus, Job, Segment } from '../../firestore/firestore.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class JobsService {
  constructor(
    private firestore: FirestoreService,
    private redis: RedisService,
    @InjectQueue('generation') private generationQueue: Queue,
  ) {}

  async getStatus(id: string) {
    // Try cache first for active jobs
    const cached = await this.redis.get(`job:${id}`);
    if (cached) return cached;

    const job = await this.firestore.findById<Job>('jobs', id);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Get segment info if exists
    let segment: { id: string; sceneId: string } | null = null;
    if (job.segmentId) {
      const seg = await this.firestore.findById<Segment>('segments', job.segmentId);
      if (seg) {
        segment = { id: seg.id, sceneId: seg.sceneId };
      }
    }

    const status = {
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      error: job.error,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      segment,
    };

    // Cache active jobs for 30 seconds
    const isActive = job.status === JobStatus.PENDING || 
                     job.status === JobStatus.QUEUED || 
                     job.status === JobStatus.PROCESSING;
    if (isActive) {
      await this.redis.set(`job:${id}`, status, 30);
    }

    return status;
  }

  async updateProgress(id: string, progress: number, stage?: string) {
    await this.firestore.update<Job>('jobs', id, {
      progress,
      stage,
      status: JobStatus.PROCESSING,
      startedAt: new Date(),
    });

    const job = await this.firestore.findById<Job>('jobs', id);

    // Publish progress update
    await this.redis.publish('job:progress', {
      jobId: id,
      progress,
      stage,
      status: JobStatus.PROCESSING,
    });

    // Update cache
    await this.redis.set(`job:${id}`, job, 30);

    return job;
  }

  async complete(id: string, result: Record<string, unknown>) {
    await this.firestore.update<Job>('jobs', id, {
      status: JobStatus.COMPLETED,
      progress: 100,
      result,
      completedAt: new Date(),
    });

    const job = await this.firestore.findById<Job>('jobs', id);

    // Publish completion
    await this.redis.publish('job:complete', {
      jobId: id,
      success: true,
      result,
    });

    // Remove from cache
    await this.redis.del(`job:${id}`);

    return job;
  }

  async fail(id: string, error: string) {
    // First increment attempts
    await this.firestore.increment('jobs', id, 'attempts', 1);

    await this.firestore.update<Job>('jobs', id, {
      status: JobStatus.FAILED,
      error,
      completedAt: new Date(),
    });

    const job = await this.firestore.findById<Job>('jobs', id);

    // Publish failure
    await this.redis.publish('job:complete', {
      jobId: id,
      success: false,
      error,
    });

    // Remove from cache
    await this.redis.del(`job:${id}`);

    return job;
  }

  async retry(id: string) {
    const job = await this.firestore.findById<Job>('jobs', id);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status !== JobStatus.FAILED) {
      throw new BadRequestException('Only failed jobs can be retried');
    }

    if (job.attempts >= job.maxAttempts) {
      throw new BadRequestException('Maximum retry attempts exceeded');
    }

    // Get segment info
    let sceneId: string | undefined;
    if (job.segmentId) {
      const segment = await this.firestore.findById<Segment>('segments', job.segmentId);
      sceneId = segment?.sceneId;
    }

    // Reset job
    await this.firestore.update<Job>('jobs', id, {
      status: JobStatus.PENDING,
      progress: 0,
      stage: undefined,
      error: undefined,
      startedAt: undefined,
      completedAt: undefined,
    });

    // Re-queue
    await this.generationQueue.add('generate', {
      jobId: job.id,
      segmentId: job.segmentId,
      sceneId,
    });

    return { success: true };
  }

  async cancel(id: string) {
    const job = await this.firestore.findById<Job>('jobs', id);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const isCancelable = job.status === JobStatus.PENDING || job.status === JobStatus.QUEUED;
    if (!isCancelable) {
      throw new BadRequestException('Only pending jobs can be cancelled');
    }

    await this.firestore.update<Job>('jobs', id, {
      status: JobStatus.CANCELLED,
      completedAt: new Date(),
    });

    return { success: true };
  }
}
