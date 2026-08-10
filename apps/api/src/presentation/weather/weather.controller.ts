import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WeatherService } from '../../application/services/weather.service';
import { WeatherEvaluateDto, WeatherQueryDto } from './weather.dto';
import { FlightThresholds } from '../../domain/entities/flight-thresholds.entity';
import { Public } from '../auth/auth.decorators';

@ApiTags('weather')
@Controller('weather')
export class WeatherController {
  constructor(private readonly weather: WeatherService) {}

  @Public()
  @Get('providers')
  providers() {
    return this.weather.listProviders();
  }

  @Public()
  @Get('health')
  health() {
    return this.weather.providerHealth();
  }

  @Public()
  @Get('fused')
  async fused(@Query() query: WeatherQueryDto) {
    return this.weather.fetchFused(query, query.sourceIds);
  }

  @Public()
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
