'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function HomePage() {
  const [health, setHealth] = useState<string>('проверка…');

  useEffect(() => {
    fetch(`${API}/health`)
      .then((r) => r.json())
      .then((d) => setHealth(d.status === 'ok' ? 'API подключён' : 'ошибка'))
      .catch(() => setHealth('API недоступен'));
  }, []);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        textAlign: 'center',
        gap: '1rem',
      }}
    >
      <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', margin: 0 }}>MissionWeather</h1>
      <p style={{ maxWidth: 480, opacity: 0.85, margin: 0 }}>
        Погода и GO / CAUTION / NO-GO для самолётного БПЛА наблюдения
      </p>
      <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>{health}</p>
    </main>
  );
}
