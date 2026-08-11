/** Hourly weather slice from Open-Meteo for Orlan TTH evaluation */
export interface OrlanWeatherHour {
  time: string;
  /** Surface / flight level */
  altitudeM: number;
  windSpeedMs?: number;
  windDirectionDeg?: number;
  windGustMs?: number;
  temperatureC?: number;
  apparentTemperatureC?: number;
  relativeHumidityPct?: number;
  dewPointC?: number;
  precipitationMmH?: number;
  rainMmH?: number;
  showersMmH?: number;
  snowfallMmH?: number;
  precipProbabilityPct?: number;
  cloudCoverPct?: number;
  cloudCoverLowPct?: number;
  cloudCoverMidPct?: number;
  cloudCoverHighPct?: number;
  visibilityM?: number;
  surfacePressureHpa?: number;
  weatherCode?: number;
  freezingLevelM?: number;
  cape?: number;
  liftedIndex?: number;
}

export interface RouteMissionContext {
  maxAltitudeM: number;
  totalDistanceKm: number;
  flightDurationHours: number;
  cruiseSpeedKmh: number;
}
