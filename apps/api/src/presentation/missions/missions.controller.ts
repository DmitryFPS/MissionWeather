import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StoreService } from '../../infrastructure/store/store.service';
import { WeatherService } from '../../application/services/weather.service';
import { MissionTimelineService } from '../../domain/services/mission-timeline.service';
import { normalizeThresholds } from '../../domain/services/thresholds.util';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.decorators';
import { RunHistoryService } from '../../infrastructure/store/run-history.service';
import { AuditService } from '../../infrastructure/audit/audit.service';

@ApiTags('missions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('missions')
export class MissionsController {
  constructor(
    private readonly store: StoreService,
    private readonly weather: WeatherService,
    private readonly timeline: MissionTimelineService,
    private readonly history: RunHistoryService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.store.listMissions(user.id, user.role);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      name: string;
      profileId: string;
      waypoints: { lat: number; lon: number; altitudeAglM?: number }[];
      plannedDurationHours: number;
    },
  ) {
    const m = await this.store.createMission(user.id, body);
    await this.audit.log(user.id, 'mission.create', 'mission', m.id, { name: m.name });
    return m;
  }

  @Put(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      profileId: string;
      waypoints: { lat: number; lon: number; altitudeAglM?: number }[];
      plannedDurationHours: number;
    }>,
  ) {
    const m = await this.store.updateMission(id, user.id, user.role, body);
    await this.audit.log(user.id, 'mission.update', 'mission', id);
    return m;
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.store.deleteMission(id, user.id, user.role);
    await this.audit.log(user.id, 'mission.delete', 'mission', id);
    return { ok: true };
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
    const thresholds = normalizeThresholds(profile.thresholds);
    const schedule = this.timeline.buildTimeline(mission.waypoints, profile.cruiseSpeedKmh, start);

    const points = await Promise.all(
      schedule.map((tp) =>
        this.weather
          .evaluate(
            { lat: tp.lat, lon: tp.lon, timestamp: tp.etaIso },
            thresholds,
            profile.fusionSourceIds.length ? profile.fusionSourceIds : undefined,
            profile.fusionWeights.length ? profile.fusionWeights : undefined,
          )
          .then((result) => ({ timeline: tp, ...result })),
      ),
    );

    if (points.length === 0) {
      const empty = {
        mission,
        schedule,
        points,
        verdict: { status: 'NO_GO' as const, reasons: [], confidence: 'low' as const },
      };
      return empty;
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

    const payload = {
      mission,
      schedule,
      points,
      verdict: worst.verdict,
      durationHours: durationOk,
      durationExceeded: Boolean(durationVerdict),
    };

    await this.history.save(user.id, 'mission_evaluate', { missionId: id, startTime }, payload, {
      name: mission.name,
      verdict: worst.verdict?.status,
    });
    await this.audit.log(user.id, 'mission.evaluate', 'mission', id, {
      verdict: worst.verdict?.status,
    });

    return payload;
  }
}
