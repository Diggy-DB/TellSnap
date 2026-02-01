import { ScenesService } from './scenes.service';
import { SceneBibleService } from './scene-bible.service';
import { CreateSceneDto, ContinueSceneDto, ListScenesQueryDto } from './dto';
import { JwtPayload } from '@storyforge/shared';
export declare class ScenesController {
    private readonly scenesService;
    private readonly sceneBibleService;
    constructor(scenesService: ScenesService, sceneBibleService: SceneBibleService);
    listScenes(query: ListScenesQueryDto): Promise<{
        items: ({
            topic: {
                title: string;
                id: string;
            } | null;
            createdBy: {
                username: string;
                id: string;
                avatarUrl: string | null;
            };
        } & {
            description: string | null;
            title: string;
            id: string;
            status: import("@prisma/client").$Enums.SceneStatus;
            createdAt: Date;
            updatedAt: Date;
            topicId: string | null;
            upvotes: number;
            createdById: string;
            viewCount: number;
            thumbnailUrl: string | null;
            segmentCount: number;
            totalDuration: number;
            publishedAt: Date | null;
        })[];
        meta: {
            page: number;
            limit: number;
            total: number;
            hasMore: boolean;
        };
    }>;
    getScene(id: string): Promise<{}>;
    getPlaylist(id: string): Promise<{
        sceneId: string;
        totalPages: number;
        pages: {
            id: string;
            thumbnailUrl: string | null;
            orderIndex: number;
            imageUrl: string | null;
            numPanels: number | null;
            comicStyle: string | null;
        }[];
    }>;
    getPages(id: string): Promise<{
        sceneId: string;
        totalPages: number;
        pages: {
            id: string;
            thumbnailUrl: string | null;
            orderIndex: number;
            imageUrl: string | null;
            numPanels: number | null;
            comicStyle: string | null;
        }[];
    }>;
    getBible(id: string): Promise<import("./scene-bible.service").SceneBibleData>;
    createScene(dto: CreateSceneDto, user: JwtPayload): Promise<{
        scene: {
            description: string | null;
            title: string;
            id: string;
            status: import("@prisma/client").$Enums.SceneStatus;
            createdAt: Date;
            updatedAt: Date;
            topicId: string | null;
            upvotes: number;
            createdById: string;
            viewCount: number;
            thumbnailUrl: string | null;
            segmentCount: number;
            totalDuration: number;
            publishedAt: Date | null;
        };
        segment: {
            id: string;
            status: import("@prisma/client").$Enums.SegmentStatus;
            createdAt: Date;
            updatedAt: Date;
            prompt: string;
            createdById: string;
            thumbnailUrl: string | null;
            orderIndex: number;
            sceneId: string;
            expandedScript: string | null;
            imageUrl: string | null;
            numPanels: number | null;
            comicStyle: string | null;
            videoUrl: string | null;
            hlsUrl: string | null;
            duration: number | null;
            continuityHash: string | null;
            completedAt: Date | null;
        };
        job: {
            error: string | null;
            type: import("@prisma/client").$Enums.JobType;
            id: string;
            status: import("@prisma/client").$Enums.JobStatus;
            createdAt: Date;
            updatedAt: Date;
            result: import("@prisma/client/runtime/library").JsonValue | null;
            completedAt: Date | null;
            priority: number;
            progress: number;
            stage: string | null;
            attempts: number;
            maxAttempts: number;
            startedAt: Date | null;
            segmentId: string | null;
        };
        totalSegments: number;
        segments: {
            id: string;
            status: import("@prisma/client").$Enums.SegmentStatus;
            createdAt: Date;
            updatedAt: Date;
            prompt: string;
            createdById: string;
            thumbnailUrl: string | null;
            orderIndex: number;
            sceneId: string;
            expandedScript: string | null;
            imageUrl: string | null;
            numPanels: number | null;
            comicStyle: string | null;
            videoUrl: string | null;
            hlsUrl: string | null;
            duration: number | null;
            continuityHash: string | null;
            completedAt: Date | null;
        }[];
    }>;
    continueScene(id: string, dto: ContinueSceneDto, user: JwtPayload): Promise<{
        segment: {
            id: string;
            status: import("@prisma/client").$Enums.SegmentStatus;
            createdAt: Date;
            updatedAt: Date;
            prompt: string;
            createdById: string;
            thumbnailUrl: string | null;
            orderIndex: number;
            sceneId: string;
            expandedScript: string | null;
            imageUrl: string | null;
            numPanels: number | null;
            comicStyle: string | null;
            videoUrl: string | null;
            hlsUrl: string | null;
            duration: number | null;
            continuityHash: string | null;
            completedAt: Date | null;
        };
        job: {
            error: string | null;
            type: import("@prisma/client").$Enums.JobType;
            id: string;
            status: import("@prisma/client").$Enums.JobStatus;
            createdAt: Date;
            updatedAt: Date;
            result: import("@prisma/client/runtime/library").JsonValue | null;
            completedAt: Date | null;
            priority: number;
            progress: number;
            stage: string | null;
            attempts: number;
            maxAttempts: number;
            startedAt: Date | null;
            segmentId: string | null;
        };
    }>;
}
