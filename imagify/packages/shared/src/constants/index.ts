/**
 * StoryForge - Shared Constants
 */

// ============================================================================
// RATE LIMITS
// ============================================================================

export const RATE_LIMITS = {
  // Per minute limits
  API_GENERAL: 100,
  API_AUTHENTICATED: 200,
  
  // Scene operations
  SCENE_CREATE_PER_HOUR: 5,
  SEGMENT_CREATE_PER_HOUR: 10,
  
  // Content creation
  IDEA_CREATE_PER_DAY: 20,
  TOPIC_CREATE_PER_DAY: 3,
  
  // Moderation
  REPORT_PER_HOUR: 10,
} as const;

// ============================================================================
// JOB CONFIGURATION
// ============================================================================

export const JOB_CONFIG = {
  MAX_ATTEMPTS: 3,
  RETRY_DELAYS_MS: [1000, 5000, 30000],
  SCRIPT_EXPANSION_TIMEOUT_MS: 30000,
  VIDEO_GENERATION_TIMEOUT_MS: 600000, // 10 minutes
  THUMBNAIL_GENERATION_TIMEOUT_MS: 60000,
  
  // Priority levels (lower = higher priority)
  PRIORITY: {
    URGENT: 1,
    HIGH: 2,
    NORMAL: 5,
    LOW: 10,
  },
} as const;

// ============================================================================
// CONTINUITY CONFIGURATION
// ============================================================================

export const CONTINUITY_CONFIG = {
  // How many recent segments to include verbatim in context
  RECENT_SEGMENTS_VERBATIM: 3,
  
  // Max characters for long history summary
  SUMMARY_MAX_LENGTH: 2000,
  
  // Segments per summary chunk
  SEGMENTS_PER_SUMMARY: 10,
  
  // Bible version conflict window (ms)
  BIBLE_LOCK_TIMEOUT_MS: 30000,
  
  // Auto-fix confidence threshold
  AUTO_FIX_CONFIDENCE_THRESHOLD: 0.85,
} as const;

// ============================================================================
// VIDEO CONFIGURATION
// ============================================================================

export const VIDEO_CONFIG = {
  // Segment constraints
  MIN_SEGMENT_DURATION_MS: 5000,
  MAX_SEGMENT_DURATION_MS: 120000,
  DEFAULT_SEGMENT_DURATION_MS: 30000,
  
  // Quality presets
  PREVIEW_RESOLUTION: '720p',
  FINAL_RESOLUTION: '1080p',
  
  // HLS configuration
  HLS_SEGMENT_DURATION_S: 6,
  HLS_PLAYLIST_TYPE: 'VOD',
  
  // Thumbnail
  THUMBNAIL_WIDTH: 640,
  THUMBNAIL_HEIGHT: 360,
  THUMBNAIL_FORMAT: 'webp',
} as const;

// ============================================================================
// STORAGE PATHS
// ============================================================================

export const STORAGE_PATHS = {
  VIDEOS: 'videos',
  THUMBNAILS: 'thumbnails',
  HLS: 'hls',
  REFERENCE_IMAGES: 'references/images',
  VOICE_ANCHORS: 'references/voices',
  TEMP: 'temp',
} as const;

export const getVideoPath = (sceneId: string, segmentId: string, quality: string) =>
  `${STORAGE_PATHS.VIDEOS}/${sceneId}/${segmentId}/${quality}.mp4`;

export const getThumbnailPath = (sceneId: string, segmentId: string) =>
  `${STORAGE_PATHS.THUMBNAILS}/${sceneId}/${segmentId}.webp`;

export const getHlsPath = (sceneId: string, segmentId: string) =>
  `${STORAGE_PATHS.HLS}/${sceneId}/${segmentId}/manifest.m3u8`;

// ============================================================================
// CACHE KEYS
// ============================================================================

export const CACHE_KEYS = {
  TOPIC_LIST: 'topics:all',
  TOPIC_BY_SLUG: (slug: string) => `topics:slug:${slug}`,
  CATEGORY_BY_TOPIC: (topicId: string) => `categories:topic:${topicId}`,
  SCENE_DETAIL: (sceneId: string) => `scenes:${sceneId}`,
  SCENE_BIBLE: (sceneId: string) => `bibles:${sceneId}`,
  SCENE_SEGMENTS: (sceneId: string) => `segments:scene:${sceneId}`,
  JOB_STATUS: (jobId: string) => `jobs:${jobId}`,
  USER_PROFILE: (userId: string) => `users:${userId}`,
  FEATURED_SCENES: 'scenes:featured',
  TRENDING_SCENES: 'scenes:trending',
} as const;

export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

// ============================================================================
// QUEUE NAMES
// ============================================================================

export const QUEUE_NAMES = {
  SCRIPT_EXPANSION: 'script-expansion',
  CONTINUITY_CHECK: 'continuity-check',
  VIDEO_GENERATION: 'video-generation',
  THUMBNAIL_GENERATION: 'thumbnail-generation',
  HLS_PACKAGING: 'hls-packaging',
  SUMMARY_UPDATE: 'summary-update',
  MODERATION: 'moderation',
  NOTIFICATIONS: 'notifications',
  DEAD_LETTER: 'dead-letter',
} as const;

// ============================================================================
// ERROR CODES
// ============================================================================

export const ERROR_CODES = {
  // Authentication
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_EXPIRED_TOKEN: 'AUTH_EXPIRED_TOKEN',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  
  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  
  // Continuity
  BIBLE_VERSION_CONFLICT: 'BIBLE_VERSION_CONFLICT',
  CONTINUITY_VALIDATION_FAILED: 'CONTINUITY_VALIDATION_FAILED',
  
  // Jobs
  JOB_FAILED: 'JOB_FAILED',
  JOB_TIMEOUT: 'JOB_TIMEOUT',
  
  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',
  
  // Moderation
  CONTENT_REJECTED: 'CONTENT_REJECTED',
  CONTENT_PENDING_REVIEW: 'CONTENT_PENDING_REVIEW',
  
  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

// ============================================================================
// MODERATION
// ============================================================================

export const MODERATION_CONFIG = {
  // Auto-reject keywords (basic example, use ML in production)
  BLOCKED_PATTERNS: [] as string[],
  
  // Thresholds
  AUTO_APPROVE_THRESHOLD: 0.95,
  AUTO_REJECT_THRESHOLD: 0.1,
  
  // Review queue priority
  REPORT_THRESHOLD_FOR_REVIEW: 3,
} as const;
