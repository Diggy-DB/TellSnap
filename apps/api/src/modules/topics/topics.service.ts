import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { TopicStatus } from '@prisma/client';

@Injectable()
export class TopicsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async list(category?: string) {
    // Try cache first
    const cacheKey = category ? `topics:${category}` : 'topics:all';
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const where: any = { status: TopicStatus.OPEN };
    if (category) where.category = category;

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

    // Cache for 5 minutes
    await this.redis.set(cacheKey, result, 300);

    return { items: result };
  }

  async findById(id: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: {
        _count: { select: { scenes: true } },
        createdBy: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
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
    // Get distinct categories from topics
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

  async create(
    data: { title: string; description?: string; category?: string },
    userId: string,
  ) {
    const topic = await this.prisma.topic.create({
      data: {
        title: data.title,
        description: data.description || `Stories about ${data.title}`,
        category: data.category || 'general',
        createdById: userId,
        status: TopicStatus.OPEN,
      },
    });

    // Invalidate topics cache
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
}
