import { Module } from '@nestjs/common';
import { MissionsController } from './missions.controller';
import { AuthModule } from '../auth/auth.module';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [AuthModule, WeatherModule],
  controllers: [MissionsController],
})
export class MissionsModule {}
