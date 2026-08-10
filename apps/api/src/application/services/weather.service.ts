import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WeatherProviderPort, WeatherQuery } from '../../application/ports/weather-provider.port';
import { WeatherSnapshot } from '../../domain/entities/weather.entity';
import { FusionService } from '../../domain/services/fusion.service';
import { DecisionEngine } from '../../domain/services/decision-engine.service';
import { FusedWeatherPoint } from '../../domain/entities/weather.entity';
import { FlightThresholds } from '../../domain/entities/flight-thresholds.entity';
import { Verdict } from '../../domain/entities/verdict.entity';
import { SourceWeight } from '../../domain/services/fusion.service';
import { createOpenMeteoProviders } from '../../infrastructure/weather/open-meteo.provider';
import { YandexWeatherProvider } from '../../infrastructure/weather/yandex-weather.provider';
import { AviationWeatherMetarProvider } from '../../infrastructure/weather/aviation-weather.provider';
import { CheckWxMetarProvider } from '../../infrastructure/weather/checkwx.provider';

interface CircuitState {
  failures: number;
  openUntil: number;
}

@Injectable()
export class WeatherService {
  private readonly providers: WeatherProviderPort[];
  private readonly fusion = new FusionService();
  private readonly decision = new DecisionEngine();
  private readonly circuits = new Map<string, CircuitState>();
  private readonly cache = new Map<string, { at: number; data: WeatherSnapshot }>();
  private readonly CACHE_TTL_MS = 10 * 60 * 1000;

  constructor(config: ConfigService) {
    this.providers = [
      ...createOpenMeteoProviders(),
      new YandexWeatherProvider(config.get('YANDEX_WEATHER_KEY', '')),
      new AviationWeatherMetarProvider(),
      new CheckWxMetarProvider(config.get('CHECKWX_KEY', '')),
    ];
  }

  listProviders() {
    return this.providers.map((p) => ({ id: p.id, name: p.name }));
  }

  async providerHealth() {
    const results = await Promise.all(
      this.providers.map(async (p) => ({
        id: p.id,
        name: p.name,
        ok: this.isCircuitOpen(p.id) ? false : await p.healthCheck(),
        circuitOpen: this.isCircuitOpen(p.id),
      })),
    );
    return results;
  }

  async fetchFused(
    query: WeatherQuery,
    sourceIds?: string[],
    weights?: SourceWeight[],
  ): Promise<{ snapshots: WeatherSnapshot[]; fused: FusedWeatherPoint | null }> {
    const active = this.providers.filter((p) => !sourceIds?.length || sourceIds.includes(p.id));
    const snapshots: WeatherSnapshot[] = [];

    await Promise.all(
      active.map(async (provider) => {
        if (this.isCircuitOpen(provider.id)) return;
        const cacheKey = `${provider.id}:${query.lat.toFixed(3)}:${query.lon.toFixed(3)}:${query.timestamp ?? 'now'}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.at < this.CACHE_TTL_MS) {
          snapshots.push(cached.data);
          return;
        }
        try {
          const snap = await provider.fetch(query);
          if (snap) {
            this.cache.set(cacheKey, { at: Date.now(), data: snap });
            snapshots.push(snap);
            this.resetCircuit(provider.id);
          }
        } catch {
          this.recordFailure(provider.id);
        }
      }),
    );

    const defaultWeights: SourceWeight[] = weights?.length
      ? weights
      : snapshots.map((s) => ({ sourceId: s.sourceId, weight: 1 }));

    const fused = this.fusion.fuse(snapshots, defaultWeights);
    return { snapshots, fused };
  }

  async evaluate(
    query: WeatherQuery,
    thresholds: FlightThresholds,
    sourceIds?: string[],
    weights?: SourceWeight[],
  ): Promise<{ snapshots: WeatherSnapshot[]; fused: FusedWeatherPoint | null; verdict: Verdict | null }> {
    const { snapshots, fused } = await this.fetchFused(query, sourceIds, weights);
    if (!fused) {
      return {
        snapshots,
        fused: null,
        verdict: {
          status: 'NO_GO',
          reasons: [{ parameter: 'weather', value: 'no_data', limit: 'sources_available' }],
          confidence: 'low',
        },
      };
    }
    const verdict = this.decision.evaluatePoint(fused, thresholds);
    return { snapshots, fused, verdict };
  }

  private isCircuitOpen(id: string): boolean {
    const c = this.circuits.get(id);
    if (!c) return false;
    if (Date.now() < c.openUntil) return true;
    this.circuits.delete(id);
    return false;
  }

  private recordFailure(id: string) {
    const c = this.circuits.get(id) ?? { failures: 0, openUntil: 0 };
    c.failures += 1;
    if (c.failures >= 3) {
      c.openUntil = Date.now() + 60_000;
      c.failures = 0;
    }
    this.circuits.set(id, c);
  }

  private resetCircuit(id: string) {
    this.circuits.delete(id);
  }
}
