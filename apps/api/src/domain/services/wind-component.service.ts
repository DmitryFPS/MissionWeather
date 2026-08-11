/** Bearing from point 1 to point 2, degrees 0–360 */
export function trackBearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Headwind (+) opposes track; crosswind (+) from right */
export function windComponents(
  windSpeedMs: number,
  windFromDeg: number,
  trackBearingDeg: number,
): { headwindMs: number; crosswindMs: number } {
  const angle = toRad(windFromDeg - trackBearingDeg);
  return {
    headwindMs: windSpeedMs * Math.cos(angle),
    crosswindMs: windSpeedMs * Math.sin(angle),
  };
}

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

function toDeg(r: number): number {
  return (r * 180) / Math.PI;
}
