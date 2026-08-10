export type UserRole = 'admin' | 'operator';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  createdAt: string;
}

export interface AircraftProfile {
  id: string;
  ownerId: string;
  name: string;
  isShared: boolean;
  cruiseSpeedKmh: number;
  maxDurationHours: number;
  thresholds: import('./flight-thresholds.entity').FlightThresholds;
  fusionSourceIds: string[];
  fusionWeights: { sourceId: string; weight: number }[];
  aiModelId?: string;
  aiEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Waypoint {
  lat: number;
  lon: number;
  altitudeAglM?: number;
}

export interface Mission {
  id: string;
  ownerId: string;
  name: string;
  profileId: string;
  waypoints: Waypoint[];
  plannedDurationHours: number;
  createdAt: string;
  updatedAt: string;
}
