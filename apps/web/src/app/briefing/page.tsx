'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function BriefingContent() {
  const sp = useSearchParams();
  const name = sp.get('name') ?? 'Маршрут';
  const date = sp.get('date') ?? new Date().toISOString().slice(0, 10);
  const hour = sp.get('hour') ?? '10';
  const status = sp.get('status') ?? '—';
  const now = new Date().toLocaleString('ru-RU');

  return (
    <div className="briefing-print">
      <header className="briefing-header">
        <h1>MissionWeather · Брифинг</h1>
        <p>{name}</p>
      </header>
      <section>
        <p><strong>Дата:</strong> {date}</p>
        <p><strong>Вылет:</strong> {hour}:00 (MSK)</p>
        <p><strong>Вердикт:</strong> {status}</p>
        <p><strong>Сформирован:</strong> {now}</p>
      </section>
      <section>
        <h2>28 ТТХ · Орлан-10</h2>
        <p>Полная таблица доступна на экране «Маршрут» перед печатью.</p>
      </section>
      <footer className="briefing-footer">
        <p>MissionWeather · audit footer · {now}</p>
        <p>Источник: Open-Meteo GFS · не заменяет штатный метеобрифинг</p>
      </footer>
      <div className="no-print btn-row">
        <button type="button" className="btn" onClick={() => window.print()}>Печать / PDF</button>
        <Link href="/routes" className="btn ghost">Назад</Link>
      </div>
    </div>
  );
}

export default function BriefingPage() {
  return (
    <Suspense>
      <BriefingContent />
    </Suspense>
  );
}
