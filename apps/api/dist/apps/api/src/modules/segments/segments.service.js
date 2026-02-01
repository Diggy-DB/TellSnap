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
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let SegmentsService = class SegmentsService {
    prisma;
    generationQueue;
    constructor(prisma, generationQueue) {
        this.prisma = prisma;
        this.generationQueue = generationQueue;
    }
    async findById(id) {
        const segment = await this.prisma.segment.findUnique({
            where: { id },
            include: {
                createdBy: { select: { id: true, username: true, avatarUrl: true } },
                scene: { select: { id: true, title: true } },
            },
        });
        if (!segment) {
            throw new common_1.NotFoundException('Segment not found');
        }
        return segment;
    }
    async getForScene(sceneId) {
        return this.prisma.segment.findMany({
            where: { sceneId },
            orderBy: { orderIndex: 'asc' },
            include: {
                createdBy: { select: { id: true, username: true, avatarUrl: true } },
            },
        });
    }
    async submitSegment(dto, userId) {
        const scene = await this.prisma.scene.findUnique({
            where: { id: dto.sceneId },
            include: {
                segments: { orderBy: { orderIndex: 'desc' }, take: 1 },
            },
        });
        if (!scene) {
            throw new common_1.NotFoundException('Scene not found');
        }
        let orderIndex = dto.orderIndex;
        if (!orderIndex) {
            const lastSegment = scene.segments[0];
            orderIndex = lastSegment ? lastSegment.orderIndex + 1 : 1;
        }
        const existing = await this.prisma.segment.findUnique({
            where: {
                sceneId_orderIndex: {
                    sceneId: dto.sceneId,
                    orderIndex,
                },
            },
        });
        if (existing) {
            throw new common_1.BadRequestException(`Segment with order index ${orderIndex} already exists in this scene`);
        }
        const segment = await this.prisma.segment.create({
            data: {
                sceneId: dto.sceneId,
                prompt: dto.prompt,
                orderIndex,
                status: client_1.SegmentStatus.PENDING,
                createdById: userId,
            },
            include: {
                createdBy: { select: { id: true, username: true, avatarUrl: true } },
                scene: { select: { id: true, title: true } },
            },
        });
        await this.prisma.scene.update({
            where: { id: dto.sceneId },
            data: { segmentCount: { increment: 1 } },
        });
        return segment;
    }
    async generateComic(dto, userId) {
        const segment = await this.prisma.segment.findUnique({
            where: { id: dto.segmentId },
            include: { scene: true },
        });
        if (!segment) {
            throw new common_1.NotFoundException('Segment not found');
        }
        if (segment.status === client_1.SegmentStatus.PROCESSING || segment.status === client_1.SegmentStatus.QUEUED) {
            throw new common_1.BadRequestException('Comic generation already in progress');
        }
        const comicStyle = dto.comicStyle || 'manga';
        const job = await this.prisma.job.create({
            data: {
                type: client_1.JobType.GENERATE_COMIC,
                status: client_1.JobStatus.PENDING,
                segmentId: dto.segmentId,
            },
        });
        await this.prisma.segment.update({
            where: { id: dto.segmentId },
            data: {
                status: client_1.SegmentStatus.QUEUED,
                comicStyle: comicStyle,
            },
        });
        await this.generationQueue.add('generate-comic', {
            jobId: job.id,
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
            jobId: job.id,
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
        const job = await this.prisma.job.findUnique({
            where: { id: jobId },
            include: {
                segment: {
                    select: {
                        id: true,
                        status: true,
                        imageUrl: true,
                        thumbnailUrl: true,
                        numPanels: true,
                        comicStyle: true,
                    },
                },
            },
        });
        if (!job) {
            throw new common_1.NotFoundException('Job not found');
        }
        return {
            jobId: job.id,
            type: job.type,
            status: job.status,
            progress: job.progress,
            stage: job.stage,
            error: job.error,
            segment: job.segment,
            createdAt: job.createdAt,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
        };
    }
    async getPreviousSegments(sceneId, beforeOrderIndex) {
        return this.prisma.segment.findMany({
            where: {
                sceneId,
                orderIndex: { lt: beforeOrderIndex },
            },
            orderBy: { orderIndex: 'asc' },
            select: {
                id: true,
                orderIndex: true,
                prompt: true,
                expandedScript: true,
                imageUrl: true,
                status: true,
            },
        });
    }
    async updateStatus(id, status, data) {
        return this.prisma.segment.update({
            where: { id },
            data: {
                status,
                ...data,
                ...(status === client_1.SegmentStatus.COMPLETED ? { completedAt: new Date() } : {}),
            },
        });
    }
};
exports.SegmentsService = SegmentsService;
exports.SegmentsService = SegmentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, bullmq_1.InjectQueue)('generation')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        bullmq_2.Queue])
], SegmentsService);
//# sourceMappingURL=segments.service.js.map