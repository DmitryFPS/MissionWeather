import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/auth.decorators';
import {
  ORLAN10_PRESSURE_LEVELS,
  ORLAN10_PROFILE_DEFAULTS,
  ORLAN10_SPECS,
  ORLAN10_TTX_PARAMS,
} from '../../domain/presets/orlan-10.preset';
import { RouteForecastService, RouteForecastRequest } from '../../domain/services/route-forecast.service';

@ApiTags('aircraft')
@Controller('aircraft')
export class AircraftController {
  constructor(private readonly forecastService: RouteForecastService) {}

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
      sources: [{ id: 'open-meteo', name: 'Open-Meteo', stepHours: 1, free: true }],
      defaultTimezone: 'Europe/Moscow',
      profileDefaults: ORLAN10_PROFILE_DEFAULTS,
      build: { app: 'MissionWeather', version: '1.1.0' },
    };
  }

  @ApiBearerAuth()
  @Post('route-forecast')
  routeForecast(@Body() body: RouteForecastRequest) {
    return this.forecastService.forecast(body);
  }
}
