'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface AuditRow {
  id?: string;
  user_id?: string;
  action: string;
  resource?: string;
  resource_id?: string;
  meta?: Record<string, unknown>;
  created_at?: string;
  at?: string;
}

export default function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<AuditRow[]>('/audit')
      .then(setRows)
      .catch(() => setError('Доступ только для администратора'));
  }, []);

  return (
    <div>
      <h1>Аудит</h1>
      <p className="muted">Журнал действий операторов и системы.</p>
      {error && <p className="verdict-nogo">{error}</p>}
      <div className="card ttx-table-wrap">
        <table className="ttx-table">
          <thead>
            <tr>
              <th>Время</th>
              <th>Действие</th>
              <th>Ресурс</th>
              <th>Meta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id ?? i}>
                <td>{r.created_at ?? r.at ?? '—'}</td>
                <td>{r.action}</td>
                <td>{r.resource ?? '—'} {r.resource_id ? `#${String(r.resource_id).slice(0, 8)}` : ''}</td>
                <td><code>{r.meta ? JSON.stringify(r.meta) : '—'}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
