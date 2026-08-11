import { Injectable } from '@nestjs/common';
import { Waypoint } from '../entities/user.entity';
import { MissionTimelineService } from './mission-timeline.service';
import { OrlanTthService } from './orlan-tth.service';
import { OpenMeteoOrlanService } from '../../infrastructure/weather/open-meteo-orlan.service';
import { ORLAN10_SPECS } from '../presets/orlan-10.preset';
import { TthAssessment } from '../entities/tth-check.entity';
import { RouteMissionContext } from '../entities/orlan-weather.entity';

export interface RouteForecastRequest {
  waypoints: Waypoint[];
  date: string;
  departureHour: number;
  landingHour: number;
  maxAltitudeM: number;
  timezone?: string;
  cruiseSpeedKmh?: number;
}

export interface RouteHourAssessment {
  hour: number;
  timeLabel: string;
  waypointIndex: number;
  lat: number;
  lon: number;
  tth: TthAssessment;
}

export interface RouteForecastResult {
  date: string;
  departureHour: number;
  landingHour: number;
  maxAltitudeM: number;
  totalDistanceKm: number;
  flightDurationHours: number;
  assessment: TthAssessment;
  hourlyRoute: RouteHourAssessment[];
  problemHours: number[];
  whatIfHours: RouteHourAssessment[];
}

@Injectable()
export class RouteForecastService {
  constructor(
    private readonly timeline: MissionTimelineService,
    private readonly tth: OrlanTthService,
    private readonly meteo: OpenMeteoOrlanService,
  ) {}

  async forecast(req: RouteForecastRequest): Promise<RouteForecastResult> {
    const tz = req.timezone ?? 'Europe/Moscow';
    const speed = req.cruiseSpeedKmh ?? ORLAN10_SPECS.speedCruiseKmh;
    const start = parseLocalStart(req.date, req.departureHour, tz);
    const schedule = this.timeline.buildTimeline(req.waypoints, speed, start);
    const totalKm = schedule.at(-1)?.cumulativeKm ?? 0;
    const durationH = schedule.at(-1)?.etaOffsetHours ?? 0;

    const missionCtx: RouteMissionContext = {
      maxAltitudeM: req.maxAltitudeM,
      totalDistanceKm: totalKm,
      flightDurationHours: durationH,
      cruiseSpeedKmh: speed,
    };

    const hourlyRoute: RouteHourAssessment[] = [];
    const weatherCache = new Map<string, Awaited<ReturnType<OpenMeteoOrlanService['fetchHourly']>>>();

    const loadWeather = async (lat: number, lon: number) => {
      const k = `${lat.toFixed(4)}:${lon.toFixed(4)}`;
      if (!weatherCache.has(k)) {
        weatherCache.set(k, await this.meteo.fetchHourly(lat, lon, req.date, tz));
      }
      return weatherCache.get(k)!;
    };

    const dep = req.departureHour;
    const land = Math.max(req.landingHour, dep);
    for (let h = dep; h <= land; h++) {
      const tp = schedule.find((s) => Math.floor(s.etaOffsetHours + dep) <= h) ?? schedule[0];
      const wpIdx = tp?.waypointIndex ?? 0;
      const wp = req.waypoints[wpIdx] ?? req.waypoints[0];
      const row = await loadWeather(wp.lat, wp.lon);
      if (!row) continue;
      const { surface, aloft } = this.meteo.pickHour(row, h);
      surface.altitudeM = req.maxAltitudeM;
      if (aloft) aloft.altitudeM = req.maxAltitudeM;
      const tthResult = this.tth.evaluate(surface, aloft, missionCtx);
      hourlyRoute.push({
        hour: h,
        timeLabel: `${String(h).padStart(2, '0')}:00`,
        waypointIndex: wpIdx,
        lat: wp.lat,
        lon: wp.lon,
        tth: tthResult,
      });
    }

    // Primary assessment at departure from first waypoint
    const first = req.waypoints[0];
    const firstRow = first ? await loadWeather(first.lat, first.lon) : null;
    let assessment: TthAssessment = {
      status: 'NO_GO',
      checks: [],
      problemIds: ['weather'],
    };
    if (firstRow) {
      const picked = this.meteo.pickHour(firstRow, dep);
      picked.surface.altitudeM = req.maxAltitudeM;
      if (picked.aloft) picked.aloft.altitudeM = req.maxAltitudeM;
      assessment = this.tth.evaluate(picked.surface, picked.aloft, missionCtx);
    }

    const problemHours = hourlyRoute.filter((h) => h.tth.status === 'NO_GO' || h.tth.status === 'CAUTION').map((h) => h.hour);

    // What-if: adjacent hours around departure (±3h within window)
    const whatIfHours: RouteHourAssessment[] = [];
    for (let delta = -3; delta <= 3; delta++) {
      const h = dep + delta;
      if (h < 0 || h > 23 || h === dep) continue;
      const existing = hourlyRoute.find((x) => x.hour === h);
      if (existing) whatIfHours.push(existing);
    }

    return {
      date: req.date,
      departureHour: dep,
      landingHour: land,
      maxAltitudeM: req.maxAltitudeM,
      totalDistanceKm: totalKm,
      flightDurationHours: durationH,
      assessment,
      hourlyRoute,
      problemHours,
      whatIfHours,
    };
  }
}

function parseLocalStart(date: string, hour: number, _tz: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour - 3, 0, 0));
}
