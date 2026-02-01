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
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const firestore_service_1 = require("../../firestore/firestore.service");
const redis_service_1 = require("../../redis/redis.service");
let JobsService = class JobsService {
    firestore;
    redis;
    generationQueue;
    constructor(firestore, redis, generationQueue) {
        this.firestore = firestore;
        this.redis = redis;
        this.generationQueue = generationQueue;
    }
    async getStatus(id) {
        const cached = await this.redis.get(`job:${id}`);
        if (cached)
            return cached;
        const job = await this.firestore.findById('jobs', id);
        if (!job) {
            throw new common_1.NotFoundException('Job not found');
        }
        let segment = null;
        if (job.segmentId) {
            const seg = await this.firestore.findById('segments', job.segmentId);
            if (seg) {
                segment = { id: seg.id, sceneId: seg.sceneId };
            }
        }
        const status = {
            id: job.id,
            type: job.type,
            status: job.status,
            progress: job.progress,
            stage: job.stage,
            error: job.error,
            createdAt: job.createdAt,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
            segment,
        };
        const isActive = job.status === firestore_service_1.JobStatus.PENDING ||
            job.status === firestore_service_1.JobStatus.QUEUED ||
            job.status === firestore_service_1.JobStatus.PROCESSING;
        if (isActive) {
            await this.redis.set(`job:${id}`, status, 30);
        }
        return status;
    }
    async updateProgress(id, progress, stage) {
        await this.firestore.update('jobs', id, {
            progress,
            stage,
            status: firestore_service_1.JobStatus.PROCESSING,
            startedAt: new Date(),
        });
        const job = await this.firestore.findById('jobs', id);
        await this.redis.publish('job:progress', {
            jobId: id,
            progress,
            stage,
            status: firestore_service_1.JobStatus.PROCESSING,
        });
        await this.redis.set(`job:${id}`, job, 30);
        return job;
    }
    async complete(id, result) {
        await this.firestore.update('jobs', id, {
            status: firestore_service_1.JobStatus.COMPLETED,
            progress: 100,
            result,
            completedAt: new Date(),
        });
        const job = await this.firestore.findById('jobs', id);
        await this.redis.publish('job:complete', {
            jobId: id,
            success: true,
            result,
        });
        await this.redis.del(`job:${id}`);
        return job;
    }
    async fail(id, error) {
        await this.firestore.increment('jobs', id, 'attempts', 1);
        await this.firestore.update('jobs', id, {
            status: firestore_service_1.JobStatus.FAILED,
            error,
            completedAt: new Date(),
        });
        const job = await this.firestore.findById('jobs', id);
        await this.redis.publish('job:complete', {
            jobId: id,
            success: false,
            error,
        });
        await this.redis.del(`job:${id}`);
        return job;
    }
    async retry(id) {
        const job = await this.firestore.findById('jobs', id);
        if (!job) {
            throw new common_1.NotFoundException('Job not found');
        }
        if (job.status !== firestore_service_1.JobStatus.FAILED) {
            throw new common_1.BadRequestException('Only failed jobs can be retried');
        }
        if (job.attempts >= job.maxAttempts) {
            throw new common_1.BadRequestException('Maximum retry attempts exceeded');
        }
        let sceneId;
        if (job.segmentId) {
            const segment = await this.firestore.findById('segments', job.segmentId);
            sceneId = segment?.sceneId;
        }
        await this.firestore.update('jobs', id, {
            status: firestore_service_1.JobStatus.PENDING,
            progress: 0,
            stage: undefined,
            error: undefined,
            startedAt: undefined,
            completedAt: undefined,
        });
        await this.generationQueue.add('generate', {
            jobId: job.id,
            segmentId: job.segmentId,
            sceneId,
        });
        return { success: true };
    }
    async cancel(id) {
        const job = await this.firestore.findById('jobs', id);
        if (!job) {
            throw new common_1.NotFoundException('Job not found');
        }
        const isCancelable = job.status === firestore_service_1.JobStatus.PENDING || job.status === firestore_service_1.JobStatus.QUEUED;
        if (!isCancelable) {
            throw new common_1.BadRequestException('Only pending jobs can be cancelled');
        }
        await this.firestore.update('jobs', id, {
            status: firestore_service_1.JobStatus.CANCELLED,
            completedAt: new Date(),
        });
        return { success: true };
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, bullmq_1.InjectQueue)('generation')),
    __metadata("design:paramtypes", [firestore_service_1.FirestoreService,
        redis_service_1.RedisService,
        bullmq_2.Queue])
], JobsService);
//# sourceMappingURL=jobs.service.js.map