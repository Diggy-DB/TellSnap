import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './modules/auth/auth.module';
import { TopicsModule } from './modules/topics/topics.module';
import { ScenesModule } from './modules/scenes/scenes.module';
import { SegmentsModule } from './modules/segments/segments.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { FirestoreModule } from './firestore/firestore.module';
import { RedisModule } from './redis/redis.module';

// BullMQ uses the same Redis as RedisService (REDIS_URL)
const redisUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6379');

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '../../.env'],
    }),

    // Queue
    BullModule.forRoot({
      connection: {
        host: redisUrl.hostname,
        port: parseInt(redisUrl.port || '6379'),
        username: redisUrl.username || undefined,
        password: redisUrl.password ? decodeURIComponent(redisUrl.password) : undefined,
      },
    }),

    // Database & Cache
    FirestoreModule,
    RedisModule,

    // Feature modules
    AuthModule,
    TopicsModule,
    ScenesModule,
    SegmentsModule,
    JobsModule,
  ],
})
export class AppModule {}
