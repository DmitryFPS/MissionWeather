import { Injectable } from '@nestjs/common';
import { OrlanWeatherHour } from '../../domain/entities/orlan-weather.entity';
import { ORLAN10_PRESSURE_LEVELS } from '../../domain/presets/orlan-10.preset';

const OPEN_METEO = 'https://api.open-meteo.com/v1';
const OPEN_METEO_FORECAST = `${OPEN_METEO}/forecast`;

const MODEL_ENDPOINTS: Record<string, string> = {
  gfs: `${OPEN_METEO}/gfs`,
  ecmwf: `${OPEN_METEO}/ecmwf`,
  icon: `${OPEN_METEO}/dwd_icon`,
};

const SURFACE_HOURLY = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'dew_point_2m',
  'precipitation',
  'rain',
  'showers',
  'snowfall',
  'precipitation_probability',
  'cloud_cover',
  'cloud_cover_low',
  'cloud_cover_mid',
  'cloud_cover_high',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'surface_pressure',
  'weather_code',
  'visibility',
  'freezing_level_height',
  'cape',
  'lifted_index',
].join(',');

const PRESSURE_SUFFIXES = ['1000', '950', '925', '900', '850', '800', '700', '600', '500', '400', '300', '200', '150'];

const NUMERIC_KEYS = [
  ...SURFACE_HOURLY.split(','),
  ...PRESSURE_SUFFIXES.flatMap((p) => [
    `temperature_${p}hPa`,
    `relative_humidity_${p}hPa`,
    `dew_point_${p}hPa`,
    `wind_speed_${p}hPa`,
    `wind_direction_${p}hPa`,
  ]),
];

function pressureFields(): string {
  const parts: string[] = [];
  for (const p of PRESSURE_SUFFIXES) {
    parts.push(
      `temperature_${p}hPa`,
      `relative_humidity_${p}hPa`,
      `dew_point_${p}hPa`,
      `wind_speed_${p}hPa`,
      `wind_direction_${p}hPa`,
    );
  }
  return parts.join(',');
}

type HourlyRow = Record<string, (number | null)[] | string[]>;

export interface FusedHourlyResult {
  hourly: HourlyRow | null;
  sourceCount: number;
}

@Injectable()
export class OpenMeteoOrlanService {
  private cache = new Map<string, { expires: number; data: FusedHourlyResult }>();

  async fetchHourlyFused(
    lat: number,
    lon: number,
    date: string,
    timezone = 'Europe/Moscow',
    models: string[] = ['gfs', 'ecmwf', 'icon'],
  ): Promise<FusedHourlyResult> {
    const key = `${lat.toFixed(3)}:${lon.toFixed(3)}:${date}:${timezone}:${models.join(',')}`;
    const hit = this.cache.get(key);
    if (hit && hit.expires > Date.now()) return hit.data;

    const rows: HourlyRow[] = [];
    await Promise.all(
      models.map(async (model) => {
        const row = await this.fetchHourlyForModel(lat, lon, date, timezone, model);
        if (row) rows.push(row);
      }),
    );

    const result: FusedHourlyResult = {
      hourly: fuseHourlyRows(rows),
      sourceCount: rows.length,
    };
    this.cache.set(key, { data: result, expires: Date.now() + 15 * 60_000 });
    return result;
  }

  /** @deprecated use fetchHourlyFused */
  async fetchHourly(lat: number, lon: number, date: string, timezone = 'Europe/Moscow'): Promise<HourlyRow | null> {
    const r = await this.fetchHourlyFused(lat, lon, date, timezone, ['gfs']);
    return r.hourly;
  }

