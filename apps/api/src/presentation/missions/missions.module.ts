import { Module } from '@nestjs/common';
import { MissionsController } from './missions.controller';
import { AuthModule } from '../auth/auth.module';
import { WeatherModule } from '../weather/weather.module';
import { MissionTimelineService } from '../../domain/services/mission-timeline.service';
import { RunHistoryService } from '../../infrastructure/store/run-history.service';
import { AuditModule } from '../../infrastructure/audit/audit.module';

@Module({
  imports: [AuthModule, WeatherModule, AuditModule],
  controllers: [MissionsController],
  providers: [MissionTimelineService, RunHistoryService],
})
export class MissionsModule {}
