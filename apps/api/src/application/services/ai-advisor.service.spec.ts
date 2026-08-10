import { AiAdvisorService } from './ai-advisor.service';
import { FusedWeatherPoint } from '../../domain/entities/weather.entity';
import { EMPTY_THRESHOLDS } from '../../domain/entities/flight-thresholds.entity';

describe('AiAdvisorService', () => {
  it('returns offline advice without API key', async () => {
    const config = { get: (_k: string, def?: string) => def ?? '' };
    const service = new AiAdvisorService(config as never);
    const fused: FusedWeatherPoint = {
      lat: 55,
      lon: 37,
      timestamp: 't',
      windSpeedMs: 5,
      sourceCount: 2,
      spread: { windSpeedMs: { min: 4, max: 6, avg: 5 } },
      confidence: 'high',
    };
    const advice = await service.advise(fused, { status: 'GO', reasons: [], confidence: 'high' }, EMPTY_THRESHOLDS);
    expect(advice.summary).toContain('GO');
    expect(advice.suggestions.length).toBeGreaterThan(0);
  });
});
