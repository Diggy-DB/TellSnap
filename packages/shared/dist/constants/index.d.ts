/**
 * StoryForge - Shared Constants
 */
export declare const RATE_LIMITS: {
    readonly API_GENERAL: 100;
    readonly API_AUTHENTICATED: 200;
    readonly SCENE_CREATE_PER_HOUR: 5;
    readonly SEGMENT_CREATE_PER_HOUR: 10;
    readonly IDEA_CREATE_PER_DAY: 20;
    readonly TOPIC_CREATE_PER_DAY: 3;
    readonly REPORT_PER_HOUR: 10;
};
export declare const JOB_CONFIG: {
    readonly MAX_ATTEMPTS: 3;
    readonly RETRY_DELAYS_MS: readonly [1000, 5000, 30000];
    readonly SCRIPT_EXPANSION_TIMEOUT_MS: 30000;
    readonly VIDEO_GENERATION_TIMEOUT_MS: 600000;
    readonly THUMBNAIL_GENERATION_TIMEOUT_MS: 60000;
    readonly PRIORITY: {
        readonly URGENT: 1;
        readonly HIGH: 2;
        readonly NORMAL: 5;
        readonly LOW: 10;
    };
};
export declare const CONTINUITY_CONFIG: {
    readonly RECENT_SEGMENTS_VERBATIM: 3;
    readonly SUMMARY_MAX_LENGTH: 2000;
    readonly SEGMENTS_PER_SUMMARY: 10;
    readonly BIBLE_LOCK_TIMEOUT_MS: 30000;
    readonly AUTO_FIX_CONFIDENCE_THRESHOLD: 0.85;
};
export declare const VIDEO_CONFIG: {
    readonly MIN_SEGMENT_DURATION_MS: 5000;
    readonly MAX_SEGMENT_DURATION_MS: 120000;
    readonly DEFAULT_SEGMENT_DURATION_MS: 30000;
    readonly PREVIEW_RESOLUTION: "720p";
    readonly FINAL_RESOLUTION: "1080p";
    readonly HLS_SEGMENT_DURATION_S: 6;
    readonly HLS_PLAYLIST_TYPE: "VOD";
    readonly THUMBNAIL_WIDTH: 640;
    readonly THUMBNAIL_HEIGHT: 360;
    readonly THUMBNAIL_FORMAT: "webp";
};
export declare const STORAGE_PATHS: {
    readonly VIDEOS: "videos";
    readonly THUMBNAILS: "thumbnails";
    readonly HLS: "hls";
    readonly REFERENCE_IMAGES: "references/images";
    readonly VOICE_ANCHORS: "references/voices";
    readonly TEMP: "temp";
};
export declare const getVideoPath: (sceneId: string, segmentId: string, quality: string) => string;
export declare const getThumbnailPath: (sceneId: string, segmentId: string) => string;
export declare const getHlsPath: (sceneId: string, segmentId: string) => string;
export declare const CACHE_KEYS: {
    readonly TOPIC_LIST: "topics:all";
    readonly TOPIC_BY_SLUG: (slug: string) => string;
    readonly CATEGORY_BY_TOPIC: (topicId: string) => string;
    readonly SCENE_DETAIL: (sceneId: string) => string;
    readonly SCENE_BIBLE: (sceneId: string) => string;
    readonly SCENE_SEGMENTS: (sceneId: string) => string;
    readonly JOB_STATUS: (jobId: string) => string;
    readonly USER_PROFILE: (userId: string) => string;
    readonly FEATURED_SCENES: "scenes:featured";
    readonly TRENDING_SCENES: "scenes:trending";
};
export declare const CACHE_TTL: {
    readonly SHORT: 60;
    readonly MEDIUM: 300;
    readonly LONG: 3600;
    readonly VERY_LONG: 86400;
};
export declare const QUEUE_NAMES: {
    readonly SCRIPT_EXPANSION: "script-expansion";
    readonly CONTINUITY_CHECK: "continuity-check";
    readonly VIDEO_GENERATION: "video-generation";
    readonly THUMBNAIL_GENERATION: "thumbnail-generation";
    readonly HLS_PACKAGING: "hls-packaging";
    readonly SUMMARY_UPDATE: "summary-update";
    readonly MODERATION: "moderation";
    readonly NOTIFICATIONS: "notifications";
    readonly DEAD_LETTER: "dead-letter";
};
export declare const ERROR_CODES: {
    readonly AUTH_INVALID_TOKEN: "AUTH_INVALID_TOKEN";
    readonly AUTH_EXPIRED_TOKEN: "AUTH_EXPIRED_TOKEN";
    readonly AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED";
    readonly VALIDATION_FAILED: "VALIDATION_FAILED";
    readonly INVALID_INPUT: "INVALID_INPUT";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly ALREADY_EXISTS: "ALREADY_EXISTS";
    readonly BIBLE_VERSION_CONFLICT: "BIBLE_VERSION_CONFLICT";
    readonly CONTINUITY_VALIDATION_FAILED: "CONTINUITY_VALIDATION_FAILED";
    readonly JOB_FAILED: "JOB_FAILED";
    readonly JOB_TIMEOUT: "JOB_TIMEOUT";
    readonly RATE_LIMITED: "RATE_LIMITED";
    readonly CONTENT_REJECTED: "CONTENT_REJECTED";
    readonly CONTENT_PENDING_REVIEW: "CONTENT_PENDING_REVIEW";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
};
export declare const MODERATION_CONFIG: {
    readonly BLOCKED_PATTERNS: string[];
    readonly AUTO_APPROVE_THRESHOLD: 0.95;
    readonly AUTO_REJECT_THRESHOLD: 0.1;
    readonly REPORT_THRESHOLD_FOR_REVIEW: 3;
};
