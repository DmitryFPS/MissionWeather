import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AiAdvisorService } from '../../application/services/ai-advisor.service';
import { WeatherEvaluateDto } from '../weather/weather.dto';
import { WeatherService } from '../../application/services/weather.service';
import { FlightThresholds } from '../../domain/entities/flight-thresholds.entity';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('ai')
export class AiController {
  constructor(
    private readonly ai: AiAdvisorService,
    private readonly weather: WeatherService,
  ) {}

  @Post('advise')
  async advise(@Body() body: WeatherEvaluateDto & { modelId?: string }) {
    const thresholds: FlightThresholds = {
      windSpeedMs: body.thresholds.windSpeedMs ?? {},
      windGustMs: body.thresholds.windGustMs ?? {},
      visibilityKm: body.thresholds.visibilityKm ?? {},
      precipitationMmH: body.thresholds.precipitationMmH ?? {},
      temperatureC: body.thresholds.temperatureC ?? {},
      maxSourceSpreadMs: body.thresholds.maxSourceSpreadMs,
    };
    const { fused, verdict } = await this.weather.evaluate(body, thresholds, body.sourceIds, body.weights);
    if (!fused || !verdict) {
      return { verdict, advice: null };
    }
    const advice = await this.ai.advise(fused, verdict, thresholds, body.modelId);
    return { verdict, fused, advice };
  }
}
