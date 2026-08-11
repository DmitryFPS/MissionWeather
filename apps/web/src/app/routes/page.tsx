'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { MissionMap } from '@/components/MissionMap';
import { buildGpx, downloadGpx, parseGpx } from '@/lib/gpx';
import Link from 'next/link';

interface Waypoint {
  lat: number;
  lon: number;
  altitudeAglM?: number;
}

interface TthCheck {
  id: string;
  group: string;
  label: string;
  status: string;
  value: string;
  limit: string;
}

interface RouteForecast {
  date: string;
  departureHour: number;
  landingHour: number;
  landingHourComputed?: boolean;
  maxAltitudeM: number;
  totalDistanceKm: number;
  flightDurationHours: number;
  trackBearingDeg?: number;
  headwindMs?: number;
  crosswindMs?: number;
  fusionSourceCount?: number;
  assessment: { status: string; checks: TthCheck[]; problemIds: string[] };
  hourlyRoute: { hour: number; timeLabel: string; tth: { status: string; checks: TthCheck[] } }[];
  problemHours: number[];
  whatIfHours: { hour: number; timeLabel: string; tth: { status: string; checks: TthCheck[] } }[];
}

interface ScenarioCompare {
  scenarios: { departureHour: number; status: string; headwindMs?: number; crosswindMs?: number }[];
  bestHour: number | null;
  worstHour: number | null;
}

interface Mission {
  id: string;
  name: string;
  waypoints: Waypoint[];
  plannedDurationHours: number;
}

interface Profile {
  id: string;
  name: string;
}

function statusClass(s: string) {
  if (s === 'GO') return 'verdict-go';
  if (s === 'CAUTION') return 'verdict-caution';
  if (s === 'NO_GO') return 'verdict-nogo';
  return '';
}

