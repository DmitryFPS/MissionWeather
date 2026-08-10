import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WeatherProviderPort, WeatherQuery } from '../../application/ports/weather-provider.port';
import { WeatherSnapshot } from '../../domain/entities/weather.entity';
import { FusionService } from '../../domain/services/fusion.service';
import { DecisionEngine } from '../../domain/services/decision-engine.service';
import { FusedWeatherPoint } from '../../domain/entities/weather.entity';
import { FlightThresholds } from '../../domain/entities/flight-thresholds.entity';
import { normalizeThresholds } from '../../domain/services/thresholds.util';
import { Verdict } from '../../domain/entities/verdict.entity';
import { SourceWeight } from '../../domain/services/fusion.service';
import { createOpenMeteoProviders } from '../../infrastructure/weather/open-meteo.provider';
import { YandexWeatherProvider } from '../../infrastructure/weather/yandex-weather.provider';
import { AviationWeatherMetarProvider } from '../../infrastructure/weather/aviation-weather.provider';
import { CheckWxMetarProvider } from '../../infrastructure/weather/checkwx.provider';
import { OpenWeatherProvider } from '../../infrastructure/weather/openweather.provider';
import { VisualCrossingProvider } from '../../infrastructure/weather/visual-crossing.provider';
import { TomorrowIoProvider } from '../../infrastructure/weather/tomorrow-io.provider';
import { WeatherbitProvider } from '../../infrastructure/weather/weatherbit.provider';
import { MetNorwayProvider } from '../../infrastructure/weather/met-norway.provider';
import { ForecaProvider } from '../../infrastructure/weather/foreca.provider';
import { RedisCacheService } from '../../infrastructure/cache/redis-cache.service';

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
  private readonly CACHE_TTL_MS = 10 * 60 * 1000;

  constructor(
    config: ConfigService,
    private readonly cache: RedisCacheService,
  ) {
    this.providers = [
      ...createOpenMeteoProviders(),
      new YandexWeatherProvider(config.get('YANDEX_WEATHER_KEY', '')),
      new AviationWeatherMetarProvider(),
      new CheckWxMetarProvider(config.get('CHECKWX_KEY', '')),
      new OpenWeatherProvider(config.get('OPENWEATHER_KEY', '')),
      new VisualCrossingProvider(config.get('VISUAL_CROSSING_KEY', '')),
      new TomorrowIoProvider(config.get('TOMORROW_IO_KEY', '')),
      new WeatherbitProvider(config.get('WEATHERBIT_KEY', '')),
      new MetNorwayProvider(),
      new ForecaProvider(config.get('FORECA_KEY', '')),
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
        const cacheKey = `wx:${provider.id}:${query.lat.toFixed(3)}:${query.lon.toFixed(3)}:${query.timestamp ?? 'now'}`;
        const cached = await this.cache.getJson<WeatherSnapshot>(cacheKey);
        if (cached) {
          snapshots.push(cached);
          return;
        }
        try {
          const snap = await provider.fetch(query);
          if (snap) {
            await this.cache.setJson(cacheKey, snap, this.CACHE_TTL_MS);
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
    const t = normalizeThresholds(thresholds);
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
    const verdict = this.decision.evaluatePoint(fused, t);
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
