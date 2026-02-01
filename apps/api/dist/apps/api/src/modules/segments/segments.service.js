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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SegmentsService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const firestore_service_1 = require("../../firestore/firestore.service");
let SegmentsService = class SegmentsService {
    firestore;
    generationQueue;
    constructor(firestore, generationQueue) {
        this.firestore = firestore;
        this.generationQueue = generationQueue;
    }
    async findById(id) {
        const segment = await this.firestore.findById('segments', id);
        if (!segment) {
            throw new common_1.NotFoundException('Segment not found');
        }
        let createdBy = null;
        let scene = null;
        if (segment.createdById) {
            createdBy = await this.firestore.findById('users', segment.createdById);
        }
        if (segment.sceneId) {
            scene = await this.firestore.findById('scenes', segment.sceneId);
        }
        return {
            ...segment,
            createdBy: createdBy
                ? { id: createdBy.id, username: createdBy.username, avatarUrl: createdBy.avatarUrl }
                : null,
            scene: scene ? { id: scene.id, title: scene.title } : null,
        };
    }
    async getForScene(sceneId) {
        const segments = await this.firestore.findMany('segments', {
            where: [{ field: 'sceneId', op: '==', value: sceneId }],
            orderBy: [{ field: 'orderIndex', direction: 'asc' }],
        });
        return Promise.all(segments.map(async (segment) => {
            let createdBy = null;
            if (segment.createdById) {
                createdBy = await this.firestore.findById('users', segment.createdById);
            }
            return {
                ...segment,
                createdBy: createdBy
                    ? { id: createdBy.id, username: createdBy.username, avatarUrl: createdBy.avatarUrl }
                    : null,
            };
        }));
    }
    async submitSegment(dto, userId) {
        const scene = await this.firestore.findById('scenes', dto.sceneId);
        if (!scene) {
            throw new common_1.NotFoundException('Scene not found');
        }
        const segments = await this.firestore.findMany('segments', {
            where: [{ field: 'sceneId', op: '==', value: dto.sceneId }],
            orderBy: [{ field: 'orderIndex', direction: 'desc' }],
            limit: 1,
        });
        let orderIndex = dto.orderIndex;
        if (!orderIndex) {
            const lastSegment = segments[0];
            orderIndex = lastSegment ? lastSegment.orderIndex + 1 : 1;
        }
        const existing = await this.firestore.findMany('segments', {
            where: [
                { field: 'sceneId', op: '==', value: dto.sceneId },
                { field: 'orderIndex', op: '==', value: orderIndex },
            ],
            limit: 1,
        });
        if (existing.length > 0) {
            throw new common_1.BadRequestException(`Segment with order index ${orderIndex} already exists in this scene`);
        }
        const segmentId = await this.firestore.create('segments', {
            sceneId: dto.sceneId,
            prompt: dto.prompt,
            orderIndex,
            status: firestore_service_1.SegmentStatus.PENDING,
            createdById: userId,
        });
        const segment = await this.firestore.findById('segments', segmentId);
        await this.firestore.increment('scenes', dto.sceneId, 'segmentCount', 1);
        let createdBy = null;
        if (userId) {
            createdBy = await this.firestore.findById('users', userId);
        }
        return {
            ...segment,
            createdBy: createdBy
                ? { id: createdBy.id, username: createdBy.username, avatarUrl: createdBy.avatarUrl }
                : null,
            scene: { id: scene.id, title: scene.title },
        };
    }
    async generateComic(dto, userId) {
        const segment = await this.firestore.findById('segments', dto.segmentId);
        if (!segment) {
            throw new common_1.NotFoundException('Segment not found');
        }
        if (segment.status === firestore_service_1.SegmentStatus.PROCESSING || segment.status === firestore_service_1.SegmentStatus.QUEUED) {
            throw new common_1.BadRequestException('Comic generation already in progress');
        }
        const comicStyle = dto.comicStyle || 'manga';
        const jobId = await this.firestore.create('jobs', {
            type: firestore_service_1.JobType.GENERATE_COMIC,
            status: firestore_service_1.JobStatus.PENDING,
            segmentId: dto.segmentId,
            priority: 0,
            progress: 0,
            attempts: 0,
            maxAttempts: 3,
        });
        await this.firestore.update('segments', dto.segmentId, {
            status: firestore_service_1.SegmentStatus.QUEUED,
            comicStyle: comicStyle,
        });
        await this.generationQueue.add('generate-comic', {
            jobId,
            sceneId: segment.sceneId,
            segmentId: dto.segmentId,
            comicStyle: comicStyle,
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 30000,
            },
            removeOnComplete: 100,
            removeOnFail: 50,
        });
        return {
            jobId,
            segmentId: dto.segmentId,
            status: 'queued',
            message: 'Comic generation queued successfully',
        };
    }
    async submitAndGenerate(dto, userId) {
        const segment = await this.submitSegment(dto, userId);
        const jobResult = await this.generateComic({ segmentId: segment.id, ...dto.comicStyle && { comicStyle: dto.comicStyle } }, userId);
        return {
            segment,
            job: jobResult,
        };
    }
    async getJobStatus(jobId) {
        const job = await this.firestore.findById('jobs', jobId);
        if (!job) {
            throw new common_1.NotFoundException('Job not found');
        }
        let segment = null;
        if (job.segmentId) {
            segment = await this.firestore.findById('segments', job.segmentId);
        }
        return {
            jobId: job.id,
            type: job.type,
            status: job.status,
            progress: job.progress,
            stage: job.stage,
            error: job.error,
            segment: segment
                ? {
                    id: segment.id,
                    status: segment.status,
                    imageUrl: segment.imageUrl,
                    thumbnailUrl: segment.thumbnailUrl,
                    numPanels: segment.numPanels,
                    comicStyle: segment.comicStyle,
                }
                : null,
            createdAt: job.createdAt,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
        };
    }
    async getPreviousSegments(sceneId, beforeOrderIndex) {
        return this.firestore.findMany('segments', {
            where: [
                { field: 'sceneId', op: '==', value: sceneId },
                { field: 'orderIndex', op: '<', value: beforeOrderIndex },
            ],
            orderBy: [{ field: 'orderIndex', direction: 'asc' }],
        });
    }
    async updateStatus(id, status, data) {
        const updates = {
            status,
            ...data,
        };
        if (status === firestore_service_1.SegmentStatus.COMPLETED) {
            updates.completedAt = new Date();
        }
        await this.firestore.update('segments', id, updates);
        return this.firestore.findById('segments', id);
    }
};
exports.SegmentsService = SegmentsService;
exports.SegmentsService = SegmentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, bullmq_1.InjectQueue)('generation')),
    __metadata("design:paramtypes", [firestore_service_1.FirestoreService,
        bullmq_2.Queue])
], SegmentsService);
//# sourceMappingURL=segments.service.js.map