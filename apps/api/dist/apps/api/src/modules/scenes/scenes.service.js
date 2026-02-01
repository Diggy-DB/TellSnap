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
var ScenesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScenesService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const prisma_service_1 = require("../../prisma/prisma.service");
const redis_service_1 = require("../../redis/redis.service");
const client_1 = require("@prisma/client");
let ScenesService = ScenesService_1 = class ScenesService {
    prisma;
    redis;
    generationQueue;
    logger = new common_1.Logger(ScenesService_1.name);
    generatorApiUrl = process.env.GENERATOR_API_URL || 'http://localhost:8080';
    constructor(prisma, redis, generationQueue) {
        this.prisma = prisma;
        this.redis = redis;
        this.generationQueue = generationQueue;
    }
    async list(query) {
        const { page = 1, limit = 20, topicId, sort = 'recent' } = query;
        const skip = (page - 1) * limit;
        const where = { status: client_1.SceneStatus.PUBLISHED };
        if (topicId)
            where.topicId = topicId;
        const orderBy = this.getOrderBy(sort);
        const [items, total] = await Promise.all([
            this.prisma.scene.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                include: {
                    topic: { select: { id: true, title: true } },
                    createdBy: { select: { id: true, username: true, avatarUrl: true } },
                },
            }),
            this.prisma.scene.count({ where }),
        ]);
        return {
            items,
            meta: {
                page,
                limit,
                total,
                hasMore: skip + items.length < total,
            },
        };
    }
    async findById(id) {
        const cached = await this.redis.get(`scene:${id}`);
        if (cached)
            return cached;
        const scene = await this.prisma.scene.findUnique({
            where: { id },
            include: {
                topic: { select: { id: true, title: true } },
                createdBy: { select: { id: true, username: true, avatarUrl: true } },
                segments: {
                    orderBy: { orderIndex: 'asc' },
                    select: {
                        id: true,
                        orderIndex: true,
                        prompt: true,
                        thumbnailUrl: true,
                        imageUrl: true,
                        numPanels: true,
                        comicStyle: true,
                        status: true,
                        createdAt: true,
                    },
                },
            },
        });
        if (!scene) {
            throw new common_1.NotFoundException('Scene not found');
        }
        await this.redis.set(`scene:${id}`, scene, 60);
        return scene;
    }
    async getPages(id) {
        const scene = await this.prisma.scene.findUnique({
            where: { id },
            include: {
                segments: {
                    where: { status: client_1.SegmentStatus.COMPLETED },
                    orderBy: { orderIndex: 'asc' },
                    select: {
                        id: true,
                        orderIndex: true,
                        imageUrl: true,
                        thumbnailUrl: true,
                        numPanels: true,
                        comicStyle: true,
                    },
                },
            },
        });
        if (!scene) {
            throw new common_1.NotFoundException('Scene not found');
        }
        return {
            sceneId: scene.id,
            totalPages: scene.segments.length,
            pages: scene.segments,
        };
    }
    async create(dto, userId) {
        const scene = await this.prisma.scene.create({
            data: {
                title: dto.title,
                description: dto.description,
                topicId: dto.topicId,
                createdById: userId,
                status: client_1.SceneStatus.DRAFT,
            },
        });
        await this.prisma.sceneBible.create({
            data: { sceneId: scene.id },
        });
        let segmentsToCreate = [];
        try {
            const segmentationResult = await this.analyzeScript(dto.initialPrompt);
            if (segmentationResult && segmentationResult.needs_segmentation) {
                this.logger.log(`Script needs segmentation: ${segmentationResult.num_segments} segments`);
                segmentsToCreate = segmentationResult.segments;
            }
            else {
                segmentsToCreate = [{
                        order_index: 1,
                        prompt: dto.initialPrompt,
                        scene_description: '',
                        duration_estimate: 8,
                        continuity_notes: '',
                    }];
            }
        }
        catch (error) {
            this.logger.warn('Script analysis failed, creating single segment', error);
            segmentsToCreate = [{
                    order_index: 1,
                    prompt: dto.initialPrompt,
                    scene_description: '',
                    duration_estimate: 8,
                    continuity_notes: '',
                }];
        }
        const segments = [];
        const jobs = [];
        for (const segInfo of segmentsToCreate) {
            const segment = await this.prisma.segment.create({
                data: {
                    sceneId: scene.id,
                    createdById: userId,
                    orderIndex: segInfo.order_index,
                    prompt: segInfo.prompt,
                    status: client_1.SegmentStatus.PENDING,
                },
            });
            segments.push(segment);
            const job = await this.prisma.job.create({
                data: {
                    type: client_1.JobType.GENERATE_COMIC,
                    segmentId: segment.id,
                    status: client_1.JobStatus.PENDING,
                },
            });
            jobs.push(job);
            const delay = (segInfo.order_index - 1) * 1000;
            await this.generationQueue.add('generate-comic', {
                jobId: job.id,
                sceneId: scene.id,
                segmentId: segment.id,
                comicStyle: 'manga',
            }, { delay });
            this.logger.log(`Queued comic page ${segInfo.order_index}/${segmentsToCreate.length}`);
        }
        return {
            scene,
            segment: segments[0],
            job: jobs[0],
            totalSegments: segments.length,
            segments,
        };
    }
    async analyzeScript(prompt) {
        try {
            const response = await fetch(`${this.generatorApiUrl}/api/analyze-script`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });
            if (!response.ok) {
                this.logger.warn(`Script analysis returned ${response.status}`);
                return null;
            }
            return await response.json();
        }
        catch (error) {
            this.logger.warn('Failed to connect to generator API for script analysis', error);
            return null;
        }
    }
    async continue(sceneId, dto, userId) {
        const scene = await this.prisma.scene.findUnique({
            where: { id: sceneId },
            include: { segments: { orderBy: { orderIndex: 'desc' }, take: 1 } },
        });
        if (!scene) {
            throw new common_1.NotFoundException('Scene not found');
        }
        const lastOrderIndex = scene.segments[0]?.orderIndex || 0;
        const segment = await this.prisma.segment.create({
            data: {
                sceneId,
                createdById: userId,
                orderIndex: lastOrderIndex + 1,
                prompt: dto.prompt,
                status: client_1.SegmentStatus.PENDING,
            },
        });
        const job = await this.prisma.job.create({
            data: {
                type: client_1.JobType.GENERATE_COMIC,
                segmentId: segment.id,
                status: client_1.JobStatus.PENDING,
            },
        });
        await this.generationQueue.add('generate-comic', {
            jobId: job.id,
            sceneId,
            segmentId: segment.id,
            comicStyle: 'manga',
        });
        await this.redis.del(`scene:${sceneId}`);
        return { segment, job };
    }
    getOrderBy(sort) {
        switch (sort) {
            case 'popular':
                return { upvotes: 'desc' };
            case 'trending':
                return [{ viewCount: 'desc' }, { createdAt: 'desc' }];
            case 'recent':
            default:
                return { createdAt: 'desc' };
        }
    }
};
exports.ScenesService = ScenesService;
exports.ScenesService = ScenesService = ScenesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, bullmq_1.InjectQueue)('generation')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        bullmq_2.Queue])
], ScenesService);
//# sourceMappingURL=scenes.service.js.map