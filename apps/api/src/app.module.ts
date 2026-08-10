import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from './presentation/health/health.module';
import { WeatherModule } from './presentation/weather/weather.module';
import { AuthModule } from './presentation/auth/auth.module';
import { ProfilesModule } from './presentation/profiles/profiles.module';
import { MissionsModule } from './presentation/missions/missions.module';
import { AiModule } from './presentation/ai/ai.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { JwtGlobalGuard } from './infrastructure/auth/jwt-global.guard';
import { DatabaseModule } from './infrastructure/database/database.module';

import { AuditModule } from './infrastructure/audit/audit.module';
import { AuditModulePresentation } from './presentation/audit/audit.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    DatabaseModule,
    CacheModule,
    AuditModule,
    HealthModule,
    WeatherModule,
    AuthModule,
    ProfilesModule,
    MissionsModule,
    AiModule,
    AuditModulePresentation,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtGlobalGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
