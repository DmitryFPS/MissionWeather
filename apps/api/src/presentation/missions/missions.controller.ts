import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StoreService } from '../../infrastructure/store/store.service';
import { WeatherService } from '../../application/services/weather.service';
import { MissionTimelineService } from '../../domain/services/mission-timeline.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.decorators';

@ApiTags('missions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('missions')
export class MissionsController {
  constructor(
    private readonly store: StoreService,
    private readonly weather: WeatherService,
    private readonly timeline: MissionTimelineService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.store.listMissions(user.id, user.role);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      name: string;
      profileId: string;
      waypoints: { lat: number; lon: number }[];
      plannedDurationHours: number;
    },
  ) {
    return this.store.createMission(user.id, body);
  }

  @Post(':id/evaluate')
  async evaluate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('startTime') startTime?: string,
  ) {
    const mission = await this.store.getMission(id, user.id, user.role);
    const profile = await this.store.getProfile(mission.profileId, user.id, user.role);
    const start = startTime ? new Date(startTime) : new Date();
    const schedule = this.timeline.buildTimeline(mission.waypoints, profile.cruiseSpeedKmh, start);

    const points = await Promise.all(
      schedule.map((tp) =>
        this.weather
          .evaluate(
            { lat: tp.lat, lon: tp.lon, timestamp: tp.etaIso },
            profile.thresholds,
            profile.fusionSourceIds.length ? profile.fusionSourceIds : undefined,
            profile.fusionWeights.length ? profile.fusionWeights : undefined,
          )
          .then((result) => ({ timeline: tp, ...result })),
      ),
    );

    if (points.length === 0) {
      return {
        mission,
        schedule,
        points,
        verdict: { status: 'NO_GO' as const, reasons: [], confidence: 'low' as const },
      };
    }
    const order = { GO: 0, CAUTION: 1, NO_GO: 2 };
    const worst = points.reduce((a, b) =>
      order[(b.verdict?.status ?? 'NO_GO')] > order[(a.verdict?.status ?? 'NO_GO')] ? b : a,
    );
    const durationOk = schedule.at(-1)?.etaOffsetHours ?? 0;
    const durationVerdict =
      durationOk > mission.plannedDurationHours
        ? { status: 'NO_GO' as const, parameter: 'duration', value: durationOk, limit: mission.plannedDurationHours }
        : null;

    return {
      mission,
      schedule,
      points,
      verdict: worst.verdict,
      durationHours: durationOk,
      durationExceeded: Boolean(durationVerdict),
    };
  }
}
