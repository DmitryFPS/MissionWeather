import { WeatherProviderPort, WeatherQuery } from '../../application/ports/weather-provider.port';
import { WeatherSnapshot } from '../../domain/entities/weather.entity';

export class TomorrowIoProvider implements WeatherProviderPort {
  readonly id = 'tomorrow-io';
  readonly name = 'Tomorrow.io Realtime';

  constructor(private readonly apiKey: string) {}

  async healthCheck(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async fetch(query: WeatherQuery): Promise<WeatherSnapshot | null> {
    if (!this.apiKey) return null;
    const url = `https://api.tomorrow.io/v4/weather/realtime?location=${query.lat},${query.lon}&apikey=${this.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: {
        time: string;
        values?: {
          windSpeed?: number;
          windGust?: number;
          windDirection?: number;
          temperature?: number;
          precipitationIntensity?: number;
          cloudCover?: number;
          visibility?: number;
        };
      };
    };
    const v = data.data?.values;
    if (!v || v.windSpeed === undefined) return null;
    return {
      lat: query.lat,
      lon: query.lon,
      timestamp: data.data!.time,
      windSpeedMs: v.windSpeed,
      windGustMs: v.windGust,
      windDirectionDeg: v.windDirection,
      temperatureC: v.temperature,
      precipitationMmH: v.precipitationIntensity,
      cloudCoverPct: v.cloudCover,
      visibilityKm: v.visibility,
      sourceId: this.id,
    };
  }
}
