import { ScenesService } from './scenes.service';
import { SceneBibleService } from './scene-bible.service';
import { CreateSceneDto, ContinueSceneDto, ListScenesQueryDto } from './dto';
import { JwtPayload } from '@storyforge/shared';
export declare class ScenesController {
    private readonly scenesService;
    private readonly sceneBibleService;
    constructor(scenesService: ScenesService, sceneBibleService: SceneBibleService);
    listScenes(query: ListScenesQueryDto): Promise<{
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
            status: import("../../firestore").SceneStatus;
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
    getScene(id: string): Promise<{}>;
    getPlaylist(id: string): Promise<{
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
    getBible(id: string): Promise<import("./scene-bible.service").SceneBibleData>;
    createScene(dto: CreateSceneDto, user: JwtPayload): Promise<{
        scene: import("../../firestore").Scene | null;
        segment: import("../../firestore").Segment;
        job: import("../../firestore").Job;
        totalSegments: number;
        segments: import("../../firestore").Segment[];
    }>;
    continueScene(id: string, dto: ContinueSceneDto, user: JwtPayload): Promise<{
        segment: import("../../firestore").Segment | null;
        job: import("../../firestore").Job | null;
    }>;
}
