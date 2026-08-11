import { Injectable } from '@nestjs/common';
import { RouteForecastService, RouteForecastRequest } from './route-forecast.service';
import { RunHistoryService } from '../../infrastructure/store/run-history.service';

export interface ScenarioCompareRequest extends RouteForecastRequest {
  name?: string;
  departureHours: number[];
}

export interface ScenarioCompareResult {
  scenarios: Array<{
    departureHour: number;
    status: string;
    flightDurationHours: number;
    totalDistanceKm: number;
    headwindMs?: number;
    crosswindMs?: number;
    problemHours: number[];
  }>;
  bestHour: number | null;
  worstHour: number | null;
}

@Injectable()
export class ScenarioService {
  constructor(
    private readonly forecast: RouteForecastService,
    private readonly history: RunHistoryService,
  ) {}

  async compare(req: ScenarioCompareRequest, ownerId: string): Promise<ScenarioCompareResult> {
    const scenarios = await Promise.all(
      req.departureHours.map(async (departureHour) => {
        const result = await this.forecast.forecast({ ...req, departureHour, landingHour: undefined });
        return {
          departureHour,
          status: result.assessment.status,
          flightDurationHours: result.flightDurationHours,
          totalDistanceKm: result.totalDistanceKm,
          headwindMs: result.headwindMs,
          crosswindMs: result.crosswindMs,
          problemHours: result.problemHours,
          full: result,
        };
      }),
    );

    const order = { GO: 0, CAUTION: 1, NO_GO: 2, INFO: 3 };
    const sorted = [...scenarios].sort(
      (a, b) => (order[a.status as keyof typeof order] ?? 9) - (order[b.status as keyof typeof order] ?? 9),
    );

    const result: ScenarioCompareResult = {
      scenarios: scenarios.map(({ full: _, ...s }) => s),
      bestHour: sorted[0]?.departureHour ?? null,
      worstHour: sorted.at(-1)?.departureHour ?? null,
    };

    await this.history.save(ownerId, 'scenario_compare', req, result, {
      name: req.name,
      verdict: sorted[0]?.status,
    });

    return result;
  }
}
