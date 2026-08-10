import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from './presentation/health/health.module';
import { WeatherModule } from './presentation/weather/weather.module';
import { AuthModule } from './presentation/auth/auth.module';
import { ProfilesModule } from './presentation/profiles/profiles.module';
import { MissionsModule } from './presentation/missions/missions.module';
import { AiModule } from './presentation/ai/ai.module';
import { JwtGlobalGuard } from './infrastructure/auth/jwt-global.guard';
import { DatabaseModule } from './infrastructure/database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    DatabaseModule,
    HealthModule,
    WeatherModule,
    AuthModule,
    ProfilesModule,
    MissionsModule,
    AiModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtGlobalGuard }],
})
export class AppModule {}
