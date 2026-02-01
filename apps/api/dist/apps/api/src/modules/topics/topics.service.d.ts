import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
export declare class TopicsService {
    private prisma;
    private redis;
    constructor(prisma: PrismaService, redis: RedisService);
    list(category?: string): Promise<{}>;
    findById(id: string): Promise<{
        id: string;
        title: string;
        description: string | null;
        category: string;
        upvotes: number;
        sceneCount: number;
        createdBy: {
            username: string;
            id: string;
            avatarUrl: string | null;
        };
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
        title: string;
        description: string | null;
        category: string;
        createdAt: Date;
    }>;
}
