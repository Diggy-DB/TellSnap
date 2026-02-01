import { SegmentsService } from './segments.service';
import { SubmitSegmentDto, GenerateVideoDto } from './dto';
export declare class SegmentsController {
    private readonly segmentsService;
    constructor(segmentsService: SegmentsService);
    getById(id: string): Promise<{
        scene: {
            title: string;
            id: string;
        };
        createdBy: {
            username: string;
            id: string;
            avatarUrl: string | null;
        };
    } & {
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
    }>;
    getForScene(sceneId: string): Promise<({
        createdBy: {
            username: string;
            id: string;
            avatarUrl: string | null;
        };
    } & {
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
    })[]>;
    submitSegment(dto: SubmitSegmentDto, req: any): Promise<{
        scene: {
            title: string;
            id: string;
        };
        createdBy: {
            username: string;
            id: string;
            avatarUrl: string | null;
        };
    } & {
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
    }>;
    generateComic(dto: GenerateVideoDto, req: any): Promise<{
        jobId: string;
        segmentId: string;
        status: string;
        message: string;
    }>;
    submitAndGenerate(dto: SubmitSegmentDto, req: any): Promise<{
        segment: {
            scene: {
                title: string;
                id: string;
            };
            createdBy: {
                username: string;
                id: string;
                avatarUrl: string | null;
            };
        } & {
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
            jobId: string;
            segmentId: string;
            status: string;
            message: string;
        };
    }>;
    getJobStatus(jobId: string): Promise<{
        jobId: string;
        type: import("@prisma/client").$Enums.JobType;
        status: import("@prisma/client").$Enums.JobStatus;
        progress: number;
        stage: string | null;
        error: string | null;
        segment: {
            id: string;
            status: import("@prisma/client").$Enums.SegmentStatus;
            thumbnailUrl: string | null;
            imageUrl: string | null;
            numPanels: number | null;
            comicStyle: string | null;
        } | null;
        createdAt: Date;
        startedAt: Date | null;
        completedAt: Date | null;
    }>;
}
