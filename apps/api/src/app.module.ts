import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './presentation/health/health.module';
import { WeatherModule } from './presentation/weather/weather.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    HealthModule,
    WeatherModule,
  ],
})
export class AppModule {}
