import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScenesController } from './scenes.controller';
import { ScenesService } from './scenes.service';
import { SceneBibleService } from './scene-bible.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'generation',
    }),
  ],
  controllers: [ScenesController],
  providers: [ScenesService, SceneBibleService],
  exports: [ScenesService, SceneBibleService],
})
export class ScenesModule {}
