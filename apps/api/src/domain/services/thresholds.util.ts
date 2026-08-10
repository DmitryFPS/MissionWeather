import { FlightThresholds, EMPTY_THRESHOLDS } from '../entities/flight-thresholds.entity';

export function normalizeThresholds(input?: Partial<FlightThresholds> | null): FlightThresholds {
  if (!input) return { ...EMPTY_THRESHOLDS };
  return {
    windSpeedMs: { ...EMPTY_THRESHOLDS.windSpeedMs, ...input.windSpeedMs },
    windGustMs: { ...EMPTY_THRESHOLDS.windGustMs, ...input.windGustMs },
    visibilityKm: { ...EMPTY_THRESHOLDS.visibilityKm, ...input.visibilityKm },
    precipitationMmH: { ...EMPTY_THRESHOLDS.precipitationMmH, ...input.precipitationMmH },
    temperatureC: { ...EMPTY_THRESHOLDS.temperatureC, ...input.temperatureC },
    maxSourceSpreadMs: input.maxSourceSpreadMs,
  };
}
