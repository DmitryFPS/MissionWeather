'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { YandexMap } from '@/components/YandexMap';

interface EvaluateResult {
  verdict: { status: string; reasons: { parameter: string; value: unknown }[]; confidence: string };
  fused: { windSpeedMs: number; spread: { windSpeedMs: { min: number; max: number; avg: number } } } | null;
  snapshots: { sourceId: string; windSpeedMs: number }[];
}

interface AiResult {
  verdict: EvaluateResult['verdict'];
  advice: { summary: string; risks: string[]; suggestions: string[]; modelId: string };
}

export default function WeatherPage() {
  const [lat, setLat] = useState(55.75);
  const [lon, setLon] = useState(37.62);
  const [windGo, setWindGo] = useState(8);
  const [windCaution, setWindCaution] = useState(12);
  const [result, setResult] = useState<EvaluateResult | null>(null);
  const [ai, setAi] = useState<AiResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function evaluate() {
    setLoading(true);
    setAi(null);
    try {
      const body = {
        lat,
        lon,
        thresholds: { windSpeedMs: { goMax: windGo, cautionMax: windCaution }, maxSourceSpreadMs: 3 },
      };
      setResult(await api<EvaluateResult>('/weather/evaluate', { method: 'POST', body: JSON.stringify(body) }));
    } finally {
      setLoading(false);
    }
  }

  async function askAi() {
    setLoading(true);
    try {
      const body = {
        lat,
        lon,
        thresholds: { windSpeedMs: { goMax: windGo, cautionMax: windCaution }, maxSourceSpreadMs: 3 },
      };
      setAi(await api<AiResult>('/ai/advise', { method: 'POST', body: JSON.stringify(body) }));
    } finally {
      setLoading(false);
    }
  }

  const verdictClass =
    result?.verdict.status === 'GO'
      ? 'verdict-go'
      : result?.verdict.status === 'CAUTION'
        ? 'verdict-caution'
        : 'verdict-nogo';

  return (
    <div>
      <h1>Погода и вердикт</h1>
      <div className="grid-2">
        <div className="card">
          <label>Широта</label>
          <input type="number" step="0.01" value={lat} onChange={(e) => setLat(Number(e.target.value))} />
          <label>Долгота</label>
          <input type="number" step="0.01" value={lon} onChange={(e) => setLon(Number(e.target.value))} />
          <label>Ветер GO max</label>
          <input type="number" value={windGo} onChange={(e) => setWindGo(Number(e.target.value))} />
          <label>Ветер CAUTION max</label>
          <input type="number" value={windCaution} onChange={(e) => setWindCaution(Number(e.target.value))} />
          <button className="btn" type="button" onClick={evaluate} disabled={loading}>Рассчитать GO/NO-GO</button>
          <button className="btn ghost" type="button" onClick={askAi} disabled={loading} style={{ marginLeft: 8 }}>
            Совет ИИ
          </button>
        </div>
        <div className="card">
          <YandexMap center={{ lat, lon }} points={[{ lat, lon, label: 'Точка проверки' }]} />
        </div>
      </div>
      {result && (
        <div className="card">
          <h2 className={verdictClass}>Вердикт: {result.verdict.status}</h2>
          <p>Уверенность: {result.verdict.confidence}</p>
          {result.fused ? (
            <>
              <p>Ветер (fusion): {result.fused.windSpeedMs.toFixed(1)} м/с</p>
              <p>Разброс: {result.fused.spread.windSpeedMs.min.toFixed(1)} – {result.fused.spread.windSpeedMs.max.toFixed(1)}</p>
            </>
          ) : (
            <p className="verdict-nogo">Нет данных от агрегаторов</p>
          )}
          <ul>
            {result.snapshots.map((s) => (
              <li key={s.sourceId}>{s.sourceId}: {s.windSpeedMs.toFixed(1)} м/с</li>
            ))}
          </ul>
        </div>
      )}
      {ai?.advice && (
        <div className="card">
          <h3>ИИ-совет ({ai.advice.modelId})</h3>
          <p><em>Не заменяет rule-engine вердикт</em></p>
          <p>{ai.advice.summary}</p>
          {ai.advice.suggestions.map((s) => (
            <p key={s}>• {s}</p>
          ))}
        </div>
      )}
    </div>
  );
}
