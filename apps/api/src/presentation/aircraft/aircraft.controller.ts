import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/auth.decorators';
import {
  ORLAN10_PRESSURE_LEVELS,
  ORLAN10_PROFILE_DEFAULTS,
  ORLAN10_SPECS,
  ORLAN10_TTX_PARAMS,
} from '../../domain/presets/orlan-10.preset';
import { RouteForecastService, RouteForecastRequest } from '../../domain/services/route-forecast.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.decorators';
import { RunHistoryService } from '../../infrastructure/store/run-history.service';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { NotamService } from '../../infrastructure/weather/notam.service';

@ApiTags('aircraft')
@Controller('aircraft')
export class AircraftController {
  constructor(
    private readonly forecastService: RouteForecastService,
    private readonly history: RunHistoryService,
    private readonly audit: AuditService,
    private readonly notam: NotamService,
  ) {}

  @Public()
  @Get('meta')
  meta() {
    return {
      aircraft: {
        orlan10: {
          specs: ORLAN10_SPECS,
          ttxParams: ORLAN10_TTX_PARAMS,
        },
      },
      levels: ORLAN10_PRESSURE_LEVELS,
      models: [
        { id: 'gfs', name: 'GFS (глобальная)' },
        { id: 'ecmwf', name: 'ECMWF' },
        { id: 'icon', name: 'ICON' },
      ],
      sources: [{ id: 'open-meteo', name: 'Open-Meteo fusion', stepHours: 1, free: true }],
      defaultTimezone: 'Europe/Moscow',
      profileDefaults: ORLAN10_PROFILE_DEFAULTS,
      build: { app: 'MissionWeather', version: '1.2.0' },
    };
  }

  @ApiBearerAuth()
  @Post('route-forecast')
  async routeForecast(
    @CurrentUser() user: AuthUser,
    @Body() body: RouteForecastRequest,
    @Query('includeNotam') includeNotam?: string,
  ) {
    const result = await this.forecastService.forecast(body);
    const notams =
      includeNotam === '1' && body.waypoints[0]
        ? await this.notam.fetchNear(body.waypoints[0].lat, body.waypoints[0].lon, 50)
        : [];

    const payload = { ...result, notams };
    await this.history.save(user.id, 'route_forecast', body, payload, {
      verdict: result.assessment.status,
    });
    await this.audit.log(user.id, 'route.forecast', 'route', undefined, {
      verdict: result.assessment.status,
      dep: body.departureHour,
    });
    return payload;
  }
}
