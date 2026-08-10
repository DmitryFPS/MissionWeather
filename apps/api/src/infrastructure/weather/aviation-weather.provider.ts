import { WeatherProviderPort, WeatherQuery } from '../../application/ports/weather-provider.port';
import { WeatherSnapshot } from '../../domain/entities/weather.entity';

const AWC = 'https://aviationweather.gov/api/data';

export class AviationWeatherMetarProvider implements WeatherProviderPort {
  readonly id = 'aviation-weather-metar';
  readonly name = 'AviationWeather.gov METAR';

  async healthCheck(): Promise<boolean> {
    try {
      const r = await fetch(`${AWC}/metar?ids=UUEE&format=json`, {
        headers: { 'User-Agent': 'MissionWeather/0.1 (contact@local)' },
      });
      return r.ok;
    } catch {
      return false;
    }
  }

  async fetch(query: WeatherQuery): Promise<WeatherSnapshot | null> {
    const params = new URLSearchParams({
      format: 'json',
      lat: String(query.lat),
      lon: String(query.lon),
      radius: '100',
      hours: '1',
    });

    const res = await fetch(`${AWC}/metar?${params}`, {
      headers: { 'User-Agent': 'MissionWeather/0.1 (contact@local)' },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as MetarItem[];
    if (!Array.isArray(data) || data.length === 0) return null;

    const nearest = data[0];
    const wspd = nearest.wspd;
    if (wspd === undefined || wspd === null) return null;

    return {
      lat: query.lat,
      lon: query.lon,
      timestamp: nearest.obsTime ?? new Date().toISOString(),
      windSpeedMs: wspd * 0.514444,
      windGustMs: nearest.wgst ? nearest.wgst * 0.514444 : undefined,
      windDirectionDeg: nearest.wdir,
      visibilityKm: nearest.visib,
      temperatureC: nearest.temp,
      sourceId: this.id,
    };
  }
}

interface MetarItem {
  obsTime?: string;
  wspd?: number;
  wgst?: number;
  wdir?: number;
  visib?: number;
  temp?: number;
}