export default function RoutesPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState('Маршрут-1');
  const [date, setDate] = useState(today);
  const [depHour, setDepHour] = useState(10);
  const [landHourOverride, setLandHourOverride] = useState<number | null>(null);
  const [compare, setCompare] = useState<ScenarioCompare | null>(null);
  const [maxAlt, setMaxAlt] = useState(3000);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { lat: 47.901, lon: 37.925 },
    { lat: 48.05, lon: 38.1 },
  ]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileId, setProfileId] = useState('');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [forecast, setForecast] = useState<RouteForecast | null>(null);
  const [whatIfHour, setWhatIfHour] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Profile[]>('/profiles').then((p) => {
      setProfiles(p);
      const orlan = p.find((x) => x.name.includes('Орлан')) ?? p[0];
      if (orlan) setProfileId(orlan.id);
    });
    api<Mission[]>('/missions').then(setMissions);
  }, []);

  const mapPoints = useMemo(
    () => waypoints.map((w, i) => ({ lat: w.lat, lon: w.lon, label: i === 0 ? 'Старт' : `WP${i + 1}` })),
    [waypoints],
  );

  const activeAssessment = useMemo(() => {
    if (!forecast) return null;
    if (whatIfHour !== null) {
      const h = forecast.hourlyRoute.find((x) => x.hour === whatIfHour);
      if (h) return h.tth;
    }
    return forecast.assessment;
  }, [forecast, whatIfHour]);

  async function runForecast() {
    setLoading(true);
    setError('');
    setWhatIfHour(null);
    try {
      const result = await api<RouteForecast>('/aircraft/route-forecast', {
        method: 'POST',
        body: JSON.stringify({
          waypoints,
          date,
          departureHour: depHour,
          ...(landHourOverride !== null ? { landingHour: landHourOverride } : {}),
          maxAltitudeM: maxAlt,
          timezone: 'Europe/Moscow',
        }),
      });
      setForecast(result);
    } catch {
      setError('Не удалось получить прогноз маршрута');
    } finally {
      setLoading(false);
    }
  }

  async function saveRoute() {
    if (!profileId) return;
    await api('/missions', {
      method: 'POST',
      body: JSON.stringify({
        name,
        profileId,
        waypoints,
        plannedDurationHours: forecast?.flightDurationHours ?? 2,
      }),
    });
    setMissions(await api<Mission[]>('/missions'));
  }

  function addWaypoint() {
    const last = waypoints.at(-1) ?? { lat: 55.75, lon: 37.62 };
    setWaypoints([...waypoints, { lat: last.lat + 0.03, lon: last.lon + 0.03 }]);
  }

  function updateWp(i: number, patch: Partial<Waypoint>) {
    setWaypoints(waypoints.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  }

  function removeWp(i: number) {
    if (waypoints.length <= 2) return;
    setWaypoints(waypoints.filter((_, idx) => idx !== i));
  }

  const onGpxImport = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const pts = parseGpx(String(reader.result));
      if (pts.length >= 2) {
        setWaypoints(pts.map((p) => ({ lat: p.lat, lon: p.lon, altitudeAglM: p.elevationM })));
        if (pts[0]?.name) setName(pts[0].name);
      }
    };
    reader.readAsText(file);
  }, []);

  function exportGpx() {
    downloadGpx(`${name.replace(/\s+/g, '_')}.gpx`, buildGpx(name, waypoints));
  }

  async function compareScenarios() {
    setLoading(true);
    try {
      const hours = [depHour - 2, depHour - 1, depHour, depHour + 1, depHour + 2].filter((h) => h >= 0 && h <= 23);
      const result = await api<ScenarioCompare>('/scenarios/compare', {
        method: 'POST',
        body: JSON.stringify({
          waypoints,
          date,
          departureHour: depHour,
          maxAltitudeM: maxAlt,
          timezone: 'Europe/Moscow',
          departureHours: hours,
          name,
        }),
      });
      setCompare(result);
    } finally {
      setLoading(false);
    }
  }

  function loadMission(m: Mission) {
    setName(m.name);
    setWaypoints(m.waypoints);
  }

  return (
    <div>
      <h1>Маршрут · Орлан-10</h1>
      <p className="muted">Прогноз по 28 ТТХ, what-if по часам, GPX, сохранение маршрутов.</p>

      <div className="grid-2">
        <div className="card">
          <label>Название</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <label>Дата</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="row-2">
            <div>
              <label>Вылет (ч)</label>
              <input type="number" min={0} max={23} value={depHour} onChange={(e) => setDepHour(Number(e.target.value))} />
            </div>
            <div>
              <label>Посадка (ч) {forecast?.landingHourComputed ? '· авто' : ''}</label>
              <input
                type="number"
                min={0}
                max={23}
                value={landHourOverride ?? forecast?.landingHour ?? depHour + 2}
                onChange={(e) => setLandHourOverride(Number(e.target.value))}
              />
            </div>
          </div>
          <label>Макс. высота (м)</label>
          <input type="number" min={300} max={5000} step={250} value={maxAlt} onChange={(e) => setMaxAlt(Number(e.target.value))} />
          <label>Профиль</label>
          <select value={profileId} onChange={(e) => setProfileId(e.target.value)}>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <h3>Точки маршрута</h3>
          {waypoints.map((w, i) => (
            <div key={i} className="wp-row">
              <span>{i === 0 ? 'Старт' : `WP${i + 1}`}</span>
              <input type="number" step="0.0001" value={w.lat} onChange={(e) => updateWp(i, { lat: Number(e.target.value) })} />
              <input type="number" step="0.0001" value={w.lon} onChange={(e) => updateWp(i, { lon: Number(e.target.value) })} />
              {waypoints.length > 2 && (
                <button type="button" className="btn ghost" onClick={() => removeWp(i)}>×</button>
              )}
            </div>
          ))}
          <button type="button" className="btn ghost" onClick={addWaypoint}>+ точка</button>

          <div className="btn-row">
            <button type="button" className="btn" disabled={loading} onClick={runForecast}>
              {loading ? 'Расчёт…' : 'Прогноз маршрута'}
            </button>
            <button type="button" className="btn ghost" onClick={saveRoute}>Сохранить</button>
            <button type="button" className="btn ghost" onClick={exportGpx}>GPX</button>
            <button type="button" className="btn ghost" onClick={compareScenarios}>Сравнить часы</button>
            <label className="btn ghost file-btn">
              Импорт GPX
              <input type="file" accept=".gpx,application/gpx+xml" hidden onChange={(e) => e.target.files?.[0] && onGpxImport(e.target.files[0])} />
            </label>
          </div>
        </div>

        <div className="card">
          <MissionMap center={waypoints[0]} points={mapPoints} height={400} />
          {forecast && (
            <p>
              {forecast.totalDistanceKm.toFixed(1)} км · {forecast.flightDurationHours.toFixed(1)} ч
              {forecast.fusionSourceCount ? ` · fusion ${forecast.fusionSourceCount}` : ''}
              {forecast.headwindMs !== undefined ? ` · HW ${forecast.headwindMs.toFixed(1)} м/с` : ''}
              {forecast.crosswindMs !== undefined ? ` · XW ${Math.abs(forecast.crosswindMs).toFixed(1)} м/с` : ''}
            </p>
          )}
        </div>
      </div>

      {forecast && (
        <div className="card time-dock">
          <h3>Time dock / what-if</h3>
          <div className="hour-bar">
            {forecast.hourlyRoute.map((h) => (
              <button
                key={h.hour}
                type="button"
                className={`hour-chip ${statusClass(h.tth.status)} ${whatIfHour === h.hour ? 'active' : ''} ${forecast.problemHours.includes(h.hour) ? 'problem' : ''}`}
                onClick={() => setWhatIfHour(h.hour === whatIfHour ? null : h.hour)}
              >
                {h.timeLabel}
                <small>{h.tth.status}</small>
              </button>
            ))}
          </div>
          {whatIfHour !== null && (
            <p className="muted">Сценарий: вылет в {String(whatIfHour).padStart(2, '0')}:00 (без пересчёта источника — из кэша часов)</p>
          )}
        </div>
      )}

      {compare && (
        <div className="card">
          <h3>Сравнение сценариев A/B</h3>
          <p>Лучший час: {compare.bestHour ?? '—'} · Худший: {compare.worstHour ?? '—'}</p>
          <table className="ttx-table">
            <thead><tr><th>Час</th><th>Вердикт</th><th>HW</th><th>XW</th></tr></thead>
            <tbody>
              {compare.scenarios.map((s) => (
                <tr key={s.departureHour} className={statusClass(s.status)}>
                  <td>{String(s.departureHour).padStart(2, '0')}:00</td>
                  <td>{s.status}</td>
                  <td>{s.headwindMs?.toFixed(1) ?? '—'}</td>
                  <td>{s.crosswindMs !== undefined ? Math.abs(s.crosswindMs).toFixed(1) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeAssessment && (
        <div className="card">
          <h2 className={statusClass(activeAssessment.status)}>
            Вердикт: {activeAssessment.status}
          </h2>
          <div className="ttx-table-wrap">
            <table className="ttx-table">
              <thead>
                <tr>
                  <th>Группа</th>
                  <th>Параметр</th>
                  <th>Значение</th>
                  <th>Норма</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {activeAssessment.checks?.map((c) => (
                  <tr key={c.id} className={statusClass(c.status)}>
                    <td>{c.group}</td>
                    <td>{c.label}</td>
                    <td>{c.value}</td>
                    <td>{c.limit}</td>
                    <td>{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link className="btn ghost" href={`/briefing?date=${date}&hour=${whatIfHour ?? depHour}&name=${encodeURIComponent(name)}&status=${activeAssessment.status}`}>
            Брифинг / печать
          </Link>
        </div>
      )}

      {missions.length > 0 && (
        <div className="card">
          <h3>Сохранённые маршруты</h3>
          {missions.map((m) => (
            <div key={m.id} className="mission-row">
              <span>{m.name} · {m.waypoints.length} т.</span>
              <button type="button" className="btn ghost" onClick={() => loadMission(m)}>Загрузить</button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="verdict-nogo">{error}</p>}
    </div>
  );
}
