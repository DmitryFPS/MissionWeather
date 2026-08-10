import { Module } from '@nestjs/common';
import { WeatherController } from './weather.controller';
import { WeatherService } from '../../application/services/weather.service';

@Module({
  controllers: [WeatherController],
  providers: [WeatherService],
  exports: [WeatherService],
})
export class WeatherModule {}
