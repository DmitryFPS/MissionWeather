'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Profile {
  id: string;
  name: string;
  cruiseSpeedKmh: number;
  maxDurationHours: number;
  thresholds: {
    windSpeedMs?: { goMax?: number; cautionMax?: number };
  };
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [name, setName] = useState('Борт-1');
  const [windGo, setWindGo] = useState(8);
  const [windCaution, setWindCaution] = useState(12);

  async function load() {
    setProfiles(await api<Profile[]>('/profiles'));
  }

  useEffect(() => { load(); }, []);

  async function create() {
    await api('/profiles', {
      method: 'POST',
      body: JSON.stringify({
        name,
        cruiseSpeedKmh: 80,
        maxDurationHours: 6,
        thresholds: { windSpeedMs: { goMax: windGo, cautionMax: windCaution } },
        fusionSourceIds: ['open-meteo-ecmwf', 'open-meteo-gfs', 'aviation-weather-metar'],
        aiEnabled: false,
      }),
    });
    await load();
  }

  return (
    <div>
      <h1>Профили борта</h1>
      <div className="card">
        <h3>Новый профиль (ручные пороги)</h3>
        <label>Имя</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <label>Ветер GO max (м/с)</label>
        <input type="number" value={windGo} onChange={(e) => setWindGo(Number(e.target.value))} />
        <label>Ветер CAUTION max (м/с)</label>
        <input type="number" value={windCaution} onChange={(e) => setWindCaution(Number(e.target.value))} />
        <button className="btn" type="button" onClick={create}>Сохранить</button>
      </div>
      {profiles.map((p) => (
        <div key={p.id} className="card">
          <strong>{p.name}</strong>
          <p>Крейсер: {p.cruiseSpeedKmh} км/ч · Макс. {p.maxDurationHours} ч</p>
          <p>Ветер GO ≤ {p.thresholds?.windSpeedMs?.goMax ?? '—'} м/с</p>
        </div>
      ))}
    </div>
  );
}
