import { Injectable, OnModuleInit, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { User, AircraftProfile, Mission, UserRole } from '../../domain/entities/user.entity';
import { FlightThresholds, EMPTY_THRESHOLDS } from '../../domain/entities/flight-thresholds.entity';

@Injectable()
export class StoreService implements OnModuleInit {
  private users = new Map<string, User>();
  private profiles = new Map<string, AircraftProfile>();
  private missions = new Map<string, Mission>();

  async onModuleInit() {
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

  findUserByEmail(email: string) {
    return [...this.users.values()].find((u) => u.email === email);
  }

  findUserById(id: string) {
    return this.users.get(id);
  }

  listUsers() {
    return [...this.users.values()].map(({ passwordHash: _, ...u }) => u);
  }

  async createUser(email: string, password: string, name: string, role: UserRole = 'operator') {
    if (this.users.size >= 10) throw new ConflictException('Достигнут лимит 10 пользователей');
    if (this.findUserByEmail(email)) throw new ConflictException('Email уже занят');
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

  createProfile(ownerId: string, data: Partial<AircraftProfile>) {
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
    this.profiles.set(profile.id, profile);
    return profile;
  }

  listProfiles(userId: string, role: UserRole) {
    return [...this.profiles.values()].filter(
      (p) => p.ownerId === userId || p.isShared || role === 'admin',
    );
  }

  getProfile(id: string, userId: string, role: UserRole) {
    const p = this.profiles.get(id);
    if (!p) throw new NotFoundException('Профиль не найден');
    if (p.ownerId !== userId && !p.isShared && role !== 'admin') throw new ForbiddenException();
    return p;
  }

  updateProfile(id: string, userId: string, role: UserRole, patch: Partial<AircraftProfile>) {
    const p = this.getProfile(id, userId, role);
    if (p.ownerId !== userId && role !== 'admin') throw new ForbiddenException();
    Object.assign(p, patch, { updatedAt: new Date().toISOString() });
    return p;
  }

  createMission(ownerId: string, data: { name: string; profileId: string; waypoints: Mission['waypoints']; plannedDurationHours: number }) {
    this.getProfile(data.profileId, ownerId, 'operator');
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
    this.missions.set(mission.id, mission);
    return mission;
  }

  listMissions(ownerId: string, role: UserRole) {
    return [...this.missions.values()].filter((m) => m.ownerId === ownerId || role === 'admin');
  }

  getMission(id: string, userId: string, role: UserRole) {
    const m = this.missions.get(id);
    if (!m) throw new NotFoundException('Миссия не найдена');
    if (m.ownerId !== userId && role !== 'admin') throw new ForbiddenException();
    return m;
  }
}
