export interface WeatherSnapshot {
  lat: number;
  lon: number;
  timestamp: string;
  windSpeedMs: number;
  windGustMs?: number;
  windDirectionDeg?: number;
  visibilityKm?: number;
  precipitationMmH?: number;
  temperatureC?: number;
  cloudCoverPct?: number;
  sourceId: string;
}

export interface FusedWeatherPoint {
  lat: number;
  lon: number;
  timestamp: string;
  windSpeedMs: number;
  windGustMs?: number;
  windDirectionDeg?: number;
  visibilityKm?: number;
  precipitationMmH?: number;
  temperatureC?: number;
  cloudCoverPct?: number;
  sourceCount: number;
  spread: {
    windSpeedMs: { min: number; max: number; avg: number };
  };
  confidence: 'high' | 'medium' | 'low';
}
