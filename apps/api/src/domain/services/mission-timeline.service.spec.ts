import { MissionTimelineService } from './mission-timeline.service';

describe('MissionTimelineService', () => {
  it('computes ETA along route', () => {
    const svc = new MissionTimelineService();
    const start = new Date('2026-08-10T08:00:00Z');
    const timeline = svc.buildTimeline(
      [
        { lat: 55.75, lon: 37.62 },
        { lat: 55.80, lon: 37.70 },
      ],
      80,
      start,
    );
    expect(timeline).toHaveLength(2);
    expect(timeline[0].etaOffsetHours).toBe(0);
    expect(timeline[1].cumulativeKm).toBeGreaterThan(0);
    expect(timeline[1].etaOffsetHours).toBeGreaterThan(0);
  });
});
