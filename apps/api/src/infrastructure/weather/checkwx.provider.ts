import { WeatherProviderPort, WeatherQuery } from '../../application/ports/weather-provider.port';
import { WeatherSnapshot } from '../../domain/entities/weather.entity';

const CHECKWX = 'https://api.checkwx.com';

export class CheckWxMetarProvider implements WeatherProviderPort {
  readonly id = 'checkwx-metar';
  readonly name = 'CheckWX METAR';

  constructor(private readonly apiKey: string) {}

  async healthCheck(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async fetch(query: WeatherQuery): Promise<WeatherSnapshot | null> {
    if (!this.apiKey) return null;

    const res = await fetch(
      `${CHECKWX}/metar/lat/${query.lat}/lon/${query.lon}/radius/50/decoded`,
      { headers: { 'X-API-Key': this.apiKey } },
    );
    if (!res.ok) return null;

    const body = (await res.json()) as { data?: CheckWxMetar[] };
    const item = body.data?.[0];
    if (!item) return null;

    const wind = item.wind?.speed?.mps;
    if (wind === undefined) return null;

    return {
      lat: query.lat,
      lon: query.lon,
      timestamp: item.observed ?? new Date().toISOString(),
      windSpeedMs: wind,
      windGustMs: item.wind?.gust?.mps,
      windDirectionDeg: item.wind?.degrees,
      visibilityKm: item.visibility?.meters ? item.visibility.meters / 1000 : undefined,
      temperatureC: item.temperature?.celsius,
      sourceId: this.id,
    };
  }
}

interface CheckWxMetar {
  observed?: string;
  wind?: { speed?: { mps?: number }; gust?: { mps?: number }; degrees?: number };
  visibility?: { meters?: number };
  temperature?: { celsius?: number };
}
