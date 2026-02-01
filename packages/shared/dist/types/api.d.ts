export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
    meta?: ApiMeta;
}
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}
export interface ApiMeta {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
}
export interface PaginationParams {
    page?: number;
    limit?: number;
    cursor?: string;
}
export interface PaginatedResponse<T> {
    items: T[];
    meta: {
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
        nextCursor?: string;
    };
}
export interface LoginRequest {
    email: string;
    password: string;
}
export interface SignupRequest {
    email: string;
    password: string;
    username: string;
}
export interface AuthResponse {
    user: {
        id: string;
        email: string;
        username: string;
        role: string;
    };
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}
export interface RefreshTokenRequest {
    refreshToken: string;
}
export interface WsJobProgress {
    event: 'job:progress';
    data: {
        jobId: string;
        status: string;
        progress: number;
        stage: string | null;
        message: string | null;
    };
}
export interface WsJobComplete {
    event: 'job:complete';
    data: {
        jobId: string;
        success: boolean;
        segmentId?: string;
        error?: string;
    };
}
export type WsEvent = WsJobProgress | WsJobComplete;
