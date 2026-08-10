import { Module } from '@nestjs/common';
import { MissionsController } from './missions.controller';
import { AuthModule } from '../auth/auth.module';
import { WeatherModule } from '../weather/weather.module';
import { MissionTimelineService } from '../../domain/services/mission-timeline.service';

@Module({
  imports: [AuthModule, WeatherModule],
  controllers: [MissionsController],
  providers: [MissionTimelineService],
})
export class MissionsModule {}
