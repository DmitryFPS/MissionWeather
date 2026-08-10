import { WeatherProviderPort, WeatherQuery } from '../../application/ports/weather-provider.port';
import { WeatherSnapshot } from '../../domain/entities/weather.entity';

export class MetNorwayProvider implements WeatherProviderPort {
  readonly id = 'met-norway';
  readonly name = 'MET Norway Locationforecast';

  async healthCheck(): Promise<boolean> {
    try {
      const r = await fetch('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=55.75&lon=37.62', {
        headers: { 'User-Agent': 'MissionWeather/1.0 github.com/DmitryFPS/MissionWeather' },
      });
      return r.ok;
    } catch {
      return false;
    }
  }

  async fetch(query: WeatherQuery): Promise<WeatherSnapshot | null> {
    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${query.lat}&lon=${query.lon}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MissionWeather/1.0 github.com/DmitryFPS/MissionWeather' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      properties?: {
        timeseries?: {
          time: string;
          data?: {
            instant?: {
              details?: {
                wind_speed?: number;
                wind_from_direction?: number;
                air_temperature?: number;
                cloud_area_fraction?: number;
              };
            };
            next_1_hours?: { summary?: { symbol_code?: string } };
          };
        }[];
      };
    };
    const ts = data.properties?.timeseries?.[0];
    const d = ts?.data?.instant?.details;
    if (!ts || !d?.wind_speed) return null;
    return {
      lat: query.lat,
      lon: query.lon,
      timestamp: ts.time,
      windSpeedMs: d.wind_speed,
      windDirectionDeg: d.wind_from_direction,
      temperatureC: d.air_temperature,
      cloudCoverPct: d.cloud_area_fraction,
      sourceId: this.id,
    };
  }
}
