import { Module } from '@nestjs/common';
import { ScenariosController } from './scenarios.controller';
import { ScenarioService } from '../../domain/services/scenario.service';
import { RouteForecastService } from '../../domain/services/route-forecast.service';
import { OrlanTthService } from '../../domain/services/orlan-tth.service';
import { MissionTimelineService } from '../../domain/services/mission-timeline.service';
import { OpenMeteoOrlanService } from '../../infrastructure/weather/open-meteo-orlan.service';
import { RunHistoryService } from '../../infrastructure/store/run-history.service';
import { AuditModule } from '../../infrastructure/audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ScenariosController],
  providers: [
    ScenarioService,
    RouteForecastService,
    OrlanTthService,
    MissionTimelineService,
    OpenMeteoOrlanService,
    RunHistoryService,
  ],
})
export class ScenariosModule {}
