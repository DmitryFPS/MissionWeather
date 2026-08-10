import { WeatherProviderPort, WeatherQuery } from '../../application/ports/weather-provider.port';
import { WeatherSnapshot } from '../../domain/entities/weather.entity';

export class YandexWeatherProvider implements WeatherProviderPort {
  readonly id = 'yandex-weather';
  readonly name = 'Yandex Weather';

  constructor(private readonly apiKey: string) {}

  async healthCheck(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async fetch(query: WeatherQuery): Promise<WeatherSnapshot | null> {
    if (!this.apiKey) return null;

    const url = `https://api.weather.yandex.ru/v2/forecast?lat=${query.lat}&lon=${query.lon}&lang=ru_RU&limit=1&hours=true`;
    const res = await fetch(url, { headers: { 'X-Yandex-Weather-Key': this.apiKey } });
    if (!res.ok) return null;

    const data = (await res.json()) as YandexResponse;
    const fact = data.fact;
    if (!fact) return null;

    return {
      lat: query.lat,
      lon: query.lon,
      timestamp: new Date().toISOString(),
      windSpeedMs: fact.wind_speed ?? 0,
      windGustMs: undefined,
      windDirectionDeg: fact.wind_angle,
      temperatureC: fact.temp,
      precipitationMmH: (fact.prec_type ?? 0) > 0 ? 0.1 : 0,
      visibilityKm: fact.visibility ? fact.visibility / 1000 : undefined,
      cloudCoverPct: fact.cloudness !== undefined ? fact.cloudness * 100 : undefined,
      sourceId: this.id,
    };
  }
}

interface YandexResponse {
  fact?: {
    temp?: number;
    wind_speed?: number;
    wind_angle?: number;
    visibility?: number;
    cloudness?: number;
    prec_type?: number;
  };
}
