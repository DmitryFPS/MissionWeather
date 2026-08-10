'use client';

import { useEffect, useRef } from 'react';

export interface MapPoint {
  lat: number;
  lon: number;
  label?: string;
}

interface MissionMapProps {
  center: MapPoint;
  points?: MapPoint[];
  height?: number;
}

export function MissionMap({ center, points = [], height = 320 }: MissionMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false;

    (async () => {
      const L = await import('leaflet');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (cancelled || !ref.current) return;
      mapRef.current?.remove();
      const map = L.map(ref.current).setView([center.lat, center.lon], 10);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const list = points.length ? points : [center];
      list.forEach((p, i) => {
        L.marker([p.lat, p.lon])
          .addTo(map)
          .bindPopup(p.label ?? `Точка ${i + 1}`);
      });

      if (list.length > 1) {
        L.polyline(list.map((p) => [p.lat, p.lon] as [number, number]), { color: '#3b82f6' }).addTo(map);
        map.fitBounds(L.latLngBounds(list.map((p) => [p.lat, p.lon] as [number, number])), { padding: [24, 24] });
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [center.lat, center.lon, JSON.stringify(points)]);

  return <div ref={ref} style={{ width: '100%', minHeight: height, borderRadius: 12, zIndex: 0 }} />;
}
