"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FirestoreService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreService = exports.JobType = exports.JobStatus = exports.SegmentStatus = exports.SceneStatus = exports.TopicStatus = void 0;
const common_1 = require("@nestjs/common");
const firestore_1 = require("@google-cloud/firestore");
const COLLECTIONS = {
    USERS: 'users',
    TOPICS: 'topics',
    SCENES: 'scenes',
    SEGMENTS: 'segments',
    JOBS: 'jobs',
    SCENE_BIBLES: 'sceneBibles',
};
var TopicStatus;
(function (TopicStatus) {
    TopicStatus["OPEN"] = "OPEN";
    TopicStatus["CLOSED"] = "CLOSED";
    TopicStatus["ARCHIVED"] = "ARCHIVED";
})(TopicStatus || (exports.TopicStatus = TopicStatus = {}));
var SceneStatus;
(function (SceneStatus) {
    SceneStatus["DRAFT"] = "DRAFT";
    SceneStatus["GENERATING"] = "GENERATING";
    SceneStatus["PUBLISHED"] = "PUBLISHED";
    SceneStatus["ARCHIVED"] = "ARCHIVED";
})(SceneStatus || (exports.SceneStatus = SceneStatus = {}));
var SegmentStatus;
(function (SegmentStatus) {
    SegmentStatus["PENDING"] = "PENDING";
    SegmentStatus["QUEUED"] = "QUEUED";
    SegmentStatus["PROCESSING"] = "PROCESSING";
    SegmentStatus["COMPLETED"] = "COMPLETED";
    SegmentStatus["FAILED"] = "FAILED";
})(SegmentStatus || (exports.SegmentStatus = SegmentStatus = {}));
var JobStatus;
(function (JobStatus) {
    JobStatus["PENDING"] = "PENDING";
    JobStatus["QUEUED"] = "QUEUED";
    JobStatus["PROCESSING"] = "PROCESSING";
    JobStatus["COMPLETED"] = "COMPLETED";
    JobStatus["FAILED"] = "FAILED";
    JobStatus["CANCELLED"] = "CANCELLED";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
var JobType;
(function (JobType) {
    JobType["GENERATE_COMIC"] = "GENERATE_COMIC";
    JobType["REGENERATE_COMIC"] = "REGENERATE_COMIC";
})(JobType || (exports.JobType = JobType = {}));
let FirestoreService = FirestoreService_1 = class FirestoreService {
    logger = new common_1.Logger(FirestoreService_1.name);
    db;
    constructor() {
        const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0432066024';
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            this.db = new firestore_1.Firestore({
                projectId,
                keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            });
        }
        else {
            this.db = new firestore_1.Firestore({ projectId });
        }
    }
    async onModuleInit() {
        this.logger.log('Firestore connected');
    }
    get users() {
        return this.db.collection(COLLECTIONS.USERS);
    }
    get topics() {
        return this.db.collection(COLLECTIONS.TOPICS);
    }
    get scenes() {
        return this.db.collection(COLLECTIONS.SCENES);
    }
    get segments() {
        return this.db.collection(COLLECTIONS.SEGMENTS);
    }
    get jobs() {
        return this.db.collection(COLLECTIONS.JOBS);
    }
    get sceneBibles() {
        return this.db.collection(COLLECTIONS.SCENE_BIBLES);
    }
    docToObject(doc) {
        if (!doc.exists)
            return null;
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            createdAt: data?.createdAt?.toDate?.() || data?.createdAt,
            updatedAt: data?.updatedAt?.toDate?.() || data?.updatedAt,
            completedAt: data?.completedAt?.toDate?.() || data?.completedAt,
            startedAt: data?.startedAt?.toDate?.() || data?.startedAt,
        };
    }
    getCollection(name) {
        return this.db.collection(name);
    }
    buildQuery(collection, options) {
        let query = collection;
        if (options?.where) {
            for (const condition of options.where) {
                query = query.where(condition.field, condition.op, condition.value);
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
    async findById(collectionName, id) {
        const doc = await this.getCollection(collectionName).doc(id).get();
        return this.docToObject(doc);
    }
    async create(collectionName, data) {
        const now = new Date();
        const docData = {
            ...data,
            createdAt: now,
            updatedAt: now,
        };
        const docRef = await this.getCollection(collectionName).add(docData);
        return docRef.id;
    }
    async createWithId(collectionName, id, data) {
        const now = new Date();
        const docData = {
            ...data,
            createdAt: now,
            updatedAt: now,
        };
        await this.getCollection(collectionName).doc(id).set(docData);
    }
    async update(collectionName, id, data) {
        const updateData = { ...data };
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });
        updateData.updatedAt = new Date();
        await this.getCollection(collectionName).doc(id).update(updateData);
    }
    async delete(collectionName, id) {
        await this.getCollection(collectionName).doc(id).delete();
    }
    async findMany(collectionName, options) {
        const collection = this.getCollection(collectionName);
        const query = this.buildQuery(collection, options);
        const snapshot = await query.get();
        return snapshot.docs.map((doc) => this.docToObject(doc)).filter(Boolean);
    }
    async count(collectionName, options) {
        const collection = this.getCollection(collectionName);
        const query = this.buildQuery(collection, options);
        const snapshot = await query.count().get();
        return snapshot.data().count;
    }
    async increment(collectionName, id, field, value = 1) {
        await this.getCollection(collectionName).doc(id).update({
            [field]: firestore_1.FieldValue.increment(value),
            updatedAt: new Date(),
        });
    }
    async transaction(fn) {
        return this.db.runTransaction(fn);
    }
    batch() {
        return this.db.batch();
    }
};
exports.FirestoreService = FirestoreService;
exports.FirestoreService = FirestoreService = FirestoreService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], FirestoreService);
//# sourceMappingURL=firestore.service.js.map