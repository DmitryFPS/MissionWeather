import { FusedWeatherPoint } from '../entities/weather.entity';
import { FlightThresholds } from '../entities/flight-thresholds.entity';
import { Verdict, VerdictReason, VerdictStatus } from '../entities/verdict.entity';

function evaluateUpper(
  param: string,
  value: number,
  range: { goMax?: number; cautionMax?: number },
  ctx?: { segmentIndex?: number; hourOffset?: number },
): VerdictStatus | null {
  if (range.goMax !== undefined && value <= range.goMax) return 'GO';
  if (range.cautionMax !== undefined && value <= range.cautionMax) return 'CAUTION';
  if (range.goMax !== undefined || range.cautionMax !== undefined) {
    return 'NO_GO';
  }
  return null;
}

function evaluateLower(
  param: string,
  value: number,
  range: { goMin?: number; cautionMin?: number },
): VerdictStatus | null {
  if (range.goMin !== undefined && value >= range.goMin) return 'GO';
  if (range.cautionMin !== undefined && value >= range.cautionMin) return 'CAUTION';
  if (range.goMin !== undefined || range.cautionMin !== undefined) return 'NO_GO';
  return null;
}

function worst(a: VerdictStatus, b: VerdictStatus): VerdictStatus {
  const order: VerdictStatus[] = ['GO', 'CAUTION', 'NO_GO'];
  return order[Math.max(order.indexOf(a), order.indexOf(b))] ?? 'NO_GO';
}

export class DecisionEngine {
  evaluatePoint(
    point: FusedWeatherPoint,
    thresholds: FlightThresholds,
    ctx?: { segmentIndex?: number; hourOffset?: number },
  ): Verdict {
    let status: VerdictStatus = 'GO';
    const reasons: VerdictReason[] = [];

    const windStatus = evaluateUpper('windSpeedMs', point.windSpeedMs, thresholds.windSpeedMs, ctx);
    if (windStatus && windStatus !== 'GO') {
      status = worst(status, windStatus);
      reasons.push({
        parameter: 'windSpeedMs',
        value: point.windSpeedMs,
        limit: `go<=${thresholds.windSpeedMs.goMax}, caution<=${thresholds.windSpeedMs.cautionMax}`,
        ...ctx,
      });
    }

    if (point.windGustMs !== undefined) {
      const gustStatus = evaluateUpper('windGustMs', point.windGustMs, thresholds.windGustMs, ctx);
      if (gustStatus && gustStatus !== 'GO') {
        status = worst(status, gustStatus);
        reasons.push({
          parameter: 'windGustMs',
          value: point.windGustMs,
          limit: `go<=${thresholds.windGustMs.goMax}`,
          ...ctx,
        });
      }
    }

    if (point.visibilityKm !== undefined) {
      const visStatus = evaluateLower('visibilityKm', point.visibilityKm, thresholds.visibilityKm);
      if (visStatus && visStatus !== 'GO') {
        status = worst(status, visStatus);
        reasons.push({
          parameter: 'visibilityKm',
          value: point.visibilityKm,
          limit: `go>=${thresholds.visibilityKm.goMin}`,
          ...ctx,
        });
      }
    }

    if (point.precipitationMmH !== undefined) {
      const prStatus = evaluateUpper(
        'precipitationMmH',
        point.precipitationMmH,
        thresholds.precipitationMmH,
        ctx,
      );
      if (prStatus && prStatus !== 'GO') {
        status = worst(status, prStatus);
        reasons.push({
          parameter: 'precipitationMmH',
          value: point.precipitationMmH,
          limit: `go<=${thresholds.precipitationMmH.goMax}`,
          ...ctx,
        });
      }
    }

    if (point.temperatureC !== undefined) {
      const t = point.temperatureC;
      const r = thresholds.temperatureC;
      let tStatus: VerdictStatus | null = null;
      if (r.goMin !== undefined && t < r.goMin) {
        tStatus = r.cautionMin !== undefined && t >= r.cautionMin ? 'CAUTION' : 'NO_GO';
      } else if (r.goMax !== undefined && t > r.goMax) {
        tStatus = r.cautionMax !== undefined && t <= r.cautionMax ? 'CAUTION' : 'NO_GO';
      } else if (r.goMin !== undefined || r.goMax !== undefined) {
        tStatus = 'GO';
      }
      if (tStatus && tStatus !== 'GO') {
        status = worst(status, tStatus);
        reasons.push({
          parameter: 'temperatureC',
          value: t,
          limit: `${r.goMin ?? '—'}–${r.goMax ?? '—'}`,
          ...ctx,
        });
      }
    }

    if (
      thresholds.maxSourceSpreadMs !== undefined &&
      point.spread.windSpeedMs.max - point.spread.windSpeedMs.min > thresholds.maxSourceSpreadMs
    ) {
      status = worst(status, 'CAUTION');
      reasons.push({
        parameter: 'sourceSpread',
        value: point.spread.windSpeedMs.max - point.spread.windSpeedMs.min,
        limit: `<=${thresholds.maxSourceSpreadMs}`,
        ...ctx,
      });
    }

    if (point.confidence === 'low') {
      status = worst(status, 'CAUTION');
    }

    return {
      status,
      reasons,
      confidence: point.confidence,
      sourceSpread: { windSpeedMs: point.spread.windSpeedMs },
    };
  }

  evaluateMission(points: FusedWeatherPoint[], thresholds: FlightThresholds): Verdict {
    if (points.length === 0) {
      return { status: 'NO_GO', reasons: [{ parameter: 'mission', value: 'empty', limit: 'points>0' }], confidence: 'low' };
    }

    let worstVerdict: Verdict = this.evaluatePoint(points[0], thresholds, { segmentIndex: 0 });
    for (let i = 1; i < points.length; i++) {
      const v = this.evaluatePoint(points[i], thresholds, { segmentIndex: i });
      if (v.status === 'NO_GO') return v;
      if (v.status === 'CAUTION' && worstVerdict.status === 'GO') worstVerdict = v;
    }
    return worstVerdict;
  }
}
