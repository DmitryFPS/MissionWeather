'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface RunRow {
  id: string;
  runType: string;
  name?: string;
  verdict?: string;
  createdAt: string;
}

function statusClass(s?: string) {
  if (s === 'GO') return 'verdict-go';
  if (s === 'CAUTION') return 'verdict-caution';
  if (s === 'NO_GO') return 'verdict-nogo';
  return '';
}

export default function HistoryPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api<RunRow[]>('/runs').then(setRuns);
  }, []);

  async function openRun(id: string) {
    setSelected(await api<Record<string, unknown>>(`/runs/${id}`));
  }

  return (
    <div>
      <h1>История прогонов</h1>
      <p className="muted">Сохранённые прогнозы маршрута, сценарии и оценки миссий.</p>
      <div className="card">
        {runs.length === 0 && <p>Нет сохранённых прогонов.</p>}
        {runs.map((r) => (
          <div key={r.id} className="mission-row">
            <span>
              <span className={statusClass(r.verdict)}>{r.verdict ?? '—'}</span>
              {' · '}{r.runType}{r.name ? ` · ${r.name}` : ''}
              {' · '}{new Date(r.createdAt).toLocaleString('ru-RU')}
            </span>
            <button type="button" className="btn ghost" onClick={() => openRun(r.id)}>Открыть</button>
          </div>
        ))}
      </div>
      {selected && (
        <div className="card">
          <h3>Детали прогона</h3>
          <pre style={{ overflow: 'auto', fontSize: '0.75rem' }}>{JSON.stringify(selected, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
