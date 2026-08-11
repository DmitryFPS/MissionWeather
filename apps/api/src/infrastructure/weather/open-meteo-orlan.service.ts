import { Injectable } from '@nestjs/common';
import { OrlanWeatherHour } from '../../domain/entities/orlan-weather.entity';
import { ORLAN10_PRESSURE_LEVELS } from '../../domain/presets/orlan-10.preset';

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';

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

@Injectable()
export class OpenMeteoOrlanService {
  private cache = new Map<string, { expires: number; data: HourlyRow }>();

  async fetchHourly(
    lat: number,
    lon: number,
    date: string,
    timezone = 'Europe/Moscow',
  ): Promise<HourlyRow | null> {
    const key = `${lat.toFixed(3)}:${lon.toFixed(3)}:${date}:${timezone}`;
    const hit = this.cache.get(key);
    if (hit && hit.expires > Date.now()) return hit.data;

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

    const res = await fetch(`${OPEN_METEO}?${params}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { hourly?: HourlyRow };
    if (!json.hourly?.time) return null;
    this.cache.set(key, { data: json.hourly, expires: Date.now() + 15 * 60_000 });
    return json.hourly;
  }

  pickHour(row: HourlyRow, hour: number): { surface: OrlanWeatherHour; aloft?: OrlanWeatherHour } {
    const times = row.time as string[];
    const idx = Math.min(Math.max(hour, 0), times.length - 1);
    const surface = this.parseSurface(row, idx, 0);
    return { surface, aloft: this.parseAloft(row, idx, surface.altitudeM) };
  }

  parseSurface(row: HourlyRow, idx: number, altitudeM: number): OrlanWeatherHour {
    const num = (k: string) => {
      const arr = row[k] as (number | null)[] | undefined;
      const v = arr?.[idx];
      return v === null || v === undefined ? undefined : v;
    };
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
      visibilityM: num('visibility') ?? undefined,
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
    const p = level.id.replace('h', '');
    const num = (k: string) => {
      const arr = row[k] as (number | null)[] | undefined;
      const v = arr?.[idx];
      return v === null || v === undefined ? undefined : v;
    };
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
