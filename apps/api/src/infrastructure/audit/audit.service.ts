import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuditService {
  private memory: Array<Record<string, unknown>> = [];

  constructor(private readonly db: DatabaseService) {}

  async log(
    userId: string | null,
    action: string,
    resource?: string,
    resourceId?: string,
    meta?: Record<string, unknown>,
  ) {
    if (this.db.enabled) {
      await this.db.query(
        `INSERT INTO audit_log (user_id, action, resource, resource_id, meta)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, action, resource ?? null, resourceId ?? null, meta ? JSON.stringify(meta) : null],
      );
      return;
    }
    this.memory.push({
      userId,
      action,
      resource,
      resourceId,
      meta,
      at: new Date().toISOString(),
    });
    if (this.memory.length > 500) this.memory.shift();
  }

  async list(limit = 50) {
    if (this.db.enabled) {
      return this.db.query(
        `SELECT id, user_id, action, resource, resource_id, meta, created_at
         FROM audit_log ORDER BY created_at DESC LIMIT $1`,
        [limit],
      );
    }
    return this.memory.slice(-limit).reverse();
  }
}
