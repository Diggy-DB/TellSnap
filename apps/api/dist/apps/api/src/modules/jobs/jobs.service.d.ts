import { Queue } from 'bullmq';
import { FirestoreService, Job } from '../../firestore/firestore.service';
import { RedisService } from '../../redis/redis.service';
export declare class JobsService {
    private firestore;
    private redis;
    private generationQueue;
    constructor(firestore: FirestoreService, redis: RedisService, generationQueue: Queue);
    getStatus(id: string): Promise<{}>;
    updateProgress(id: string, progress: number, stage?: string): Promise<Job | null>;
    complete(id: string, result: Record<string, unknown>): Promise<Job | null>;
    fail(id: string, error: string): Promise<Job | null>;
    retry(id: string): Promise<{
        success: boolean;
    }>;
    cancel(id: string): Promise<{
        success: boolean;
    }>;
}
