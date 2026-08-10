import { WeatherProviderPort, WeatherQuery } from '../../application/ports/weather-provider.port';
import { WeatherSnapshot } from '../../domain/entities/weather.entity';

export class WeatherbitProvider implements WeatherProviderPort {
  readonly id = 'weatherbit';
  readonly name = 'Weatherbit Current';

  constructor(private readonly apiKey: string) {}

  async healthCheck(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async fetch(query: WeatherQuery): Promise<WeatherSnapshot | null> {
    if (!this.apiKey) return null;
    const url = `https://api.weatherbit.io/v2.0/current?lat=${query.lat}&lon=${query.lon}&key=${this.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: {
        ob_time: string;
        wind_spd: number;
        wind_gust_spd?: number;
        wind_dir?: number;
        temp?: number;
        precip?: number;
        clouds?: number;
        vis?: number;
      }[];
    };
    const c = data.data?.[0];
    if (!c) return null;
    return {
      lat: query.lat,
      lon: query.lon,
      timestamp: c.ob_time,
      windSpeedMs: c.wind_spd,
      windGustMs: c.wind_gust_spd,
      windDirectionDeg: c.wind_dir,
      temperatureC: c.temp,
      precipitationMmH: c.precip,
      cloudCoverPct: c.clouds,
      visibilityKm: c.vis,
      sourceId: this.id,
    };
  }
}
