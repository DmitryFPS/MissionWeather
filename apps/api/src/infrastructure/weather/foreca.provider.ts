import { WeatherProviderPort, WeatherQuery } from '../../application/ports/weather-provider.port';
import { WeatherSnapshot } from '../../domain/entities/weather.entity';

export class ForecaProvider implements WeatherProviderPort {
  readonly id = 'foreca';
  readonly name = 'Foreca Weather API';

  constructor(private readonly apiKey: string) {}

  async healthCheck(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async fetch(query: WeatherQuery): Promise<WeatherSnapshot | null> {
    if (!this.apiKey) return null;
    const url = `https://pfa.foreca.com/api/v1/current/${query.lat}/${query.lon}?token=${this.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current?: {
        time: string;
        windSpeed?: number;
        windGust?: number;
        windDir?: number;
        temperature?: number;
        precipRate?: number;
        cloudiness?: number;
        visibility?: number;
      };
    };
    const c = data.current;
    if (!c?.windSpeed) return null;
    return {
      lat: query.lat,
      lon: query.lon,
      timestamp: c.time,
      windSpeedMs: c.windSpeed,
      windGustMs: c.windGust,
      windDirectionDeg: c.windDir,
      temperatureC: c.temperature,
      precipitationMmH: c.precipRate,
      cloudCoverPct: c.cloudiness,
      visibilityKm: c.visibility,
      sourceId: this.id,
    };
  }
}
