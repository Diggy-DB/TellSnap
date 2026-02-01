/**
 * StoryForge - Shared Utilities
 */
/**
 * Generate a random UUID v4
 */
export declare const generateId: () => string;
/**
 * Generate a deterministic UUID v5 for idempotency
 */
export declare const generateIdempotencyKey: (userId: string, sceneId: string, timestamp: number) => string;
/**
 * Generate a character ID (stable within a scene)
 */
export declare const generateCharacterId: (sceneId: string, characterName: string) => string;
/**
 * Generate a location ID (stable within a scene)
 */
export declare const generateLocationId: (sceneId: string, locationName: string) => string;
/**
 * Generate URL-safe slug from text
 */
export declare const generateSlug: (text: string) => string;
/**
 * Generate unique slug with random suffix
 */
export declare const generateUniqueSlug: (text: string) => string;
/**
 * Validate email format
 */
export declare const isValidEmail: (email: string) => boolean;
/**
 * Validate username format
 */
export declare const isValidUsername: (username: string) => boolean;
/**
 * Sanitize user input
 */
export declare const sanitizeInput: (input: string) => string;
/**
 * Format duration in milliseconds to human-readable
 */
export declare const formatDuration: (ms: number) => string;
/**
 * Get relative time string
 */
export declare const getRelativeTime: (date: Date) => string;
/**
 * Calculate exponential backoff delay
 */
export declare const getBackoffDelay: (attempt: number, baseDelay?: number, maxDelay?: number) => number;
/**
 * Sleep for specified milliseconds
 */
export declare const sleep: (ms: number) => Promise<void>;
/**
 * Deep clone an object
 */
export declare const deepClone: <T>(obj: T) => T;
/**
 * Pick specific keys from an object
 */
export declare const pick: <T extends object, K extends keyof T>(obj: T, keys: K[]) => Pick<T, K>;
/**
 * Omit specific keys from an object
 */
export declare const omit: <T extends object, K extends keyof T>(obj: T, keys: K[]) => Omit<T, K>;
/**
 * Chunk array into smaller arrays
 */
export declare const chunk: <T>(array: T[], size: number) => T[][];
/**
 * Remove duplicates from array
 */
export declare const unique: <T>(array: T[]) => T[];
/**
 * Group array by key
 */
export declare const groupBy: <T, K extends string | number>(array: T[], keyFn: (item: T) => K) => Record<K, T[]>;
