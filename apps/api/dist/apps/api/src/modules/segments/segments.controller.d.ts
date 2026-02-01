import { SegmentsService } from './segments.service';
import { SubmitSegmentDto, GenerateVideoDto } from './dto';
export declare class SegmentsController {
    private readonly segmentsService;
    constructor(segmentsService: SegmentsService);
    getById(id: string): Promise<{
        createdBy: {
            id: string | undefined;
            username: string | undefined;
            avatarUrl: string | undefined;
        } | null;
        scene: {
            id: string | undefined;
            title: string | undefined;
        } | null;
        id: string;
        sceneId: string;
        orderIndex: number;
        prompt: string;
        expandedScript?: string;
        status: import("../../firestore").SegmentStatus;
        imageUrl?: string;
        thumbnailUrl?: string;
        numPanels?: number;
        comicStyle?: string;
        duration?: number;
        continuityHash?: string;
        createdById: string;
        createdAt: Date;
        updatedAt: Date;
        completedAt?: Date;
    }>;
    getForScene(sceneId: string): Promise<{
        createdBy: {
            id: string | undefined;
            username: string | undefined;
            avatarUrl: string | undefined;
        } | null;
        id: string;
        sceneId: string;
        orderIndex: number;
        prompt: string;
        expandedScript?: string;
        status: import("../../firestore").SegmentStatus;
        imageUrl?: string;
        thumbnailUrl?: string;
        numPanels?: number;
        comicStyle?: string;
        duration?: number;
        continuityHash?: string;
        createdById: string;
        createdAt: Date;
        updatedAt: Date;
        completedAt?: Date;
    }[]>;
    submitSegment(dto: SubmitSegmentDto, req: any): Promise<{
        createdBy: {
            id: string | undefined;
            username: string | undefined;
            avatarUrl: string | undefined;
        } | null;
        scene: {
            id: string;
            title: string;
        };
        id?: string | undefined;
        sceneId?: string | undefined;
        orderIndex?: number | undefined;
        prompt?: string | undefined;
        expandedScript?: string;
        status?: import("../../firestore").SegmentStatus | undefined;
        imageUrl?: string;
        thumbnailUrl?: string;
        numPanels?: number;
        comicStyle?: string;
        duration?: number;
        continuityHash?: string;
        createdById?: string | undefined;
        createdAt?: Date | undefined;
        updatedAt?: Date | undefined;
        completedAt?: Date;
    }>;
    generateComic(dto: GenerateVideoDto, req: any): Promise<{
        jobId: string;
        segmentId: string;
        status: string;
        message: string;
    }>;
    submitAndGenerate(dto: SubmitSegmentDto, req: any): Promise<{
        segment: {
            createdBy: {
                id: string | undefined;
                username: string | undefined;
                avatarUrl: string | undefined;
            } | null;
            scene: {
                id: string;
                title: string;
            };
            id?: string | undefined;
            sceneId?: string | undefined;
            orderIndex?: number | undefined;
            prompt?: string | undefined;
            expandedScript?: string;
            status?: import("../../firestore").SegmentStatus | undefined;
            imageUrl?: string;
            thumbnailUrl?: string;
            numPanels?: number;
            comicStyle?: string;
            duration?: number;
            continuityHash?: string;
            createdById?: string | undefined;
            createdAt?: Date | undefined;
            updatedAt?: Date | undefined;
            completedAt?: Date;
        };
        job: {
            jobId: string;
            segmentId: string;
            status: string;
            message: string;
        };
    }>;
    getJobStatus(jobId: string): Promise<{
        jobId: string;
        type: import("../../firestore").JobType;
        status: import("../../firestore").JobStatus;
        progress: number;
        stage: string | undefined;
        error: string | undefined;
        segment: {
            id: string | undefined;
            status: import("../../firestore").SegmentStatus | undefined;
            imageUrl: string | undefined;
            thumbnailUrl: string | undefined;
            numPanels: number | undefined;
            comicStyle: string | undefined;
        } | null;
        createdAt: Date;
        startedAt: Date | undefined;
        completedAt: Date | undefined;
    }>;
}
