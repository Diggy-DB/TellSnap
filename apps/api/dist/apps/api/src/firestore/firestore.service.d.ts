import { OnModuleInit } from '@nestjs/common';
import { CollectionReference, WriteBatch, Transaction } from '@google-cloud/firestore';
export declare enum TopicStatus {
    OPEN = "OPEN",
    CLOSED = "CLOSED",
    ARCHIVED = "ARCHIVED"
}
export declare enum SceneStatus {
    DRAFT = "DRAFT",
    GENERATING = "GENERATING",
    PUBLISHED = "PUBLISHED",
    ARCHIVED = "ARCHIVED"
}
export declare enum SegmentStatus {
    PENDING = "PENDING",
    QUEUED = "QUEUED",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED"
}
export declare enum JobStatus {
    PENDING = "PENDING",
    QUEUED = "QUEUED",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED"
}
export declare enum JobType {
    GENERATE_COMIC = "GENERATE_COMIC",
    REGENERATE_COMIC = "REGENERATE_COMIC"
}
export interface User {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    passwordHash?: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Topic {
    id: string;
    title: string;
    description?: string;
    category: string;
    status: TopicStatus;
    upvotes: number;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Scene {
    id: string;
    title: string;
    description?: string;
    topicId?: string;
    status: SceneStatus;
    segmentCount: number;
    totalDuration: number;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Segment {
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
}
export interface Job {
    id: string;
    type: JobType;
    status: JobStatus;
    priority: number;
    segmentId?: string;
    progress: number;
    stage?: string;
    result?: any;
    error?: string;
    attempts: number;
    maxAttempts: number;
    createdAt: Date;
    updatedAt: Date;
    startedAt?: Date;
    completedAt?: Date;
}
export declare class FirestoreService implements OnModuleInit {
    private readonly logger;
    private db;
    constructor();
    onModuleInit(): Promise<void>;
    get users(): CollectionReference;
    get topics(): CollectionReference;
    get scenes(): CollectionReference;
    get segments(): CollectionReference;
    get jobs(): CollectionReference;
    get sceneBibles(): CollectionReference;
    private docToObject;
    private getCollection;
    private buildQuery;
    findById<T>(collectionName: string, id: string): Promise<T | null>;
    create<T>(collectionName: string, data: Record<string, unknown>): Promise<string>;
    createWithId<T>(collectionName: string, id: string, data: Record<string, unknown>): Promise<void>;
    update<T>(collectionName: string, id: string, data: Partial<T>): Promise<void>;
    delete(collectionName: string, id: string): Promise<void>;
    findMany<T>(collectionName: string, options?: QueryOptions): Promise<T[]>;
    count(collectionName: string, options?: QueryOptions): Promise<number>;
    increment(collectionName: string, id: string, field: string, value?: number): Promise<void>;
    transaction<T>(fn: (transaction: Transaction) => Promise<T>): Promise<T>;
    batch(): WriteBatch;
}
export interface QueryOptions {
    where?: Array<{
        field: string;
        op: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in';
        value: unknown;
    }>;
    orderBy?: Array<{
        field: string;
        direction?: 'asc' | 'desc';
    }>;
    limit?: number;
    offset?: number;
}
