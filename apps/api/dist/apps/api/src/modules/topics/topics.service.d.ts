import { FirestoreService } from '../../firestore/firestore.service';
import { RedisService } from '../../redis/redis.service';
export declare class TopicsService {
    private firestore;
    private redis;
    constructor(firestore: FirestoreService, redis: RedisService);
    list(category?: string): Promise<{}>;
    findById(id: string): Promise<{
        id: string;
        title: string;
        description: string | undefined;
        category: string;
        upvotes: number;
        sceneCount: number;
        createdBy: {
            id: string | undefined;
            username: string | undefined;
            avatarUrl: string | undefined;
        } | null;
        createdAt: Date;
    }>;
    getCategories(): Promise<{
        items: {
            name: string;
            topicCount: number;
        }[];
    }>;
    create(data: {
        title: string;
        description?: string;
        category?: string;
    }, userId: string): Promise<{
        id: string;
        title: string | undefined;
        description: string | undefined;
        category: string | undefined;
        createdAt: Date | undefined;
    }>;
}
