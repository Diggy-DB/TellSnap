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
const firestore_service_1 = require("../../firestore/firestore.service");
const redis_service_1 = require("../../redis/redis.service");
let TopicsService = class TopicsService {
    firestore;
    redis;
    constructor(firestore, redis) {
        this.firestore = firestore;
        this.redis = redis;
    }
    async list(category) {
        const cacheKey = category ? `topics:${category}` : 'topics:all';
        const cached = await this.redis.get(cacheKey);
        if (cached)
            return cached;
        const whereConditions = [
            { field: 'status', op: '==', value: firestore_service_1.TopicStatus.OPEN },
        ];
        if (category) {
            whereConditions.push({ field: 'category', op: '==', value: category });
        }
        const topics = await this.firestore.findMany('topics', {
            where: whereConditions,
            orderBy: [{ field: 'upvotes', direction: 'desc' }],
        });
        const result = await Promise.all(topics.map(async (t) => {
            const sceneCount = await this.firestore.count('scenes', {
                where: [{ field: 'topicId', op: '==', value: t.id }],
            });
            let createdBy = null;
            if (t.createdById) {
                createdBy = await this.firestore.findById('users', t.createdById);
            }
            return {
                id: t.id,
                title: t.title,
                description: t.description,
                category: t.category,
                upvotes: t.upvotes,
                sceneCount,
                createdBy: createdBy
                    ? { id: createdBy.id, username: createdBy.username, avatarUrl: createdBy.avatarUrl }
                    : null,
                createdAt: t.createdAt,
            };
        }));
        await this.redis.set(cacheKey, { items: result }, 300);
        return { items: result };
    }
    async findById(id) {
        const topic = await this.firestore.findById('topics', id);
        if (!topic) {
            throw new common_1.NotFoundException('Topic not found');
        }
        const sceneCount = await this.firestore.count('scenes', {
            where: [{ field: 'topicId', op: '==', value: id }],
        });
        let createdBy = null;
        if (topic.createdById) {
            createdBy = await this.firestore.findById('users', topic.createdById);
        }
        return {
            id: topic.id,
            title: topic.title,
            description: topic.description,
            category: topic.category,
            upvotes: topic.upvotes,
            sceneCount,
            createdBy: createdBy
                ? { id: createdBy.id, username: createdBy.username, avatarUrl: createdBy.avatarUrl }
                : null,
            createdAt: topic.createdAt,
        };
    }
    async getCategories() {
        const topics = await this.firestore.findMany('topics');
        const categoryMap = new Map();
        for (const topic of topics) {
            const count = categoryMap.get(topic.category) || 0;
            categoryMap.set(topic.category, count + 1);
        }
        return {
            items: Array.from(categoryMap.entries()).map(([name, topicCount]) => ({
                name,
                topicCount,
            })),
        };
    }
    async create(data, userId) {
        const topicId = await this.firestore.create('topics', {
            title: data.title,
            description: data.description || `Stories about ${data.title}`,
            category: data.category || 'general',
            createdById: userId,
            status: firestore_service_1.TopicStatus.OPEN,
            upvotes: 0,
        });
        const topic = await this.firestore.findById('topics', topicId);
        await this.redis.del('topics:all');
        if (topic?.category) {
            await this.redis.del(`topics:${topic.category}`);
        }
        return {
            id: topicId,
            title: topic?.title,
            description: topic?.description,
            category: topic?.category,
            createdAt: topic?.createdAt,
        };
    }
};
exports.TopicsService = TopicsService;
exports.TopicsService = TopicsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firestore_service_1.FirestoreService,
        redis_service_1.RedisService])
], TopicsService);
//# sourceMappingURL=topics.service.js.map