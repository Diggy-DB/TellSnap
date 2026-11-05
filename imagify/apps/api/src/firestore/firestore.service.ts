import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Firestore, CollectionReference, Query, FieldValue, DocumentSnapshot, WriteBatch, Transaction } from '@google-cloud/firestore';

// Collection names
const COLLECTIONS = {
  USERS: 'users',
  TOPICS: 'topics',
  SCENES: 'scenes',
  SEGMENTS: 'segments',
  JOBS: 'jobs',
  SCENE_BIBLES: 'sceneBibles',
} as const;

// Status enums (replaces Prisma enums)
export enum TopicStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export enum SceneStatus {
  DRAFT = 'DRAFT',
  GENERATING = 'GENERATING',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum SegmentStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum JobStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum JobType {
  GENERATE_COMIC = 'GENERATE_COMIC',
  REGENERATE_COMIC = 'REGENERATE_COMIC',
}

// Interfaces
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
  genre?: string;  // auto-detected: action, romance, fantasy, horror, comedy, drama, sci-fi, slice-of-life
  status: SceneStatus;
  segmentCount: number;
  totalDuration: number;
  thumbnailUrl?: string;
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

@Injectable()
export class FirestoreService implements OnModuleInit {
  private readonly logger = new Logger(FirestoreService.name);
  private db: Firestore;

  constructor() {
    // Initialize Firestore
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0432066024';
    const databaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';
    
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      this.db = new Firestore({
        projectId,
        databaseId,
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      });
    } else {
      // Use default credentials (for Cloud Run, GCE, etc.)
      this.db = new Firestore({ projectId, databaseId });
    }
    
    this.logger.log(`Firestore initializing with project: ${projectId}, database: ${databaseId}`);
  }

  async onModuleInit() {
    this.logger.log('Firestore connected');
  }

  // Collection references
  get users(): CollectionReference {
    return this.db.collection(COLLECTIONS.USERS);
  }

  get topics(): CollectionReference {
    return this.db.collection(COLLECTIONS.TOPICS);
  }

  get scenes(): CollectionReference {
    return this.db.collection(COLLECTIONS.SCENES);
  }

  get segments(): CollectionReference {
    return this.db.collection(COLLECTIONS.SEGMENTS);
  }

  get jobs(): CollectionReference {
    return this.db.collection(COLLECTIONS.JOBS);
  }

  get sceneBibles(): CollectionReference {
    return this.db.collection(COLLECTIONS.SCENE_BIBLES);
  }

  // Helper to convert Firestore doc to object with id
  private docToObject<T>(doc: DocumentSnapshot): T | null {
    if (!doc.exists) return null;
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      // Convert Firestore Timestamps to Date
      createdAt: data?.createdAt?.toDate?.() || data?.createdAt,
      updatedAt: data?.updatedAt?.toDate?.() || data?.updatedAt,
      completedAt: data?.completedAt?.toDate?.() || data?.completedAt,
      startedAt: data?.startedAt?.toDate?.() || data?.startedAt,
    } as T;
  }

  // Get collection by name
  private getCollection(name: string): CollectionReference {
    return this.db.collection(name);
  }

  // Query options interface
  private buildQuery(
    collection: CollectionReference,
    options?: QueryOptions,
  ): Query {
    let query: Query = collection;

    if (options?.where) {
      for (const condition of options.where) {
        query = query.where(condition.field, condition.op as FirebaseFirestore.WhereFilterOp, condition.value);
      }
    }

    if (options?.orderBy) {
      for (const order of options.orderBy) {
        query = query.orderBy(order.field, order.direction || 'asc');
      }
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return query;
  }

  // Generic CRUD operations with string collection names
  async findById<T>(collectionName: string, id: string): Promise<T | null> {
    const doc = await this.getCollection(collectionName).doc(id).get();
    return this.docToObject<T>(doc);
  }

  async create<T>(
    collectionName: string,
    data: Record<string, unknown>,
  ): Promise<string> {
    const now = new Date();
    // Remove undefined values to avoid Firestore errors
    const cleanData: Record<string, unknown> = {};
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        cleanData[key] = data[key];
      }
    });
    const docData = {
      ...cleanData,
      createdAt: now,
      updatedAt: now,
    };
    const docRef = await this.getCollection(collectionName).add(docData);
    return docRef.id;
  }

  async createWithId<T>(
    collectionName: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const now = new Date();
    const docData = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    await this.getCollection(collectionName).doc(id).set(docData);
  }

  async update<T>(
    collectionName: string,
    id: string,
    data: Partial<T>,
  ): Promise<void> {
    const updateData: Record<string, unknown> = { ...data };
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    updateData.updatedAt = new Date();
    await this.getCollection(collectionName).doc(id).update(updateData);
  }

  async delete(collectionName: string, id: string): Promise<void> {
    await this.getCollection(collectionName).doc(id).delete();
  }

  async findMany<T>(
    collectionName: string,
    options?: QueryOptions,
  ): Promise<T[]> {
    const collection = this.getCollection(collectionName);
    const query = this.buildQuery(collection, options);
    const snapshot = await query.get();
    return snapshot.docs.map((doc: DocumentSnapshot) => this.docToObject<T>(doc)).filter(Boolean) as T[];
  }

  async count(collectionName: string, options?: QueryOptions): Promise<number> {
    const collection = this.getCollection(collectionName);
    const query = this.buildQuery(collection, options);
    const snapshot = await query.count().get();
    return snapshot.data().count;
  }

  // Increment a field
  async increment(
    collectionName: string,
    id: string,
    field: string,
    value: number = 1,
  ): Promise<void> {
    await this.getCollection(collectionName).doc(id).update({
      [field]: FieldValue.increment(value),
      updatedAt: new Date(),
    });
  }

  // Transaction helper
  async transaction<T>(fn: (transaction: Transaction) => Promise<T>): Promise<T> {
    return this.db.runTransaction(fn);
  }

  // Batch write helper
  batch(): WriteBatch {
    return this.db.batch();
  }
}

// Query options interface
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
