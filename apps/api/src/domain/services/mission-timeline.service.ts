import { Injectable } from '@nestjs/common';
import { Waypoint } from '../../domain/entities/user.entity';

export interface TimelinePoint {
  waypointIndex: number;
  lat: number;
  lon: number;
  etaOffsetHours: number;
  etaIso: string;
  segmentKm: number;
  cumulativeKm: number;
}

@Injectable()
export class MissionTimelineService {
  buildTimeline(
    waypoints: Waypoint[],
    cruiseSpeedKmh: number,
    startTime: Date = new Date(),
  ): TimelinePoint[] {
    if (waypoints.length === 0) return [];
    const speed = Math.max(cruiseSpeedKmh, 1);
    let cumulativeKm = 0;
    let cumulativeHours = 0;
    const points: TimelinePoint[] = [];

    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      if (i > 0) {
        const prev = waypoints[i - 1];
        const segmentKm = haversineKm(prev.lat, prev.lon, wp.lat, wp.lon);
        cumulativeKm += segmentKm;
        cumulativeHours += segmentKm / speed;
      }
      const eta = new Date(startTime.getTime() + cumulativeHours * 3600_000);
      points.push({
        waypointIndex: i,
        lat: wp.lat,
        lon: wp.lon,
        etaOffsetHours: cumulativeHours,
        etaIso: eta.toISOString(),
        segmentKm: i === 0 ? 0 : haversineKm(waypoints[i - 1].lat, waypoints[i - 1].lon, wp.lat, wp.lon),
        cumulativeKm,
      });
    }
    return points;
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
