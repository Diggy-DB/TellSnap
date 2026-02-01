/**
 * StoryForge - Shared Types
 * Core type definitions used across all services
 */
export declare enum JobStatus {
    QUEUED = "queued",
    SCRIPT_EXPANDING = "script_expanding",
    SCRIPT_READY = "script_ready",
    CONTINUITY_CHECKING = "continuity_checking",
    CONTINUITY_CHECKED = "continuity_checked",
    GENERATING_PREVIEW = "generating_preview",
    PREVIEW_READY = "preview_ready",
    GENERATING_FINAL = "generating_final",
    FINAL_READY = "final_ready",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export declare enum ModerationStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    FLAGGED = "flagged"
}
export declare enum ContentType {
    TOPIC = "topic",
    IDEA = "idea",
    SCENE = "scene",
    SEGMENT = "segment",
    SCRIPT = "script"
}
export declare enum UserRole {
    USER = "user",
    MODERATOR = "moderator",
    ADMIN = "admin"
}
export interface BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface User extends BaseEntity {
    email: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    role: UserRole;
    emailVerified: boolean;
    lastLoginAt?: Date;
}
export interface JwtPayload {
    sub: string;
    email: string;
    role: UserRole;
    iat: number;
    exp: number;
    jti: string;
}
export interface Topic extends BaseEntity {
    name: string;
    slug: string;
    description?: string;
    iconUrl?: string;
    sortOrder: number;
    isActive: boolean;
}
export interface Category extends BaseEntity {
    topicId: string;
    name: string;
    slug: string;
    description?: string;
    sortOrder: number;
    isActive: boolean;
}
export interface UserTopic extends BaseEntity {
    userId: string;
    name: string;
    slug: string;
    description?: string;
    moderationStatus: ModerationStatus;
    moderatedBy?: string;
    moderatedAt?: Date;
}
export interface Idea extends BaseEntity {
    userId: string;
    topicId?: string;
    userTopicId?: string;
    categoryId?: string;
    title: string;
    description: string;
    tags: string[];
    moderationStatus: ModerationStatus;
    upvoteCount: number;
    sceneCount: number;
}
export interface Scene extends BaseEntity {
    ideaId: string;
    creatorId: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    segmentCount: number;
    totalDurationMs: number;
    viewCount: number;
    likeCount: number;
    bibleVersion: number;
    isPublic: boolean;
    isFeatured: boolean;
    lastSegmentAt?: Date;
}
export interface Segment extends BaseEntity {
    sceneId: string;
    userId: string;
    sequenceNumber: number;
    inputScript: string;
    expandedScript: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    hlsManifestUrl?: string;
    durationMs: number;
    bibleVersionUsed: number;
    status: JobStatus;
    metadata: SegmentMetadata;
}
export interface SegmentMetadata {
    charactersUsed: string[];
    locationsUsed: string[];
    timelinePosition?: string;
    continuityNotes?: string[];
    generationParams?: Record<string, unknown>;
}
export interface SceneBible extends BaseEntity {
    sceneId: string;
    version: number;
    data: SceneBibleData;
    updatedBySegmentId?: string;
}
export interface SceneBibleData {
    title: string;
    genre: string;
    tone: string;
    setting: SettingInfo;
    characters: Character[];
    locations: Location[];
    timeline: TimelineEvent[];
    plotPoints: PlotPoint[];
    rules: StoryRule[];
    styleGuide: StyleGuide;
}
export interface Character {
    id: string;
    canonicalName: string;
    aliases: string[];
    description: string;
    physicalTraits: PhysicalTraits;
    personality: string[];
    backstory?: string;
    relationships: Relationship[];
    voiceAnchorId?: string;
    referenceImageIds: string[];
    firstAppearedSegment: number;
    lastAppearedSegment: number;
    isAlive: boolean;
    notes?: string;
}
export interface PhysicalTraits {
    age?: string;
    gender?: string;
    height?: string;
    build?: string;
    hairColor?: string;
    eyeColor?: string;
    distinguishingFeatures?: string[];
}
export interface Relationship {
    characterId: string;
    type: string;
    description?: string;
}
export interface Location {
    id: string;
    name: string;
    aliases: string[];
    description: string;
    type: string;
    parentLocationId?: string;
    referenceImageIds: string[];
    firstAppearedSegment: number;
}
export interface TimelineEvent {
    id: string;
    segmentNumber: number;
    description: string;
    involvedCharacterIds: string[];
    involvedLocationIds: string[];
    timestamp?: string;
}
export interface PlotPoint {
    id: string;
    description: string;
    segmentIntroduced: number;
    isResolved: boolean;
    resolvedInSegment?: number;
}
export interface StoryRule {
    id: string;
    category: 'world' | 'character' | 'plot' | 'style';
    rule: string;
    reason?: string;
}
export interface StyleGuide {
    visualStyle?: string;
    colorPalette?: string[];
    cameraStyle?: string;
    pacing?: string;
    musicMood?: string;
}
export interface SettingInfo {
    timePeriod: string;
    worldType: string;
    primaryLocation?: string;
    atmosphere?: string;
}
export interface SceneSummary extends BaseEntity {
    sceneId: string;
    startSegment: number;
    endSegment: number;
    summary: string;
    keyEvents: string[];
    characterDevelopments: Record<string, string>;
    embedding?: number[];
}
export interface Job extends BaseEntity {
    sceneId: string;
    segmentId?: string;
    userId: string;
    type: JobType;
    status: JobStatus;
    priority: number;
    attempts: number;
    maxAttempts: number;
    lastError?: string;
    progress: number;
    startedAt?: Date;
    completedAt?: Date;
    idempotencyKey: string;
    metadata: JobMetadata;
}
export declare enum JobType {
    SCRIPT_EXPANSION = "script_expansion",
    CONTINUITY_CHECK = "continuity_check",
    VIDEO_PREVIEW = "video_preview",
    VIDEO_FINAL = "video_final",
    THUMBNAIL_GENERATION = "thumbnail_generation",
    HLS_PACKAGING = "hls_packaging",
    SUMMARY_UPDATE = "summary_update"
}
export interface JobMetadata {
    inputScript?: string;
    expandedScript?: string;
    continuityIssues?: ContinuityIssue[];
    videoParams?: VideoGenerationParams;
    outputUrls?: OutputUrls;
}
export interface VideoGenerationParams {
    resolution: '720p' | '1080p' | '4k';
    aspectRatio: '16:9' | '9:16' | '1:1';
    fps: number;
    style?: string;
    characterRefs?: Record<string, string>;
    voiceRefs?: Record<string, string>;
}
export interface OutputUrls {
    previewUrl?: string;
    finalUrl?: string;
    hlsManifest?: string;
    thumbnailUrl?: string;
}
export interface ContinuityIssue {
    id: string;
    severity: 'error' | 'warning' | 'info';
    category: 'character' | 'location' | 'timeline' | 'plot' | 'style';
    description: string;
    suggestion?: string;
    autoFixable: boolean;
    autoFix?: AutoFix;
}
export interface AutoFix {
    type: 'replace' | 'insert' | 'remove';
    target: string;
    replacement?: string;
    reason: string;
}
export interface ContinuityValidationResult {
    isValid: boolean;
    issues: ContinuityIssue[];
    appliedFixes: AutoFix[];
    correctedScript?: string;
    bibleUpdates?: Partial<SceneBibleData>;
}
export interface ModerationFlag extends BaseEntity {
    contentType: ContentType;
    contentId: string;
    reporterId: string;
    reason: string;
    description?: string;
    status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
    reviewedBy?: string;
    reviewedAt?: Date;
    actionTaken?: string;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
    meta?: ResponseMeta;
}
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}
export interface ResponseMeta {
    page?: number;
    pageSize?: number;
    totalCount?: number;
    totalPages?: number;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    meta: ResponseMeta;
}
export interface CreateSceneRequest {
    ideaId: string;
    title: string;
    description?: string;
    initialScript: string;
    genre?: string;
    tone?: string;
}
export interface ContinueSceneRequest {
    sceneId: string;
    continuationScript: string;
    expectedBibleVersion: number;
}
export interface CreateIdeaRequest {
    topicId?: string;
    userTopicId?: string;
    categoryId?: string;
    title: string;
    description: string;
    tags?: string[];
}
export interface JobStatusResponse {
    jobId: string;
    status: JobStatus;
    progress: number;
    previewUrl?: string;
    finalUrl?: string;
    error?: string;
    estimatedTimeRemaining?: number;
}
export interface WsJobUpdate {
    type: 'job_update';
    jobId: string;
    status: JobStatus;
    progress: number;
    previewUrl?: string;
    finalUrl?: string;
    error?: string;
}
export interface WsSceneUpdate {
    type: 'scene_update';
    sceneId: string;
    newSegmentId: string;
    sequenceNumber: number;
    thumbnailUrl?: string;
}
export type WsEvent = WsJobUpdate | WsSceneUpdate;
