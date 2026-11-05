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

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Queue
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
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
