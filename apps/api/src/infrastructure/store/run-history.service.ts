import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { DatabaseService } from '../database/database.service';

export interface ForecastRunRecord {
  id: string;
  ownerId: string;
  runType: 'route_forecast' | 'mission_evaluate' | 'scenario_compare';
  name?: string;
  input: unknown;
  result: unknown;
  verdict?: string;
  createdAt: string;
}

@Injectable()
export class RunHistoryService {
  private memory: ForecastRunRecord[] = [];

  constructor(private readonly db: DatabaseService) {}

  async save(
    ownerId: string,
    runType: ForecastRunRecord['runType'],
    input: unknown,
    result: unknown,
    opts?: { name?: string; verdict?: string },
  ): Promise<ForecastRunRecord> {
    const record: ForecastRunRecord = {
      id: uuid(),
      ownerId,
      runType,
      name: opts?.name,
      input,
      result,
      verdict: opts?.verdict,
      createdAt: new Date().toISOString(),
    };

    if (this.db.enabled) {
      const rows = await this.db.query<{ id: string; created_at: Date }>(
        `INSERT INTO forecast_runs (owner_id, run_type, name, input, result, verdict)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, created_at`,
        [
          ownerId,
          runType,
          opts?.name ?? null,
          JSON.stringify(input),
          JSON.stringify(result),
          opts?.verdict ?? null,
        ],
      );
      record.id = rows[0].id;
      record.createdAt = rows[0].created_at.toISOString();
      return record;
    }

    this.memory.unshift(record);
    if (this.memory.length > 200) this.memory.pop();
    return record;
  }

  async list(ownerId: string, role: string, limit = 50): Promise<ForecastRunRecord[]> {
    if (this.db.enabled) {
      const sql =
        role === 'admin'
          ? `SELECT id, owner_id, run_type, name, input, result, verdict, created_at
             FROM forecast_runs ORDER BY created_at DESC LIMIT $1`
          : `SELECT id, owner_id, run_type, name, input, result, verdict, created_at
             FROM forecast_runs WHERE owner_id = $1 ORDER BY created_at DESC LIMIT $2`;
      const params = role === 'admin' ? [limit] : [ownerId, limit];
      const rows = await this.db.query<Record<string, unknown>>(sql, params);
      return rows.map(mapRun);
    }
    return this.memory
      .filter((r) => r.ownerId === ownerId || role === 'admin')
      .slice(0, limit);
  }

  async get(id: string, ownerId: string, role: string): Promise<ForecastRunRecord | null> {
    if (this.db.enabled) {
      const rows = await this.db.query<Record<string, unknown>>(
        'SELECT * FROM forecast_runs WHERE id = $1',
        [id],
      );
      const r = rows[0];
      if (!r) return null;
      const rec = mapRun(r);
      if (rec.ownerId !== ownerId && role !== 'admin') return null;
      return rec;
    }
    return this.memory.find((r) => r.id === id && (r.ownerId === ownerId || role === 'admin')) ?? null;
  }
}

function mapRun(r: Record<string, unknown>): ForecastRunRecord {
  return {
    id: String(r.id),
    ownerId: String(r.owner_id),
    runType: r.run_type as ForecastRunRecord['runType'],
    name: r.name ? String(r.name) : undefined,
    input: r.input,
    result: r.result,
    verdict: r.verdict ? String(r.verdict) : undefined,
    createdAt: (r.created_at as Date).toISOString(),
  };
}
