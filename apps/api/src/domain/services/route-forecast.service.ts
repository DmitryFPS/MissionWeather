import { Injectable } from '@nestjs/common';
import { Waypoint } from '../entities/user.entity';
import { MissionTimelineService } from './mission-timeline.service';
import { OrlanTthService } from './orlan-tth.service';
import { OpenMeteoOrlanService } from '../../infrastructure/weather/open-meteo-orlan.service';
import { ORLAN10_SPECS } from '../presets/orlan-10.preset';
import { TthAssessment } from '../entities/tth-check.entity';
import { RouteMissionContext } from '../entities/orlan-weather.entity';
import { trackBearingDeg, windComponents } from './wind-component.service';

export interface RouteForecastRequest {
  waypoints: Waypoint[];
  date: string;
  departureHour: number;
  /** Если не задан — вычисляется из дистанции и скорости */
  landingHour?: number;
  maxAltitudeM: number;
  timezone?: string;
  cruiseSpeedKmh?: number;
  /** Модели Open-Meteo для fusion: gfs, ecmwf, icon */
  fusionModels?: string[];
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
  landingHourComputed: boolean;
  maxAltitudeM: number;
  totalDistanceKm: number;
  flightDurationHours: number;
  trackBearingDeg?: number;
  headwindMs?: number;
  crosswindMs?: number;
  fusionSourceCount: number;
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
    const dep = req.departureHour;
    const start = parseLocalStart(req.date, dep, tz);
    const schedule = this.timeline.buildTimeline(req.waypoints, speed, start);
    const totalKm = schedule.at(-1)?.cumulativeKm ?? 0;
    const durationH = schedule.at(-1)?.etaOffsetHours ?? 0;

    const computedLand = Math.min(23, dep + Math.ceil(durationH));
    const landingHourComputed = req.landingHour === undefined;
    const land = landingHourComputed ? computedLand : Math.max(req.landingHour!, dep);

    const bearing =
      req.waypoints.length >= 2
        ? trackBearingDeg(
            req.waypoints[0].lat,
            req.waypoints[0].lon,
            req.waypoints[1].lat,
            req.waypoints[1].lon,
          )
        : undefined;

    const models = req.fusionModels?.length ? req.fusionModels : ['gfs', 'ecmwf', 'icon'];
    let fusionSourceCount = 0;
    let headwindMs: number | undefined;
    let crosswindMs: number | undefined;

    const missionCtx: RouteMissionContext = {
      maxAltitudeM: req.maxAltitudeM,
      totalDistanceKm: totalKm,
      flightDurationHours: durationH,
      cruiseSpeedKmh: speed,
      trackBearingDeg: bearing,
    };

    const hourlyRoute: RouteHourAssessment[] = [];
    const weatherCache = new Map<string, Awaited<ReturnType<OpenMeteoOrlanService['fetchHourlyFused']>>>();

    const loadWeather = async (lat: number, lon: number) => {
      const k = `${lat.toFixed(4)}:${lon.toFixed(4)}`;
      if (!weatherCache.has(k)) {
        const fused = await this.meteo.fetchHourlyFused(lat, lon, req.date, tz, models);
        weatherCache.set(k, fused);
        fusionSourceCount = Math.max(fusionSourceCount, fused?.sourceCount ?? 0);
      }
      return weatherCache.get(k)!;
    };

    for (let h = dep; h <= land; h++) {
      const tp = pickTimelinePoint(schedule, dep, h);
      const wpIdx = tp?.waypointIndex ?? 0;
      const wp = req.waypoints[wpIdx] ?? req.waypoints[0];
      const row = await loadWeather(wp.lat, wp.lon);
      if (!row?.hourly) continue;
      const { surface, aloft } = this.meteo.pickHour(row.hourly, h, req.maxAltitudeM);
      surface.altitudeM = req.maxAltitudeM;

      if (h === dep && bearing !== undefined && aloft?.windSpeedMs !== undefined && aloft.windDirectionDeg !== undefined) {
        const comp = windComponents(aloft.windSpeedMs, aloft.windDirectionDeg, bearing);
        headwindMs = comp.headwindMs;
        crosswindMs = comp.crosswindMs;
        missionCtx.headwindMs = headwindMs;
        missionCtx.crosswindMs = crosswindMs;
      }

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

    const first = req.waypoints[0];
    const firstRow = first ? await loadWeather(first.lat, first.lon) : null;
    let assessment: TthAssessment = {
      status: 'NO_GO',
      checks: [],
      problemIds: ['weather'],
    };
    if (firstRow?.hourly) {
      const picked = this.meteo.pickHour(firstRow.hourly, dep, req.maxAltitudeM);
      picked.surface.altitudeM = req.maxAltitudeM;
      assessment = this.tth.evaluate(picked.surface, picked.aloft, missionCtx);
    }

    const problemHours = hourlyRoute
      .filter((h) => h.tth.status === 'NO_GO' || h.tth.status === 'CAUTION')
      .map((h) => h.hour);

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
      landingHourComputed,
      maxAltitudeM: req.maxAltitudeM,
      totalDistanceKm: totalKm,
      flightDurationHours: durationH,
      trackBearingDeg: bearing,
      headwindMs,
      crosswindMs,
      fusionSourceCount,
      assessment,
      hourlyRoute,
      problemHours,
      whatIfHours,
    };
  }
}

function pickTimelinePoint(
  schedule: ReturnType<MissionTimelineService['buildTimeline']>,
  depHour: number,
  hour: number,
) {
  const offset = hour - depHour;
  let best = schedule[0];
  for (const s of schedule) {
    if (s.etaOffsetHours <= offset) best = s;
  }
  return best;
}

function parseLocalStart(date: string, hour: number, _tz: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour - 3, 0, 0));
}
