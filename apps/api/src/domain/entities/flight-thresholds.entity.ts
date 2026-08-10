export interface ThresholdRange {
  goMax?: number;
  cautionMax?: number;
  goMin?: number;
  cautionMin?: number;
}

export interface FlightThresholds {
  windSpeedMs: ThresholdRange;
  windGustMs: ThresholdRange;
  visibilityKm: ThresholdRange;
  precipitationMmH: ThresholdRange;
  temperatureC: ThresholdRange;
  /** Разброс источников по ветру (м/с), выше — CAUTION */
  maxSourceSpreadMs?: number;
}

export const EMPTY_THRESHOLDS: FlightThresholds = {
  windSpeedMs: {},
  windGustMs: {},
  visibilityKm: {},
  precipitationMmH: {},
  temperatureC: {},
};

export function thresholdsConfigured(t: FlightThresholds): boolean {
  return (
    t.windSpeedMs.goMax !== undefined ||
    t.windGustMs.goMax !== undefined ||
    t.visibilityKm.goMin !== undefined
  );
}
