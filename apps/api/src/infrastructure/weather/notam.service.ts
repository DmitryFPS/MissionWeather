import { Injectable } from '@nestjs/common';

export interface NotamItem {
  id: string;
  text: string;
  lat?: number;
  lon?: number;
  radiusKm?: number;
  source: 'stub';
}

/** Optional NOTAM provider — stub for Phase 3; replace with FAA/ROSAvia integration */
@Injectable()
export class NotamService {
  async fetchNear(lat: number, lon: number, radiusKm: number): Promise<NotamItem[]> {
    void lat;
    void lon;
    void radiusKm;
    return [];
  }
}
