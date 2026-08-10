import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiAdvisorService } from '../../application/services/ai-advisor.service';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [WeatherModule],
  controllers: [AiController],
  providers: [AiAdvisorService],
})
export class AiModule {}
