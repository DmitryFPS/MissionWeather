import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StoreService } from '../../infrastructure/store/store.service';
import { WeatherService } from '../../application/services/weather.service';
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
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.store.listMissions(user.id, user.role);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: { name: string; profileId: string; waypoints: { lat: number; lon: number }[]; plannedDurationHours: number }) {
    return this.store.createMission(user.id, body);
  }

  @Post(':id/evaluate')
  async evaluate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const mission = this.store.getMission(id, user.id, user.role);
    const profile = this.store.getProfile(mission.profileId, user.id, user.role);
    const points = await Promise.all(
      mission.waypoints.map((wp) =>
        this.weather.evaluate(
          { lat: wp.lat, lon: wp.lon },
          profile.thresholds,
          profile.fusionSourceIds.length ? profile.fusionSourceIds : undefined,
          profile.fusionWeights.length ? profile.fusionWeights : undefined,
        ),
      ),
    );
    if (points.length === 0) {
      return { mission, points, verdict: { status: 'NO_GO' as const, reasons: [], confidence: 'low' as const } };
    }
    const order = { GO: 0, CAUTION: 1, NO_GO: 2 };
    const worst = points.reduce((a, b) =>
      order[(b.verdict?.status ?? 'NO_GO')] > order[(a.verdict?.status ?? 'NO_GO')] ? b : a,
    );
    return { mission, points, verdict: worst.verdict };
  }
}
