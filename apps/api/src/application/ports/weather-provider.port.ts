import { WeatherSnapshot } from '../../domain/entities/weather.entity';

export interface WeatherQuery {
  lat: number;
  lon: number;
  timestamp?: string;
}

export interface WeatherProviderPort {
  readonly id: string;
  readonly name: string;
  fetch(query: WeatherQuery): Promise<WeatherSnapshot | null>;
  healthCheck(): Promise<boolean>;
}

export const WEATHER_PROVIDER_IDS = [
  'open-meteo-ecmwf',
  'open-meteo-gfs',
  'open-meteo-icon',
  'yandex-weather',
  'aviation-weather-metar',
  'checkwx-metar',
] as const;

export type WeatherProviderId = (typeof WEATHER_PROVIDER_IDS)[number];
