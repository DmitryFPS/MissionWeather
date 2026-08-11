'use client';

import { useEffect, useState } from 'react';
import { api, apiBaseUrl } from '@/lib/api';

export default function DashboardPage() {
  const [health, setHealth] = useState('…');
  const [providers, setProviders] = useState(0);
  const [lanUrl, setLanUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLanUrl(`${window.location.protocol}//${window.location.hostname}:3000`);
    }
    fetch(`${apiBaseUrl()}/health`)
      .then((r) => r.json())
      .then((d) => setHealth(d.status))
      .catch(() => setHealth('offline'));
    api<{ id: string }[]>('/weather/providers').then((p) => setProviders(p.length)).catch(() => setProviders(0));
  }, []);

  return (
    <div>
      <h1>Панель</h1>
      <div className="grid-2">
        <div className="card">
          <h3>API</h3>
          <p>Статус: {health}</p>
          <p>Агрегаторов: {providers}</p>
          <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>API: {apiBaseUrl()}</p>
        </div>
        <div className="card">
          <h3>Быстрые действия</h3>
          <p>1. Настройте профиль борта и ручные пороги</p>
          <p>2. Проверьте погоду в точке или по маршруту</p>
          <p>3. Получите совет ИИ (не меняет GO/NO-GO)</p>
        </div>
      </div>
      {lanUrl && (
        <div className="card">
          <h3>Доступ</h3>
          <p>Один адрес — UI и API: <strong>{lanUrl}</strong></p>
          <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>API: {apiBaseUrl()}</p>
        </div>
      )}
    </div>
  );
}
