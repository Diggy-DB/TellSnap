import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobsGateway } from './jobs.gateway';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'generation' }),
  ],
  controllers: [JobsController],
  providers: [JobsService, JobsGateway],
  exports: [JobsService],
})
export class JobsModule {}
