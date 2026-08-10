import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool, PoolClient } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool | null = null;

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return this.pool !== null;
  }

  async onModuleInit() {
    const url = this.config.get<string>('DATABASE_URL');
    if (!url) {
      this.logger.warn('DATABASE_URL не задан — используется in-memory store');
      return;
    }
    try {
      this.pool = new Pool({ connectionString: url, max: 10 });
      await this.pool.query('SELECT 1');
      await this.runMigrations();
      this.logger.log('PostgreSQL подключён, миграции применены');
    } catch (err) {
      this.logger.warn(`PostgreSQL недоступен (${String(err)}), in-memory store`);
      await this.pool?.end().catch(() => undefined);
      this.pool = null;
    }
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    if (!this.pool) throw new Error('PostgreSQL не инициализирован');
    const res = await this.pool.query<T>(sql, params);
    return res.rows;
  }

  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) throw new Error('PostgreSQL не инициализирован');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  private async runMigrations() {
    if (!this.pool) return;
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const applied = await this.pool.query<{ id: string }>('SELECT id FROM schema_migrations');
    const done = new Set(applied.rows.map((r) => r.id));
    const migrationId = '001_init';
    if (done.has(migrationId)) return;

    const sqlPath = join(__dirname, 'migrations', `${migrationId}.sql`);
    const sql = readFileSync(sqlPath, 'utf8');
    await this.pool.query(sql);
    await this.pool.query('INSERT INTO schema_migrations (id) VALUES ($1)', [migrationId]);
  }
}
