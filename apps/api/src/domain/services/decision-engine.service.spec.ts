import { DecisionEngine } from './decision-engine.service';
import { FusionService } from './fusion.service';
import { FusedWeatherPoint } from '../entities/weather.entity';
import { FlightThresholds } from '../entities/flight-thresholds.entity';

describe('DecisionEngine', () => {
  const engine = new DecisionEngine();

  const basePoint = (wind: number, overrides: Partial<FusedWeatherPoint> = {}): FusedWeatherPoint => ({
    lat: 55.75,
    lon: 37.62,
    timestamp: '2026-08-10T12:00:00Z',
    windSpeedMs: wind,
    sourceCount: 3,
    spread: { windSpeedMs: { min: wind - 0.5, max: wind + 0.5, avg: wind } },
    confidence: 'high',
    ...overrides,
  });

  const thresholds: FlightThresholds = {
    windSpeedMs: { goMax: 8, cautionMax: 12 },
    windGustMs: { goMax: 10, cautionMax: 14 },
    visibilityKm: { goMin: 3, cautionMin: 1 },
    precipitationMmH: { goMax: 0, cautionMax: 0.5 },
    temperatureC: { goMin: 0, goMax: 35 },
    maxSourceSpreadMs: 3,
  };

  it('returns GO when all within limits', () => {
    const v = engine.evaluatePoint(basePoint(5), thresholds);
    expect(v.status).toBe('GO');
  });

  it('returns CAUTION for borderline wind', () => {
    const v = engine.evaluatePoint(basePoint(10), thresholds);
    expect(v.status).toBe('CAUTION');
  });

  it('returns NO_GO for excessive wind', () => {
    const v = engine.evaluatePoint(basePoint(15), thresholds);
    expect(v.status).toBe('NO_GO');
  });

  it('returns NO_GO for low visibility', () => {
    const v = engine.evaluatePoint(basePoint(5, { visibilityKm: 0.5 }), thresholds);
    expect(v.status).toBe('NO_GO');
  });

  it('handles partial thresholds with gust data', () => {
    const partial: FlightThresholds = {
      windSpeedMs: { goMax: 8, cautionMax: 12 },
      windGustMs: {},
      visibilityKm: {},
      precipitationMmH: {},
      temperatureC: {},
    };
    const v = engine.evaluatePoint(basePoint(5, { windGustMs: 9 }), partial);
    expect(v.status).toBe('GO');
  });

  it('mission verdict uses worst segment', () => {
    const points = [basePoint(5), basePoint(14), basePoint(6)];
    const v = engine.evaluateMission(points, thresholds);
    expect(v.status).toBe('NO_GO');
  });
});

describe('FusionService', () => {
  const fusion = new FusionService();

  it('averages weighted wind speed', () => {
    const result = fusion.fuse(
      [
        { lat: 1, lon: 2, timestamp: 't', windSpeedMs: 4, sourceId: 'a' },
        { lat: 1, lon: 2, timestamp: 't', windSpeedMs: 8, sourceId: 'b' },
      ],
      [
        { sourceId: 'a', weight: 1 },
        { sourceId: 'b', weight: 1 },
      ],
    );
    expect(result?.windSpeedMs).toBe(6);
    expect(result?.spread.windSpeedMs.min).toBe(4);
    expect(result?.spread.windSpeedMs.max).toBe(8);
  });

  it('low confidence on large spread', () => {
    const result = fusion.fuse(
      [
        { lat: 1, lon: 2, timestamp: 't', windSpeedMs: 2, sourceId: 'a' },
        { lat: 1, lon: 2, timestamp: 't', windSpeedMs: 10, sourceId: 'b' },
      ],
      [{ sourceId: 'a', weight: 1 }, { sourceId: 'b', weight: 1 }],
    );
    expect(result?.confidence).toBe('low');
  });
});
