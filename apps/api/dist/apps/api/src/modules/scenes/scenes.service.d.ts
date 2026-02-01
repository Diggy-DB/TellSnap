import { Queue } from 'bullmq';
import { FirestoreService, SceneStatus, Scene, Segment, Job } from '../../firestore/firestore.service';
import { RedisService } from '../../redis/redis.service';
import { CreateSceneDto, ContinueSceneDto, ListScenesQueryDto } from './dto';
export declare class ScenesService {
    private firestore;
    private redis;
    private generationQueue;
    private readonly logger;
    private readonly generatorApiUrl;
    constructor(firestore: FirestoreService, redis: RedisService, generationQueue: Queue);
    list(query: ListScenesQueryDto): Promise<{
        items: {
            topic: {
                id: string | undefined;
                title: string | undefined;
            } | null;
            createdBy: {
                id: string | undefined;
                username: string | undefined;
                avatarUrl: string | undefined;
            } | null;
            id: string;
            title: string;
            description?: string;
            topicId?: string;
            status: SceneStatus;
            segmentCount: number;
            totalDuration: number;
            createdById: string;
            createdAt: Date;
            updatedAt: Date;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            hasMore: boolean;
        };
    }>;
    findById(id: string): Promise<{}>;
    getPages(id: string): Promise<{
        sceneId: string;
        totalPages: number;
        pages: {
            id: string;
            orderIndex: number;
            imageUrl: string | undefined;
            thumbnailUrl: string | undefined;
            numPanels: number | undefined;
            comicStyle: string | undefined;
        }[];
    }>;
    create(dto: CreateSceneDto, userId: string): Promise<{
        scene: Scene | null;
        segment: Segment;
        job: Job;
        totalSegments: number;
        segments: Segment[];
    }>;
    private analyzeScript;
    continue(sceneId: string, dto: ContinueSceneDto, userId: string): Promise<{
        segment: Segment | null;
        job: Job | null;
    }>;
    private getOrderBy;
}
