'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    ymaps?: {
      ready: (cb: () => void) => void;
      Map: new (el: HTMLElement, opts: Record<string, unknown>) => YMap;
      Placemark: new (coords: number[], props?: Record<string, unknown>, opts?: Record<string, unknown>) => unknown;
    };
  }
}

interface YMap {
  geoObjects: { add: (obj: unknown) => void; removeAll: () => void };
  setCenter: (coords: number[], zoom?: number) => void;
  destroy: () => void;
}

export interface MapPoint {
  lat: number;
  lon: number;
  label?: string;
}

interface YandexMapProps {
  center: MapPoint;
  points?: MapPoint[];
  height?: number;
  onClick?: (lat: number, lon: number) => void;
}

export function YandexMap({ center, points = [], height = 320, onClick }: YandexMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<YMap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY;
    if (!key) {
      setError('Задайте NEXT_PUBLIC_YANDEX_MAPS_KEY');
      return;
    }

    const scriptId = 'yandex-maps-script';
    const init = () => {
      if (!ref.current || !window.ymaps) return;
      window.ymaps.ready(() => {
        if (!ref.current) return;
        mapRef.current?.destroy();
        const map = new window.ymaps!.Map(ref.current, {
          center: [center.lat, center.lon],
          zoom: 10,
          controls: ['zoomControl', 'geolocationControl'],
        });
        mapRef.current = map;
        map.geoObjects.removeAll();
        points.forEach((p, i) => {
          map.geoObjects.add(
            new window.ymaps!.Placemark([p.lat, p.lon], { balloonContent: p.label ?? `Точка ${i + 1}` }),
          );
        });
        if (onClick) {
          mapRef.current = map;
        }
      });
    };

    if (document.getElementById(scriptId)) {
      init();
      return () => mapRef.current?.destroy();
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${key}&lang=ru_RU`;
    script.async = true;
    script.onload = init;
    script.onerror = () => setError('Не удалось загрузить Яндекс.Карты');
    document.head.appendChild(script);

    return () => mapRef.current?.destroy();
  }, [center.lat, center.lon, JSON.stringify(points)]);

  if (error) {
    return (
      <div className="map-placeholder" style={{ minHeight: height }}>
        {error}
      </div>
    );
  }

  return <div ref={ref} style={{ width: '100%', minHeight: height, borderRadius: 12 }} />;
}
