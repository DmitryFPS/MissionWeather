import { Module } from '@nestjs/common';
import { AircraftController } from './aircraft.controller';
import { RouteForecastService } from '../../domain/services/route-forecast.service';
import { OrlanTthService } from '../../domain/services/orlan-tth.service';
import { MissionTimelineService } from '../../domain/services/mission-timeline.service';
import { OpenMeteoOrlanService } from '../../infrastructure/weather/open-meteo-orlan.service';

@Module({
  controllers: [AircraftController],
  providers: [RouteForecastService, OrlanTthService, MissionTimelineService, OpenMeteoOrlanService],
  exports: [RouteForecastService, OrlanTthService],
})
export class AircraftModule {}
