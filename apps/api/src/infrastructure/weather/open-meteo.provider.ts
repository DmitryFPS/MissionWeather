import { WeatherProviderPort, WeatherQuery } from '../../application/ports/weather-provider.port';
import { WeatherSnapshot } from '../../domain/entities/weather.entity';

const OPEN_METEO = 'https://api.open-meteo.com/v1';

type OpenMeteoModel = 'ecmwf' | 'gfs' | 'dwd_icon';

export class OpenMeteoProvider implements WeatherProviderPort {
  constructor(
    readonly id: string,
    private readonly model: OpenMeteoModel,
    readonly name: string,
  ) {}

  async healthCheck(): Promise<boolean> {
    try {
      const r = await fetch(`${OPEN_METEO}/forecast?latitude=55.75&longitude=37.62&hourly=wind_speed_10m&forecast_days=1`);
      return r.ok;
    } catch {
      return false;
    }
  }

  async fetch(query: WeatherQuery): Promise<WeatherSnapshot | null> {
    const endpoint =
      this.model === 'ecmwf'
        ? `${OPEN_METEO}/ecmwf`
        : this.model === 'gfs'
          ? `${OPEN_METEO}/gfs`
          : `${OPEN_METEO}/dwd_icon`;

    const params = new URLSearchParams({
      latitude: String(query.lat),
      longitude: String(query.lon),
      hourly: 'wind_speed_10m,wind_gusts_10m,wind_direction_10m,temperature_2m,precipitation,cloud_cover,visibility',
      forecast_days: '2',
      timezone: 'UTC',
      wind_speed_unit: 'ms',
    });

    const res = await fetch(`${endpoint}?${params}`);
    if (!res.ok) return null;
    const data = (await res.json()) as OpenMeteoResponse;
    return this.parse(query, data);
  }

  private parse(query: WeatherQuery, data: OpenMeteoResponse): WeatherSnapshot | null {
    const h = data.hourly;
    if (!h?.time?.length) return null;

    const target = query.timestamp ? new Date(query.timestamp).toISOString().slice(0, 13) : null;
    let idx = 0;
    if (target) {
      const found = h.time.findIndex((t) => t.startsWith(target));
      if (found >= 0) idx = found;
    }

    const wind = h.wind_speed_10m?.[idx];
    if (wind === undefined || wind === null) return null;

    return {
      lat: query.lat,
      lon: query.lon,
      timestamp: h.time[idx],
      windSpeedMs: wind,
      windGustMs: h.wind_gusts_10m?.[idx] ?? undefined,
      windDirectionDeg: h.wind_direction_10m?.[idx] ?? undefined,
      temperatureC: h.temperature_2m?.[idx] ?? undefined,
      precipitationMmH: h.precipitation?.[idx] ?? undefined,
      cloudCoverPct: h.cloud_cover?.[idx] ?? undefined,
      visibilityKm: h.visibility?.[idx] ? h.visibility[idx] / 1000 : undefined,
      sourceId: this.id,
    };
  }
}

interface OpenMeteoResponse {
  hourly?: {
    time: string[];
    wind_speed_10m?: number[];
    wind_gusts_10m?: number[];
    wind_direction_10m?: number[];
    temperature_2m?: number[];
    precipitation?: number[];
    cloud_cover?: number[];
    visibility?: number[];
  };
}

export function createOpenMeteoProviders(): WeatherProviderPort[] {
  return [
    new OpenMeteoProvider('open-meteo-ecmwf', 'ecmwf', 'Open-Meteo ECMWF'),
    new OpenMeteoProvider('open-meteo-gfs', 'gfs', 'Open-Meteo GFS'),
    new OpenMeteoProvider('open-meteo-icon', 'dwd_icon', 'Open-Meteo ICON'),
  ];
}
