'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { YandexMap } from '@/components/YandexMap';

interface Profile { id: string; name: string }
interface Mission { id: string; name: string; plannedDurationHours: number; waypoints: { lat: number; lon: number }[] }

interface EvalResult {
  verdict: { status: string };
  schedule?: { etaOffsetHours: number; lat: number; lon: number }[];
  durationHours?: number;
  durationExceeded?: boolean;
}

export default function MissionsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [profileId, setProfileId] = useState('');
  const [name, setName] = useState('Облёт-1');
  const [lat, setLat] = useState(55.75);
  const [lon, setLon] = useState(37.62);
  const [hours, setHours] = useState(3);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [mapPoints, setMapPoints] = useState<{ lat: number; lon: number; label?: string }[]>([]);

  useEffect(() => {
    api<Profile[]>('/profiles').then((p) => {
      setProfiles(p);
      if (p[0]) setProfileId(p[0].id);
    });
    api<Mission[]>('/missions').then(setMissions);
  }, []);

  async function create() {
    if (!profileId) return;
    const wps = [{ lat, lon }, { lat: lat + 0.05, lon: lon + 0.05 }];
    await api('/missions', {
      method: 'POST',
      body: JSON.stringify({
        name,
        profileId,
        plannedDurationHours: hours,
        waypoints: wps,
      }),
    });
    setMapPoints(wps.map((w, i) => ({ ...w, label: i === 0 ? 'Старт' : `WP${i + 1}` })));
    setMissions(await api<Mission[]>('/missions'));
  }

  async function evaluate(id: string) {
    const result = await api<EvalResult>(`/missions/${id}/evaluate`, { method: 'POST', body: '{}' });
    setEvalResult(result);
    if (result.schedule) {
      setMapPoints(result.schedule.map((s, i) => ({
        lat: s.lat,
        lon: s.lon,
        label: `T+${s.etaOffsetHours.toFixed(1)}ч`,
      })));
    }
  }

  return (
    <div>
      <h1>Миссии</h1>
      <div className="grid-2">
        <div className="card">
          <label>Профиль борта</label>
          <select value={profileId} onChange={(e) => setProfileId(e.target.value)}>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <label>Название</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <label>Длительность (ч)</label>
          <input type="number" min={1} max={10} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
          <label>Точка старта lat/lon</label>
          <input type="number" step="0.01" value={lat} onChange={(e) => setLat(Number(e.target.value))} />
          <input type="number" step="0.01" value={lon} onChange={(e) => setLon(Number(e.target.value))} />
          <button className="btn" type="button" onClick={create}>Создать маршрут</button>
        </div>
        <div className="card">
          <YandexMap center={{ lat, lon }} points={mapPoints.length ? mapPoints : [{ lat, lon }]} height={360} />
        </div>
      </div>
      {missions.map((m) => (
        <div key={m.id} className="card">
          <strong>{m.name}</strong>
          <p>{m.plannedDurationHours} ч · {m.waypoints.length} точек</p>
          <button className="btn ghost" type="button" onClick={() => evaluate(m.id)}>Оценить миссию (temporal)</button>
        </div>
      ))}
      {evalResult && (
        <div className="card">
          <h3 className={evalResult.verdict.status === 'GO' ? 'verdict-go' : evalResult.verdict.status === 'CAUTION' ? 'verdict-caution' : 'verdict-nogo'}>
            Итог миссии: {evalResult.verdict.status}
          </h3>
          {evalResult.durationHours !== undefined && (
            <p>Расчётное время маршрута: {evalResult.durationHours.toFixed(2)} ч
              {evalResult.durationExceeded ? ' — превышает план!' : ''}
            </p>
          )}
          {evalResult.schedule && (
            <ul>
              {evalResult.schedule.map((s, i) => (
                <li key={i}>T+{s.etaOffsetHours.toFixed(2)} ч — {s.lat.toFixed(3)}, {s.lon.toFixed(3)}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
