import { TopicsService } from './topics.service';
export declare class TopicsController {
    private readonly topicsService;
    constructor(topicsService: TopicsService);
    list(category?: string): Promise<{}>;
    create(body: {
        title: string;
        description?: string;
        category?: string;
    }, user: {
        sub: string;
    }): Promise<{
        id: string;
        title: string | undefined;
        description: string | undefined;
        category: string | undefined;
        createdAt: Date | undefined;
    }>;
    getCategories(): Promise<{
        items: {
            name: string;
            topicCount: number;
        }[];
    }>;
    getById(id: string): Promise<{
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
}
