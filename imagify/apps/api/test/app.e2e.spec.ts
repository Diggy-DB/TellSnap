import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { AddressInfo } from 'net';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { FirestoreService } from '../src/firestore/firestore.service';
import { RedisService } from '../src/redis/redis.service';
import { InMemoryFirestore } from './in-memory-firestore';

/**
 * End-to-end tests for the HTTP API. Firestore, Redis, and the BullMQ queue are
 * replaced with in-memory fakes, so no Google Cloud project or Redis is needed.
 */
describe('Imagify API (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const db = new InMemoryFirestore();
  const queue = { add: jest.fn().mockResolvedValue({}) };
  const cache = new Map<string, unknown>();
  const redis = {
    get: async (key: string) => cache.get(key) ?? null,
    set: async (key: string, value: unknown) => void cache.set(key, value),
    del: async (key: string) => void cache.delete(key),
    exists: async (key: string) => cache.has(key),
    getClient: () => ({ duplicate: () => ({ subscribe: async () => {}, on: () => {}, quit: async () => {} }) }),
    onModuleDestroy: async () => {},
  };

  const user = { email: 'reader@example.com', password: 'Password123', username: 'reader' };
  let accessToken: string;

  const call = async (method: string, path: string, body?: unknown, token?: string) => {
    const response = await fetch(`${baseUrl}/api/v1${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.GENERATOR_API_URL = 'http://127.0.0.1:9'; // unreachable: scene creation falls back to one page

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(FirestoreService).useValue(db)
      .overrideProvider(RedisService).useValue(redis)
      .overrideProvider(getQueueToken('generation')).useValue(queue)
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0);
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('auth', () => {
    it('signs up a new user and returns tokens without the password', async () => {
      const res = await call('POST', '/auth/signup', user);

      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(JSON.stringify(res.body)).not.toContain(user.password);
      accessToken = res.body.accessToken;
    });

    it('rejects a duplicate email', async () => {
      const res = await call('POST', '/auth/signup', { ...user, username: 'someone-else' });
      expect(res.status).toBe(409);
    });

    it('rejects a weak password', async () => {
      const res = await call('POST', '/auth/signup', { email: 'weak@example.com', password: 'short', username: 'weakpw' });
      expect(res.status).toBe(400);
    });

    it('logs in with the right password and rejects the wrong one', async () => {
      expect((await call('POST', '/auth/login', { email: user.email, password: user.password })).status).toBe(200);
      expect((await call('POST', '/auth/login', { email: user.email, password: 'WrongPass123' })).status).toBe(401);
    });

    it('returns the current user only with a valid token', async () => {
      const me = await call('GET', '/auth/me', undefined, accessToken);
      expect(me.status).toBe(200);
      expect(me.body.email).toBe(user.email);

      expect((await call('GET', '/auth/me')).status).toBe(401);
      expect((await call('GET', '/auth/me', undefined, 'not-a-real-token')).status).toBe(401);
    });

    it('does not return the password reset token outside development', async () => {
      const res = await call('POST', '/auth/forgot-password', { email: user.email });
      expect(res.status).toBeLessThan(300);
      expect(res.body.resetToken).toBeUndefined();
    });
  });

  describe('scenes', () => {
    let sceneId: string;

    it('requires login to create a scene', async () => {
      const res = await call('POST', '/scenes', { title: 'Lost City', description: 'An adventure', initialPrompt: 'Explorers find a hidden door.' });
      expect(res.status).toBe(401);
    });

    it('creates a scene and queues a comic generation job', async () => {
      const res = await call(
        'POST',
        '/scenes',
        { title: 'Lost City', description: 'An adventure', initialPrompt: 'Explorers find a hidden door.' },
        accessToken,
      );

      expect(res.status).toBe(201);
      expect(res.body.job.id).toBeDefined();
      expect(res.body.segment.orderIndex).toBe(1);
      sceneId = res.body.scene.id;

      expect(queue.add).toHaveBeenCalledWith(
        'generate-comic',
        expect.objectContaining({ jobId: res.body.job.id, sceneId, segmentId: res.body.segment.id }),
        expect.anything(),
      );
      expect(db.all('sceneBibles').some((bible) => bible.sceneId === sceneId)).toBe(true);
    });

    it('lists and fetches the scene', async () => {
      const list = await call('GET', '/scenes');
      expect(list.status).toBe(200);
      expect(list.body.items.map((s: { id: string }) => s.id)).toContain(sceneId);

      const one = await call('GET', `/scenes/${sceneId}`);
      expect(one.status).toBe(200);
      expect(one.body.title).toBe('Lost City');
    });

    it('requires login to continue a scene', async () => {
      const res = await call('POST', `/scenes/${sceneId}/continue`, { parentSegmentId: 'x', prompt: 'They step inside.' });
      expect(res.status).toBe(401);
    });

    it('continues a scene for a logged-in user', async () => {
      queue.add.mockClear();
      const segments = db.all('segments').filter((s) => s.sceneId === sceneId);
      const res = await call(
        'POST',
        `/scenes/${sceneId}/continue`,
        { parentSegmentId: segments[0].id, prompt: 'They step inside the temple.' },
        accessToken,
      );

      expect(res.status).toBe(201);
      expect(queue.add).toHaveBeenCalledTimes(1);
    });

    it('returns 404 for an unknown scene', async () => {
      expect((await call('GET', '/scenes/does-not-exist')).status).toBe(404);
    });
  });
});
