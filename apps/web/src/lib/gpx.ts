export interface GpxWaypoint {
  lat: number;
  lon: number;
  name?: string;
  elevationM?: number;
}

export function parseGpx(xml: string): GpxWaypoint[] {
  const points: GpxWaypoint[] = [];
  const trkpt = xml.matchAll(/<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/gi);
  for (const m of trkpt) {
    const lat = Number(m[1]);
    const lon = Number(m[2]);
    const inner = m[3];
    const name = inner.match(/<name>([^<]+)<\/name>/i)?.[1];
    const ele = inner.match(/<ele>([^<]+)<\/ele>/i)?.[1];
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    points.push({ lat, lon, name, elevationM: ele ? Number(ele) : undefined });
  }
  if (points.length) return points;

  const wpt = xml.matchAll(/<wpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/wpt>/gi);
  for (const m of wpt) {
    const lat = Number(m[1]);
    const lon = Number(m[2]);
    const name = m[3].match(/<name>([^<]+)<\/name>/i)?.[1];
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    points.push({ lat, lon, name });
  }
  return points;
}

export function buildGpx(name: string, waypoints: GpxWaypoint[]): string {
  const pts = waypoints
    .map(
      (w, i) =>
        `    <trkpt lat="${w.lat}" lon="${w.lon}">\n      <name>${escapeXml(w.name ?? `WP${i + 1}`)}</name>\n    </trkpt>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MissionWeather">
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
${pts}
    </trkseg>
  </trk>
</gpx>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function downloadGpx(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
