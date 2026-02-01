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
const firestore_service_1 = require("../../firestore/firestore.service");
const redis_service_1 = require("../../redis/redis.service");
let ScenesService = ScenesService_1 = class ScenesService {
    firestore;
    redis;
    generationQueue;
    logger = new common_1.Logger(ScenesService_1.name);
    generatorApiUrl = process.env.GENERATOR_API_URL || 'http://localhost:8080';
    constructor(firestore, redis, generationQueue) {
        this.firestore = firestore;
        this.redis = redis;
        this.generationQueue = generationQueue;
    }
    async list(query) {
        const { page = 1, limit = 20, topicId, sort = 'recent' } = query;
        const skip = (page - 1) * limit;
        const whereConditions = [
            { field: 'status', op: '==', value: firestore_service_1.SceneStatus.PUBLISHED },
        ];
        if (topicId) {
            whereConditions.push({ field: 'topicId', op: '==', value: topicId });
        }
        let orderField = 'createdAt';
        if (sort === 'popular')
            orderField = 'upvotes';
        else if (sort === 'trending')
            orderField = 'viewCount';
        let scenes = await this.firestore.findMany('scenes', {
            where: whereConditions,
            orderBy: [{ field: orderField, direction: 'desc' }],
        });
        const total = scenes.length;
        scenes = scenes.slice(skip, skip + limit);
        const items = await Promise.all(scenes.map(async (scene) => {
            let topic = null;
            let createdBy = null;
            if (scene.topicId) {
                topic = await this.firestore.findById('topics', scene.topicId);
            }
            if (scene.createdById) {
                createdBy = await this.firestore.findById('users', scene.createdById);
            }
            return {
                ...scene,
                topic: topic ? { id: topic.id, title: topic.title } : null,
                createdBy: createdBy
                    ? { id: createdBy.id, username: createdBy.username, avatarUrl: createdBy.avatarUrl }
                    : null,
            };
        }));
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
        const scene = await this.firestore.findById('scenes', id);
        if (!scene) {
            throw new common_1.NotFoundException('Scene not found');
        }
        let topic = null;
        let createdBy = null;
        if (scene.topicId) {
            topic = await this.firestore.findById('topics', scene.topicId);
        }
        if (scene.createdById) {
            createdBy = await this.firestore.findById('users', scene.createdById);
        }
        const segments = await this.firestore.findMany('segments', {
            where: [{ field: 'sceneId', op: '==', value: id }],
            orderBy: [{ field: 'orderIndex', direction: 'asc' }],
        });
        const result = {
            ...scene,
            topic: topic ? { id: topic.id, title: topic.title } : null,
            createdBy: createdBy
                ? { id: createdBy.id, username: createdBy.username, avatarUrl: createdBy.avatarUrl }
                : null,
            segments: segments.map((s) => ({
                id: s.id,
                orderIndex: s.orderIndex,
                prompt: s.prompt,
                thumbnailUrl: s.thumbnailUrl,
                imageUrl: s.imageUrl,
                numPanels: s.numPanels,
                comicStyle: s.comicStyle,
                status: s.status,
                createdAt: s.createdAt,
            })),
        };
        await this.redis.set(`scene:${id}`, result, 60);
        return result;
    }
    async getPages(id) {
        const scene = await this.firestore.findById('scenes', id);
        if (!scene) {
            throw new common_1.NotFoundException('Scene not found');
        }
        const segments = await this.firestore.findMany('segments', {
            where: [
                { field: 'sceneId', op: '==', value: id },
                { field: 'status', op: '==', value: firestore_service_1.SegmentStatus.COMPLETED },
            ],
            orderBy: [{ field: 'orderIndex', direction: 'asc' }],
        });
        return {
            sceneId: scene.id,
            totalPages: segments.length,
            pages: segments.map((s) => ({
                id: s.id,
                orderIndex: s.orderIndex,
                imageUrl: s.imageUrl,
                thumbnailUrl: s.thumbnailUrl,
                numPanels: s.numPanels,
                comicStyle: s.comicStyle,
            })),
        };
    }
    async create(dto, userId) {
        const sceneId = await this.firestore.create('scenes', {
            title: dto.title,
            description: dto.description,
            topicId: dto.topicId,
            createdById: userId,
            status: firestore_service_1.SceneStatus.DRAFT,
            segmentCount: 0,
            totalDuration: 0,
        });
        const scene = await this.firestore.findById('scenes', sceneId);
        await this.firestore.create('sceneBibles', {
            sceneId,
            characters: [],
            locations: [],
            objects: [],
            timeline: [],
            rules: [],
            version: 1,
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
            const segmentId = await this.firestore.create('segments', {
                sceneId,
                createdById: userId,
                orderIndex: segInfo.order_index,
                prompt: segInfo.prompt,
                status: firestore_service_1.SegmentStatus.PENDING,
            });
            const segment = await this.firestore.findById('segments', segmentId);
            if (segment)
                segments.push(segment);
            const jobId = await this.firestore.create('jobs', {
                type: firestore_service_1.JobType.GENERATE_COMIC,
                segmentId,
                status: firestore_service_1.JobStatus.PENDING,
                priority: 0,
                progress: 0,
                attempts: 0,
                maxAttempts: 3,
            });
            const job = await this.firestore.findById('jobs', jobId);
            if (job)
                jobs.push(job);
            const delay = (segInfo.order_index - 1) * 1000;
            await this.generationQueue.add('generate-comic', {
                jobId,
                sceneId,
                segmentId,
                comicStyle: 'manga',
            }, { delay });
            this.logger.log(`Queued comic page ${segInfo.order_index}/${segmentsToCreate.length}`);
        }
        await this.firestore.update('scenes', sceneId, {
            segmentCount: segments.length,
        });
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
        const scene = await this.firestore.findById('scenes', sceneId);
        if (!scene) {
            throw new common_1.NotFoundException('Scene not found');
        }
        const segments = await this.firestore.findMany('segments', {
            where: [{ field: 'sceneId', op: '==', value: sceneId }],
            orderBy: [{ field: 'orderIndex', direction: 'desc' }],
            limit: 1,
        });
        const lastOrderIndex = segments[0]?.orderIndex || 0;
        const segmentId = await this.firestore.create('segments', {
            sceneId,
            createdById: userId,
            orderIndex: lastOrderIndex + 1,
            prompt: dto.prompt,
            status: firestore_service_1.SegmentStatus.PENDING,
        });
        const segment = await this.firestore.findById('segments', segmentId);
        const jobId = await this.firestore.create('jobs', {
            type: firestore_service_1.JobType.GENERATE_COMIC,
            segmentId,
            status: firestore_service_1.JobStatus.PENDING,
            priority: 0,
            progress: 0,
            attempts: 0,
            maxAttempts: 3,
        });
        const job = await this.firestore.findById('jobs', jobId);
        await this.generationQueue.add('generate-comic', {
            jobId,
            sceneId,
            segmentId,
            comicStyle: 'manga',
        });
        await this.redis.del(`scene:${sceneId}`);
        return { segment, job };
    }
    getOrderBy(sort) {
        switch (sort) {
            case 'popular':
                return 'upvotes';
            case 'trending':
                return 'viewCount';
            case 'recent':
            default:
                return 'createdAt';
        }
    }
};
exports.ScenesService = ScenesService;
exports.ScenesService = ScenesService = ScenesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, bullmq_1.InjectQueue)('generation')),
    __metadata("design:paramtypes", [firestore_service_1.FirestoreService,
        redis_service_1.RedisService,
        bullmq_2.Queue])
], ScenesService);
//# sourceMappingURL=scenes.service.js.map