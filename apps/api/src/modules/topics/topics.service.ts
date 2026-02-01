import { Injectable, NotFoundException } from '@nestjs/common';
import { FirestoreService, TopicStatus, Topic, User } from '../../firestore/firestore.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class TopicsService {
  constructor(
    private firestore: FirestoreService,
    private redis: RedisService,
  ) {}

  async list(category?: string) {
    // Try cache first
    const cacheKey = category ? `topics:${category}` : 'topics:all';
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    // Query Firestore
    const whereConditions: Array<{ field: string; op: '=='; value: unknown }> = [
      { field: 'status', op: '==', value: TopicStatus.OPEN },
    ];
    if (category) {
      whereConditions.push({ field: 'category', op: '==', value: category });
    }

    const topics = await this.firestore.findMany<Topic>('topics', {
      where: whereConditions,
      orderBy: [{ field: 'upvotes', direction: 'desc' }],
    });

    // Fetch scene counts and creator info for each topic
    const result = await Promise.all(
      topics.map(async (t) => {
        // Count scenes for this topic
        const sceneCount = await this.firestore.count('scenes', {
          where: [{ field: 'topicId', op: '==', value: t.id }],
        });

        // Get creator info
        let createdBy: Partial<User> | null = null;
        if (t.createdById) {
          createdBy = await this.firestore.findById<User>('users', t.createdById);
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
      }),
    );

    // Cache for 5 minutes
    await this.redis.set(cacheKey, { items: result }, 300);

    return { items: result };
  }

  async findById(id: string) {
    const topic = await this.firestore.findById<Topic>('topics', id);

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    // Count scenes for this topic
    const sceneCount = await this.firestore.count('scenes', {
      where: [{ field: 'topicId', op: '==', value: id }],
    });

    // Get creator info
    let createdBy: Partial<User> | null = null;
    if (topic.createdById) {
      createdBy = await this.firestore.findById<User>('users', topic.createdById);
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
    // Get all topics and group by category
    const topics = await this.firestore.findMany<Topic>('topics');
    
    const categoryMap = new Map<string, number>();
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

  async create(
    data: { title: string; description?: string; category?: string },
    userId: string,
  ) {
    const topicId = await this.firestore.create('topics', {
      title: data.title,
      description: data.description || `Stories about ${data.title}`,
      category: data.category || 'general',
      createdById: userId,
      status: TopicStatus.OPEN,
      upvotes: 0,
    });

    const topic = await this.firestore.findById<Topic>('topics', topicId);

    // Invalidate topics cache
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
}
