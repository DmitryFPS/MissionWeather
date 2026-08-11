import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { WeatherService } from '../../application/services/weather.service';
import { WeatherEvaluateDto, WeatherQueryDto } from './weather.dto';
import { FlightThresholds } from '../../domain/entities/flight-thresholds.entity';

@ApiTags('weather')
@ApiBearerAuth()
@Controller('weather')
export class WeatherController {
  constructor(private readonly weather: WeatherService) {}

  @Get('providers')
  providers() {
    return this.weather.listProviders();
  }

  @Get('health')
  health() {
    return this.weather.providerHealth();
  }

  @Get('fused')
  async fused(@Query() query: WeatherQueryDto) {
    return this.weather.fetchFused(query, query.sourceIds);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('evaluate')
  async evaluate(@Body() body: WeatherEvaluateDto) {
    const thresholds: FlightThresholds = {
      windSpeedMs: body.thresholds.windSpeedMs ?? {},
      windGustMs: body.thresholds.windGustMs ?? {},
      visibilityKm: body.thresholds.visibilityKm ?? {},
      precipitationMmH: body.thresholds.precipitationMmH ?? {},
      temperatureC: body.thresholds.temperatureC ?? {},
      maxSourceSpreadMs: body.thresholds.maxSourceSpreadMs,
    };
    return this.weather.evaluate(body, thresholds, body.sourceIds, body.weights);
  }
}
