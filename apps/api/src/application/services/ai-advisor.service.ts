import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Verdict } from '../../domain/entities/verdict.entity';
import { FusedWeatherPoint } from '../../domain/entities/weather.entity';
import { FlightThresholds } from '../../domain/entities/flight-thresholds.entity';

export interface AiAdvice {
  summary: string;
  risks: string[];
  suggestions: string[];
  modelId: string;
}

@Injectable()
export class AiAdvisorService {
  private queue: Promise<void> = Promise.resolve();
  private active = 0;
  private readonly maxParallel = 2;

  constructor(private readonly config: ConfigService) {}

  async advise(
    fused: FusedWeatherPoint,
    verdict: Verdict,
    thresholds: FlightThresholds,
    modelId?: string,
  ): Promise<AiAdvice> {
    const apiKey = this.config.get('ROUTERAI_API_KEY', '');
    const baseUrl = this.config.get('ROUTERAI_BASE_URL', 'https://routerai.ru/api/v1');
    const model = modelId ?? 'deepseek/deepseek-chat';

    if (!apiKey) {
      return this.offlineAdvice(fused, verdict, model);
    }

    return this.enqueue(() => this.callRouterAi(baseUrl, apiKey, model, fused, verdict, thresholds));
  }

  private offlineAdvice(fused: FusedWeatherPoint, verdict: Verdict, modelId: string): AiAdvice {
    return {
      summary: `Rule-engine: ${verdict.status}. Ветер ${fused.windSpeedMs.toFixed(1)} м/с (разброс ${fused.spread.windSpeedMs.min.toFixed(1)}–${fused.spread.windSpeedMs.max.toFixed(1)}). ИИ offline — задайте ROUTERAI_API_KEY.`,
      risks: verdict.reasons.map((r) => `${r.parameter}: ${r.value}`),
      suggestions:
        verdict.status === 'GO'
          ? ['Подтвердите пороги перед вылетом', 'Проверьте прогноз ближе к старту']
          : ['Сдвиньте окно старта', 'Снизьте длительность миссии', 'Проверьте другой маршрут'],
      modelId: `${modelId} (offline)`,
    };
  }

  private async callRouterAi(
    baseUrl: string,
    apiKey: string,
    model: string,
    fused: FusedWeatherPoint,
    verdict: Verdict,
    thresholds: FlightThresholds,
  ): Promise<AiAdvice> {
    try {
      const prompt = `Ты метео-советник для БПЛА наблюдения. Ответь JSON: {"summary":"","risks":[],"suggestions":[]}.
Вердикт rule-engine: ${verdict.status}. Ветер ${fused.windSpeedMs} м/с. Confidence: ${fused.confidence}.
Пороги: ${JSON.stringify(thresholds)}. Не меняй вердикт, только объясни и посоветуй на русском.`;

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
      });

      if (!res.ok) return this.offlineAdvice(fused, verdict, model);

      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = data.choices?.[0]?.message?.content;
      if (!content) return this.offlineAdvice(fused, verdict, model);

      const parsed = JSON.parse(content) as { summary?: string; risks?: string[]; suggestions?: string[] };
      return {
        summary: parsed.summary ?? verdict.status,
        risks: parsed.risks ?? [],
        suggestions: parsed.suggestions ?? [],
        modelId: model,
      };
    } catch {
      return this.offlineAdvice(fused, verdict, model);
    }
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = async () => {
      while (this.active >= this.maxParallel) {
        await new Promise((r) => setTimeout(r, 100));
      }
      this.active += 1;
      try {
        return await fn();
      } finally {
        this.active -= 1;
      }
    };
    const result = this.queue.then(run);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }
}
