import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SegmentsController } from './segments.controller';
import { SegmentsService } from './segments.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'generation',
    }),
  ],
  controllers: [SegmentsController],
  providers: [SegmentsService],
  exports: [SegmentsService],
})
export class SegmentsModule {}
