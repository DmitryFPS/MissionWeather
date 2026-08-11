import { Module } from '@nestjs/common';
import { RunsController } from './runs.controller';
import { RunHistoryService } from '../../infrastructure/store/run-history.service';

@Module({
  controllers: [RunsController],
  providers: [RunHistoryService],
  exports: [RunHistoryService],
})
export class RunsModule {}
