import { Injectable, OnModuleInit, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { User, AircraftProfile, Mission, UserRole } from '../../domain/entities/user.entity';
import { FlightThresholds, EMPTY_THRESHOLDS } from '../../domain/entities/flight-thresholds.entity';
import { ORLAN10_PROFILE_DEFAULTS } from '../../domain/presets/orlan-10.preset';
import { DatabaseService } from '../database/database.service';

type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class StoreService implements OnModuleInit {
  private users = new Map<string, User>();
  private profiles = new Map<string, AircraftProfile>();
  private missions = new Map<string, Mission>();
  private usePostgres = false;

  constructor(private readonly db: DatabaseService) {}

  async onModuleInit() {
    this.usePostgres = this.db.enabled;
    if (this.usePostgres) {
      await this.seedAdminPostgres();
      await this.seedOrlanProfilePostgres();
    } else {
      await this.seedAdminMemory();
      await this.seedOrlanProfileMemory();
    }
  }

  private async seedAdminMemory() {
    const hash = await bcrypt.hash('admin123', 10);
    const admin: User = {
      id: uuid(),
      email: 'admin@missionweather.local',
      passwordHash: hash,
      role: 'admin',
      name: 'Администратор',
      createdAt: new Date().toISOString(),
    };
    this.users.set(admin.id, admin);
  }

  private async seedOrlanProfileMemory() {
    const admin = [...this.users.values()].find((u) => u.role === 'admin');
    if (!admin) return;
    const exists = [...this.profiles.values()].some((p) => p.thresholds.preset === 'orlan-10');
    if (exists) return;
    await this.createProfile(admin.id, ORLAN10_PROFILE_DEFAULTS);
  }

  private async seedOrlanProfilePostgres() {
    const rows = await this.db.query<{ id: string }>(
      `SELECT id FROM aircraft_profiles WHERE thresholds->>'preset' = 'orlan-10' LIMIT 1`,
    );
    if (rows.length) return;
    const admins = await this.db.query<{ id: string }>(
      `SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1`,
    );
    const ownerId = admins[0]?.id;
    if (!ownerId) return;
    await this.createProfile(ownerId, ORLAN10_PROFILE_DEFAULTS);
  }

  async updateMission(
    id: string,
    userId: string,
    role: UserRole,
    patch: Partial<Pick<Mission, 'name' | 'waypoints' | 'plannedDurationHours' | 'profileId'>>,
  ): Promise<Mission> {
    const m = await this.getMission(id, userId, role);
    if (m.ownerId !== userId && role !== 'admin') throw new ForbiddenException();
    Object.assign(m, patch, { updatedAt: new Date().toISOString() });
    if (this.usePostgres) {
      await this.db.query(
        `UPDATE missions SET name = $2, waypoints = $3, planned_duration_hours = $4, profile_id = COALESCE($5, profile_id), updated_at = NOW() WHERE id = $1`,
        [
          id,
          m.name,
          JSON.stringify(m.waypoints),
          m.plannedDurationHours,
          patch.profileId ?? null,
        ],
      );
    }
    return m;
  }

  async deleteMission(id: string, userId: string, role: UserRole): Promise<void> {
    const m = await this.getMission(id, userId, role);
    if (m.ownerId !== userId && role !== 'admin') throw new ForbiddenException();
    if (this.usePostgres) {
      await this.db.query('DELETE FROM missions WHERE id = $1', [id]);
    } else {
      this.missions.delete(id);
    }
  }

  private async seedAdminPostgres() {
    const rows = await this.db.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      ['admin@missionweather.local'],
    );
    if (rows.length) return;
    const hash = await bcrypt.hash('admin123', 10);
    await this.db.query(
      `INSERT INTO users (email, password_hash, role, name) VALUES ($1, $2, $3, $4)`,
      ['admin@missionweather.local', hash, 'admin', 'Администратор'],
    );
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    if (!this.usePostgres) return [...this.users.values()].find((u) => u.email === email);
    const rows = await this.db.query<{
      id: string;
      email: string;
      password_hash: string;
      role: UserRole;
      name: string;
      created_at: Date;
    }>('SELECT * FROM users WHERE email = $1', [email]);
    const r = rows[0];
    if (!r) return undefined;
    return this.mapUser(r);
  }

  async findUserById(id: string): Promise<User | undefined> {
    if (!this.usePostgres) return this.users.get(id);
    const rows = await this.db.query<{
      id: string;
      email: string;
      password_hash: string;
      role: UserRole;
      name: string;
      created_at: Date;
    }>('SELECT * FROM users WHERE id = $1', [id]);
    const r = rows[0];
    return r ? this.mapUser(r) : undefined;
  }

  async listUsers(): Promise<SafeUser[]> {
    if (!this.usePostgres) {
      return [...this.users.values()].map(({ passwordHash: _, ...u }) => u);
    }
    const rows = await this.db.query<{
      id: string;
      email: string;
      role: UserRole;
      name: string;
      created_at: Date;
    }>('SELECT id, email, role, name, created_at FROM users ORDER BY created_at');
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      role: r.role,
      name: r.name,
      createdAt: r.created_at.toISOString(),
    }));
  }

  async createUser(email: string, password: string, name: string, role: UserRole = 'operator'): Promise<SafeUser> {
    if (this.usePostgres) {
      const count = await this.db.query<{ c: string }>('SELECT COUNT(*)::text AS c FROM users');
      if (Number(count[0]?.c ?? 0) >= 10) throw new ConflictException('Достигнут лимит 10 пользователей');
      const hash = await bcrypt.hash(password, 10);
      try {
        const rows = await this.db.query<{
          id: string;
          email: string;
          role: UserRole;
          name: string;
          created_at: Date;
        }>(
          `INSERT INTO users (email, password_hash, role, name) VALUES ($1, $2, $3, $4)
           RETURNING id, email, role, name, created_at`,
          [email, hash, role, name],
        );
        const r = rows[0];
        return { id: r.id, email: r.email, role: r.role, name: r.name, createdAt: r.created_at.toISOString() };
      } catch {
        throw new ConflictException('Email уже занят');
      }
    }
    if (this.users.size >= 10) throw new ConflictException('Достигнут лимит 10 пользователей');
    if (await this.findUserByEmail(email)) throw new ConflictException('Email уже занят');
    const user: User = {
      id: uuid(),
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role,
      name,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  validatePassword(user: User, password: string) {
    return bcrypt.compare(password, user.passwordHash);
  }

  async createProfile(ownerId: string, data: Partial<AircraftProfile>): Promise<AircraftProfile> {
    const now = new Date().toISOString();
    const profile: AircraftProfile = {
      id: uuid(),
      ownerId,
      name: data.name ?? 'Новый борт',
      isShared: data.isShared ?? false,
      cruiseSpeedKmh: data.cruiseSpeedKmh ?? 80,
      maxDurationHours: data.maxDurationHours ?? 4,
      thresholds: data.thresholds ?? EMPTY_THRESHOLDS,
      fusionSourceIds: data.fusionSourceIds ?? [],
      fusionWeights: data.fusionWeights ?? [],
      aiModelId: data.aiModelId,
      aiEnabled: data.aiEnabled ?? false,
      createdAt: now,
      updatedAt: now,
    };
    if (this.usePostgres) {
      const rows = await this.db.query<{ id: string; created_at: Date; updated_at: Date }>(
        `INSERT INTO aircraft_profiles
         (owner_id, name, is_shared, cruise_speed_kmh, max_duration_hours, thresholds,
          fusion_source_ids, fusion_weights, ai_model_id, ai_enabled)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id, created_at, updated_at`,
        [
          ownerId,
          profile.name,
          profile.isShared,
          profile.cruiseSpeedKmh,
          profile.maxDurationHours,
          JSON.stringify(profile.thresholds),
          JSON.stringify(profile.fusionSourceIds),
          JSON.stringify(profile.fusionWeights),
          profile.aiModelId ?? null,
          profile.aiEnabled,
        ],
      );
      profile.id = rows[0].id;
      profile.createdAt = rows[0].created_at.toISOString();
      profile.updatedAt = rows[0].updated_at.toISOString();
      return profile;
    }
    this.profiles.set(profile.id, profile);
    return profile;
  }

  async listProfiles(userId: string, role: UserRole): Promise<AircraftProfile[]> {
    if (!this.usePostgres) {
      return [...this.profiles.values()].filter(
        (p) => p.ownerId === userId || p.isShared || role === 'admin',
      );
    }
    const rows = await this.db.query('SELECT * FROM aircraft_profiles WHERE owner_id = $1 OR is_shared = true OR $2 = $3', [
      userId,
      role,
      'admin',
    ]);
    return rows.map((r) => this.mapProfile(r as Record<string, unknown>));
  }

  async getProfile(id: string, userId: string, role: UserRole): Promise<AircraftProfile> {
    let p: AircraftProfile | undefined;
    if (this.usePostgres) {
      const rows = await this.db.query('SELECT * FROM aircraft_profiles WHERE id = $1', [id]);
      p = rows[0] ? this.mapProfile(rows[0] as Record<string, unknown>) : undefined;
    } else {
      p = this.profiles.get(id);
    }
    if (!p) throw new NotFoundException('Профиль не найден');
    if (p.ownerId !== userId && !p.isShared && role !== 'admin') throw new ForbiddenException();
    return p;
  }

  async updateProfile(
    id: string,
    userId: string,
    role: UserRole,
    patch: Partial<AircraftProfile>,
  ): Promise<AircraftProfile> {
    const p = await this.getProfile(id, userId, role);
    if (p.ownerId !== userId && role !== 'admin') throw new ForbiddenException();
    Object.assign(p, patch, { updatedAt: new Date().toISOString() });
    if (this.usePostgres) {
      await this.db.query(
        `UPDATE aircraft_profiles SET
          name = $2, is_shared = $3, cruise_speed_kmh = $4, max_duration_hours = $5,
          thresholds = $6, fusion_source_ids = $7, fusion_weights = $8,
          ai_model_id = $9, ai_enabled = $10, updated_at = NOW()
         WHERE id = $1`,
        [
          id,
          p.name,
          p.isShared,
          p.cruiseSpeedKmh,
          p.maxDurationHours,
          JSON.stringify(p.thresholds),
          JSON.stringify(p.fusionSourceIds),
          JSON.stringify(p.fusionWeights),
          p.aiModelId ?? null,
          p.aiEnabled,
        ],
      );
    }
    return p;
  }

  async createMission(
    ownerId: string,
    data: { name: string; profileId: string; waypoints: Mission['waypoints']; plannedDurationHours: number },
  ): Promise<Mission> {
    await this.getProfile(data.profileId, ownerId, 'operator');
    const now = new Date().toISOString();
    const mission: Mission = {
      id: uuid(),
      ownerId,
      name: data.name,
      profileId: data.profileId,
      waypoints: data.waypoints,
      plannedDurationHours: data.plannedDurationHours,
      createdAt: now,
      updatedAt: now,
    };
    if (this.usePostgres) {
      const rows = await this.db.query<{ id: string; created_at: Date; updated_at: Date }>(
        `INSERT INTO missions (owner_id, profile_id, name, waypoints, planned_duration_hours)
         VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at, updated_at`,
        [ownerId, data.profileId, data.name, JSON.stringify(data.waypoints), data.plannedDurationHours],
      );
      mission.id = rows[0].id;
      mission.createdAt = rows[0].created_at.toISOString();
      mission.updatedAt = rows[0].updated_at.toISOString();
      return mission;
    }
    this.missions.set(mission.id, mission);
    return mission;
  }

  async listMissions(ownerId: string, role: UserRole): Promise<Mission[]> {
    if (!this.usePostgres) {
      return [...this.missions.values()].filter((m) => m.ownerId === ownerId || role === 'admin');
    }
    const rows = await this.db.query('SELECT * FROM missions WHERE owner_id = $1 OR $2 = $3 ORDER BY created_at DESC', [
      ownerId,
      role,
      'admin',
    ]);
    return rows.map((r) => this.mapMission(r as Record<string, unknown>));
  }

  async getMission(id: string, userId: string, role: UserRole): Promise<Mission> {
    let m: Mission | undefined;
    if (this.usePostgres) {
      const rows = await this.db.query('SELECT * FROM missions WHERE id = $1', [id]);
      m = rows[0] ? this.mapMission(rows[0] as Record<string, unknown>) : undefined;
    } else {
      m = this.missions.get(id);
    }
    if (!m) throw new NotFoundException('Миссия не найдена');
    if (m.ownerId !== userId && role !== 'admin') throw new ForbiddenException();
    return m;
  }

  async countUsers(): Promise<number> {
    if (!this.usePostgres) return this.users.size;
    const rows = await this.db.query<{ c: string }>('SELECT COUNT(*)::text AS c FROM users');
    return Number(rows[0]?.c ?? 0);
  }

  private mapUser(r: {
    id: string;
    email: string;
    password_hash: string;
    role: UserRole;
    name: string;
    created_at: Date;
  }): User {
    return {
      id: r.id,
      email: r.email,
      passwordHash: r.password_hash,
      role: r.role,
      name: r.name,
      createdAt: r.created_at.toISOString(),
    };
  }

  private mapProfile(r: Record<string, unknown>): AircraftProfile {
    return {
      id: String(r.id),
      ownerId: String(r.owner_id),
      name: String(r.name),
      isShared: Boolean(r.is_shared),
      cruiseSpeedKmh: Number(r.cruise_speed_kmh),
      maxDurationHours: Number(r.max_duration_hours),
      thresholds: (r.thresholds as FlightThresholds) ?? EMPTY_THRESHOLDS,
      fusionSourceIds: (r.fusion_source_ids as string[]) ?? [],
      fusionWeights: (r.fusion_weights as { sourceId: string; weight: number }[]) ?? [],
      aiModelId: r.ai_model_id ? String(r.ai_model_id) : undefined,
      aiEnabled: Boolean(r.ai_enabled),
      createdAt: (r.created_at as Date).toISOString(),
      updatedAt: (r.updated_at as Date).toISOString(),
    };
  }

  private mapMission(r: Record<string, unknown>): Mission {
    return {
      id: String(r.id),
      ownerId: String(r.owner_id),
      profileId: String(r.profile_id),
      name: String(r.name),
      waypoints: (r.waypoints as Mission['waypoints']) ?? [],
      plannedDurationHours: Number(r.planned_duration_hours),
      createdAt: (r.created_at as Date).toISOString(),
      updatedAt: (r.updated_at as Date).toISOString(),
    };
  }
}
