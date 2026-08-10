import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: Redis | null = null;
  private memory = new Map<string, { at: number; value: string }>();

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return Boolean(this.config.get('REDIS_URL'));
  }

  async onModuleInit() {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn('REDIS_URL не задан — локальный in-memory кэш');
      return;
    }
    this.client = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: true });
    await this.client.connect();
    this.logger.log('Redis подключён');
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (this.client) {
      const raw = await this.client.get(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    }
    const entry = this.memory.get(key);
    if (!entry) return null;
    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlMs: number): Promise<void> {
    const raw = JSON.stringify(value);
    if (this.client) {
      await this.client.set(key, raw, 'PX', ttlMs);
      return;
    }
    this.memory.set(key, { at: Date.now(), value: raw });
    setTimeout(() => this.memory.delete(key), ttlMs).unref?.();
  }
}
