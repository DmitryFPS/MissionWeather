import { WeatherProviderPort, WeatherQuery } from '../../application/ports/weather-provider.port';
import { WeatherSnapshot } from '../../domain/entities/weather.entity';

export class VisualCrossingProvider implements WeatherProviderPort {
  readonly id = 'visual-crossing';
  readonly name = 'Visual Crossing Timeline';

  constructor(private readonly apiKey: string) {}

  async healthCheck(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async fetch(query: WeatherQuery): Promise<WeatherSnapshot | null> {
    if (!this.apiKey) return null;
    const loc = `${query.lat},${query.lon}`;
    const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${loc}?unitGroup=metric&key=${this.apiKey}&contentType=json&include=current`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      currentConditions?: {
        datetime: string;
        windspeed: number;
        windgust?: number;
        winddir?: number;
        temp?: number;
        precip?: number;
        cloudcover?: number;
        visibility?: number;
      };
    };
    const c = data.currentConditions;
    if (!c) return null;
    return {
      lat: query.lat,
      lon: query.lon,
      timestamp: c.datetime,
      windSpeedMs: c.windspeed / 3.6,
      windGustMs: c.windgust ? c.windgust / 3.6 : undefined,
      windDirectionDeg: c.winddir,
      temperatureC: c.temp,
      precipitationMmH: c.precip,
      cloudCoverPct: c.cloudcover,
      visibilityKm: c.visibility,
      sourceId: this.id,
    };
  }
}
