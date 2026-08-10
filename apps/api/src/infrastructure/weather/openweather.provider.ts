import { WeatherProviderPort, WeatherQuery } from '../../application/ports/weather-provider.port';
import { WeatherSnapshot } from '../../domain/entities/weather.entity';

export class OpenWeatherProvider implements WeatherProviderPort {
  readonly id = 'openweather';
  readonly name = 'OpenWeather One Call 3.0';

  constructor(private readonly apiKey: string) {}

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) return false;
    return true;
  }

  async fetch(query: WeatherQuery): Promise<WeatherSnapshot | null> {
    if (!this.apiKey) return null;
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${query.lat}&lon=${query.lon}&exclude=minutely,daily,alerts&units=metric&appid=${this.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current?: {
        dt: number;
        wind_speed: number;
        wind_gust?: number;
        wind_deg?: number;
        temp?: number;
        clouds?: number;
        visibility?: number;
      };
    };
    const c = data.current;
    if (!c) return null;
    return {
      lat: query.lat,
      lon: query.lon,
      timestamp: new Date(c.dt * 1000).toISOString(),
      windSpeedMs: c.wind_speed,
      windGustMs: c.wind_gust,
      windDirectionDeg: c.wind_deg,
      temperatureC: c.temp,
      cloudCoverPct: c.clouds,
      visibilityKm: c.visibility ? c.visibility / 1000 : undefined,
      sourceId: this.id,
    };
  }
}
