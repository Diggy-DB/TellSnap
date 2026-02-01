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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopicsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const redis_service_1 = require("../../redis/redis.service");
const client_1 = require("@prisma/client");
let TopicsService = class TopicsService {
    prisma;
    redis;
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async list(category) {
        const cacheKey = category ? `topics:${category}` : 'topics:all';
        const cached = await this.redis.get(cacheKey);
        if (cached)
            return cached;
        const where = { status: client_1.TopicStatus.OPEN };
        if (category)
            where.category = category;
        const topics = await this.prisma.topic.findMany({
            where,
            orderBy: { upvotes: 'desc' },
            include: {
                _count: { select: { scenes: true } },
                createdBy: { select: { id: true, username: true, avatarUrl: true } },
            },
        });
        const result = topics.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            category: t.category,
            upvotes: t.upvotes,
            sceneCount: t._count.scenes,
            createdBy: t.createdBy,
            createdAt: t.createdAt,
        }));
        await this.redis.set(cacheKey, result, 300);
        return { items: result };
    }
    async findById(id) {
        const topic = await this.prisma.topic.findUnique({
            where: { id },
            include: {
                _count: { select: { scenes: true } },
                createdBy: { select: { id: true, username: true, avatarUrl: true } },
            },
        });
        if (!topic) {
            throw new common_1.NotFoundException('Topic not found');
        }
        return {
            id: topic.id,
            title: topic.title,
            description: topic.description,
            category: topic.category,
            upvotes: topic.upvotes,
            sceneCount: topic._count.scenes,
            createdBy: topic.createdBy,
            createdAt: topic.createdAt,
        };
    }
    async getCategories() {
        const topics = await this.prisma.topic.groupBy({
            by: ['category'],
            _count: { category: true },
        });
        return {
            items: topics.map((t) => ({
                name: t.category,
                topicCount: t._count.category,
            })),
        };
    }
    async create(data, userId) {
        const topic = await this.prisma.topic.create({
            data: {
                title: data.title,
                description: data.description || `Stories about ${data.title}`,
                category: data.category || 'general',
                createdById: userId,
                status: client_1.TopicStatus.OPEN,
            },
        });
        await this.redis.del('topics:all');
        if (topic.category) {
            await this.redis.del(`topics:${topic.category}`);
        }
        return {
            id: topic.id,
            title: topic.title,
            description: topic.description,
            category: topic.category,
            createdAt: topic.createdAt,
        };
    }
};
exports.TopicsService = TopicsService;
exports.TopicsService = TopicsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], TopicsService);
//# sourceMappingURL=topics.service.js.map