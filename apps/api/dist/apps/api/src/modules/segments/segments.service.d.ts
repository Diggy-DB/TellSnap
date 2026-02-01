import { Queue } from 'bullmq';
import { FirestoreService, SegmentStatus, JobType, JobStatus, Segment } from '../../firestore/firestore.service';
import { SubmitSegmentDto, GenerateVideoDto } from './dto';
export declare class SegmentsService {
    private firestore;
    private generationQueue;
    constructor(firestore: FirestoreService, generationQueue: Queue);
    findById(id: string): Promise<{
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
        status: SegmentStatus;
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
        status: SegmentStatus;
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
    submitSegment(dto: SubmitSegmentDto, userId: string): Promise<{
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
        status?: SegmentStatus | undefined;
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
    generateComic(dto: GenerateVideoDto, userId: string): Promise<{
        jobId: string;
        segmentId: string;
        status: string;
        message: string;
    }>;
    submitAndGenerate(dto: SubmitSegmentDto, userId: string): Promise<{
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
            status?: SegmentStatus | undefined;
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
        type: JobType;
        status: JobStatus;
        progress: number;
        stage: string | undefined;
        error: string | undefined;
        segment: {
            id: string | undefined;
            status: SegmentStatus | undefined;
            imageUrl: string | undefined;
            thumbnailUrl: string | undefined;
            numPanels: number | undefined;
            comicStyle: string | undefined;
        } | null;
        createdAt: Date;
        startedAt: Date | undefined;
        completedAt: Date | undefined;
    }>;
    getPreviousSegments(sceneId: string, beforeOrderIndex: number): Promise<Segment[]>;
    updateStatus(id: string, status: SegmentStatus, data?: {
        imageUrl?: string;
        thumbnailUrl?: string;
        numPanels?: number;
    }): Promise<Segment | null>;
}
