import { WeatherSnapshot, FusedWeatherPoint } from '../entities/weather.entity';

export interface SourceWeight {
  sourceId: string;
  weight: number;
}

export class FusionService {
  fuse(snapshots: WeatherSnapshot[], weights: SourceWeight[]): FusedWeatherPoint | null {
    if (snapshots.length === 0) return null;

    const weightMap = new Map(weights.map((w) => [w.sourceId, w.weight]));
    let totalWeight = 0;
    let windSum = 0;
    const windValues: number[] = [];

    let lat = 0;
    let lon = 0;
    let timestamp = snapshots[0].timestamp;

    for (const s of snapshots) {
      const w = weightMap.get(s.sourceId) ?? 1;
      totalWeight += w;
      windSum += s.windSpeedMs * w;
      windValues.push(s.windSpeedMs);
      lat = s.lat;
      lon = s.lon;
    }

    if (totalWeight === 0) return null;

    const avg = windSum / totalWeight;
    const min = Math.min(...windValues);
    const max = Math.max(...windValues);
    const spread = max - min;

    let confidence: 'high' | 'medium' | 'low' = 'high';
    if (spread > 3) confidence = 'low';
    else if (spread > 1.5) confidence = 'medium';

    const avgField = (pick: (s: WeatherSnapshot) => number | undefined): number | undefined => {
      let sum = 0;
      let tw = 0;
      for (const s of snapshots) {
        const v = pick(s);
        if (v === undefined) continue;
        const w = weightMap.get(s.sourceId) ?? 1;
        sum += v * w;
        tw += w;
      }
      return tw > 0 ? sum / tw : undefined;
    };

    return {
      lat,
      lon,
      timestamp,
      windSpeedMs: avg,
      windGustMs: avgField((s) => s.windGustMs),
      visibilityKm: avgField((s) => s.visibilityKm),
      precipitationMmH: avgField((s) => s.precipitationMmH),
      temperatureC: avgField((s) => s.temperatureC),
      cloudCoverPct: avgField((s) => s.cloudCoverPct),
      sourceCount: snapshots.length,
      spread: { windSpeedMs: { min, max, avg } },
      confidence,
    };
  }
}
