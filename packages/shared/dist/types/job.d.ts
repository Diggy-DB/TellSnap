export declare enum JobType {
    GENERATE_SEGMENT = "generate_segment",
    COMPILE_SCENE = "compile_scene",
    GENERATE_THUMBNAIL = "generate_thumbnail"
}
export declare enum JobStatus {
    PENDING = "pending",
    QUEUED = "queued",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export interface Job {
    id: string;
    type: JobType;
    status: JobStatus;
    priority: number;
    payload: Record<string, unknown>;
    result: Record<string, unknown> | null;
    error: string | null;
    attempts: number;
    maxAttempts: number;
    progress: number;
    stage: string | null;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
}
export interface JobProgress {
    jobId: string;
    status: JobStatus;
    progress: number;
    stage: string | null;
    message: string | null;
}
export interface JobResult {
    jobId: string;
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
}