  private async fetchHourlyForModel(
    lat: number,
    lon: number,
    date: string,
    timezone: string,
    model: string,
  ): Promise<HourlyRow | null> {
    const endpoint = MODEL_ENDPOINTS[model] ?? OPEN_METEO_FORECAST;
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      hourly: `${SURFACE_HOURLY},${pressureFields()}`,
      start_date: date,
      end_date: date,
      timezone,
      wind_speed_unit: 'ms',
      precipitation_unit: 'mm',
    });

    try {
      const res = await fetch(`${endpoint}?${params}`);
      if (!res.ok) return null;
      const json = (await res.json()) as { hourly?: HourlyRow };
      return json.hourly?.time ? json.hourly : null;
    } catch {
      return null;
    }
  }

  pickHour(
    row: HourlyRow,
    hour: number,
    targetAltitudeM = 3000,
  ): { surface: OrlanWeatherHour; aloft?: OrlanWeatherHour } {
    const times = row.time as string[];
    const idx = Math.min(Math.max(hour, 0), times.length - 1);
    const surface = this.parseSurface(row, idx, 0);
    return { surface, aloft: this.parseAloft(row, idx, targetAltitudeM) };
  }

  parseSurface(row: HourlyRow, idx: number, altitudeM: number): OrlanWeatherHour {
    const num = (k: string) => readNum(row, k, idx);
    return {
      time: String((row.time as string[])[idx]),
      altitudeM,
      windSpeedMs: num('wind_speed_10m'),
      windDirectionDeg: num('wind_direction_10m'),
      windGustMs: num('wind_gusts_10m'),
      temperatureC: num('temperature_2m'),
      apparentTemperatureC: num('apparent_temperature'),
      relativeHumidityPct: num('relative_humidity_2m'),
      dewPointC: num('dew_point_2m'),
      precipitationMmH: num('precipitation'),
      rainMmH: num('rain'),
      showersMmH: num('showers'),
      snowfallMmH: num('snowfall'),
      precipProbabilityPct: num('precipitation_probability'),
      cloudCoverPct: num('cloud_cover'),
      cloudCoverLowPct: num('cloud_cover_low'),
      cloudCoverMidPct: num('cloud_cover_mid'),
      cloudCoverHighPct: num('cloud_cover_high'),
      visibilityM: num('visibility'),
      surfacePressureHpa: num('surface_pressure'),
      weatherCode: num('weather_code'),
      freezingLevelM: num('freezing_level_height'),
      cape: num('cape'),
      liftedIndex: num('lifted_index'),
    };
  }

  parseAloft(row: HourlyRow, idx: number, targetAltitudeM: number): OrlanWeatherHour | undefined {
    const level = nearestPressureLevel(targetAltitudeM);
    if (!level) return undefined;
    const p = level.id === 'surface' ? '1000' : level.id.replace('h', '');
    const num = (k: string) => readNum(row, k, idx);
    return {
      time: String((row.time as string[])[idx]),
      altitudeM: level.meters,
      windSpeedMs: num(`wind_speed_${p}hPa`),
      windDirectionDeg: num(`wind_direction_${p}hPa`),
      temperatureC: num(`temperature_${p}hPa`),
      relativeHumidityPct: num(`relative_humidity_${p}hPa`),
      dewPointC: num(`dew_point_${p}hPa`),
    };
  }
}

function readNum(row: HourlyRow, key: string, idx: number): number | undefined {
  const arr = row[key] as (number | null)[] | undefined;
  const v = arr?.[idx];
  return v === null || v === undefined ? undefined : v;
}

function fuseHourlyRows(rows: HourlyRow[]): HourlyRow | null {
  if (!rows.length) return null;
  const base = rows[0];
  const times = base.time as string[];
  if (!times?.length) return null;

  const fused: HourlyRow = { time: times };
  for (const key of NUMERIC_KEYS) {
    const arrays = rows.map((r) => r[key] as (number | null)[] | undefined).filter(Boolean) as (number | null)[][];
    if (!arrays.length) continue;
    fused[key] = times.map((_, i) => {
      const vals = arrays.map((a) => a[i]).filter((v): v is number => v !== null && v !== undefined);
      if (!vals.length) return null;
      if (key.includes('wind_direction')) return circularMean(vals);
      return vals.reduce((s, v) => s + v, 0) / vals.length;
    });
  }
  return fused;
}

function circularMean(degrees: number[]): number {
  let sin = 0;
  let cos = 0;
  for (const d of degrees) {
    const r = (d * Math.PI) / 180;
    sin += Math.sin(r);
    cos += Math.cos(r);
  }
  return ((Math.atan2(sin, cos) * 180) / Math.PI + 360) % 360;
}

export function nearestPressureLevel(altitudeM: number) {
  let best = ORLAN10_PRESSURE_LEVELS[0];
  let bestDiff = Math.abs(altitudeM - best.meters);
  for (const l of ORLAN10_PRESSURE_LEVELS) {
    const d = Math.abs(altitudeM - l.meters);
    if (d < bestDiff) {
      best = l;
      bestDiff = d;
    }
  }
  return best;
}
