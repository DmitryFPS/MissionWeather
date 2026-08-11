import { FlightThresholds } from '../entities/flight-thresholds.entity';

export interface Orlan10Specs {
  name: string;
  manufacturer: string;
  type: string;
  massEmptyKg: number;
  massMaxKg: number;
  payloadKg: number;
  wingspanM: number;
  lengthM: number;
  speedCruiseKmh: number;
  altitudeMinM: number;
  altitudeMaxM: number;
  ceilingM: number;
  altitudeScanStepM: number;
  enduranceHours: number;
  rangeKm: number;
  windLaunchMaxMs: number;
  windCruiseMaxMs: number;
  windGustMaxMs: number;
  tempSurfaceMinC: number;
  tempSurfaceMaxC: number;
  precipMaxMmH: number;
  precipForbiddenMmH: number;
  rainMaxMmH: number;
  rainForbiddenMmH: number;
  snowForbiddenMmH: number;
  showersMaxMmH: number;
  precipProbabilityWarn: number;
  precipProbabilityForbidden: number;
  rhIcingThreshold: number;
  tempIcingMaxC: number;
  tempIcingWarnC: number;
  visibilityMinM: number;
  cloudLowWarn: number;
  cloudTotalWarn: number;
  capeWarn: number;
  capeForbidden: number;
  liftedIndexWarn: number;
}

export interface TtxParamDef {
  id: string;
  group: string;
  label: string;
  openMeteo: string;
  limit: string;
}

export const ORLAN10_SPECS: Orlan10Specs = {
  name: 'Орлан-10',
  manufacturer: 'Спецтехцентр (Санкт-Петербург)',
  type: 'разведывательный БПЛА самолётного типа',
  massEmptyKg: 12.5,
  massMaxKg: 18,
  payloadKg: 5,
  wingspanM: 3.1,
  lengthM: 1.8,
  speedCruiseKmh: 100,
  altitudeMinM: 300,
  altitudeMaxM: 5000,
  ceilingM: 6000,
  altitudeScanStepM: 250,
  enduranceHours: 8,
  rangeKm: 120,
  windLaunchMaxMs: 10,
  windCruiseMaxMs: 15,
  windGustMaxMs: 12,
  tempSurfaceMinC: -30,
  tempSurfaceMaxC: 40,
  precipMaxMmH: 0.5,
  precipForbiddenMmH: 2,
  rainMaxMmH: 0.5,
  rainForbiddenMmH: 2,
  snowForbiddenMmH: 1,
  showersMaxMmH: 0.5,
  precipProbabilityWarn: 50,
  precipProbabilityForbidden: 80,
  rhIcingThreshold: 80,
  tempIcingMaxC: 2,
  tempIcingWarnC: 5,
  visibilityMinM: 3000,
  cloudLowWarn: 80,
  cloudTotalWarn: 90,
  capeWarn: 1000,
  capeForbidden: 2500,
  liftedIndexWarn: 0,
};

export const ORLAN10_TTX_PARAMS: TtxParamDef[] = [
  { id: 'altitude', group: 'Высота', label: 'Высота полёта', openMeteo: 'автоанализ 300–5000 м', limit: '300–5000 м' },
  { id: 'ceiling', group: 'Высота', label: 'Потолок борта', openMeteo: 'расчёт', limit: '≤6000 м' },
  { id: 'wind_surface', group: 'Ветер', label: 'Ветер у земли', openMeteo: 'wind_speed_10m', limit: '≤10 м/с (старт/посадка)' },
  { id: 'wind_gust', group: 'Ветер', label: 'Порывы ветра', openMeteo: 'wind_gusts_10m', limit: '≤12 м/с' },
  { id: 'wind_alt', group: 'Ветер', label: 'Ветер на высоте полёта', openMeteo: 'wind_speed_*hPa', limit: '≤15 м/с' },
  { id: 'temp_surface', group: 'Температура', label: 'Температура у земли', openMeteo: 'temperature_2m', limit: '−30…+40 °C' },
  { id: 'temp_apparent', group: 'Температура', label: 'Ощущаемая температура', openMeteo: 'apparent_temperature', limit: '−30…+40 °C' },
  { id: 'temp_alt', group: 'Температура', label: 'Температура на высоте', openMeteo: 'temperature_*hPa', limit: 'контроль обледенения' },
  { id: 'rh_alt', group: 'Температура', label: 'Влажность на высоте', openMeteo: 'relative_humidity_*hPa', limit: '<80% вне зоны льда' },
  { id: 'dewpoint_alt', group: 'Температура', label: 'Точка росы на высоте', openMeteo: 'dew_point_*hPa', limit: 'ΔT > 3 °C' },
  { id: 'freezing_level', group: 'Обледенение', label: 'Уровень 0 °C', openMeteo: 'freezing_level_height', limit: 'выше высоты полёта' },
  { id: 'icing', group: 'Обледенение', label: 'Риск обледенения', openMeteo: 'T + RH + Td на высоте', limit: 'нет высокого риска' },
  { id: 'rain', group: 'Осадки', label: 'Дождь', openMeteo: 'rain', limit: '≤0,5 мм/ч' },
  { id: 'showers', group: 'Осадки', label: 'Ливни', openMeteo: 'showers', limit: '≤0,5 мм/ч' },
  { id: 'precip', group: 'Осадки', label: 'Осадки общие', openMeteo: 'precipitation', limit: '≤0,5 мм/ч' },
  { id: 'snow', group: 'Осадки', label: 'Снег', openMeteo: 'snowfall', limit: '0 мм/ч' },
  { id: 'precip_prob', group: 'Осадки', label: 'Вероятность осадков', openMeteo: 'precipitation_probability', limit: '<50%' },
  { id: 'weather_code', group: 'Явления', label: 'Погодный код', openMeteo: 'weather_code', limit: 'без грозы/сильных осадков' },
  { id: 'cape', group: 'Явления', label: 'CAPE (грозы)', openMeteo: 'cape', limit: '<1000 J/kg' },
  { id: 'lifted_index', group: 'Явления', label: 'Lifted Index', openMeteo: 'lifted_index', limit: '>0' },
  { id: 'cloud_low', group: 'Облачность', label: 'Нижняя облачность', openMeteo: 'cloud_cover_low', limit: '<80%' },
  { id: 'cloud_mid', group: 'Облачность', label: 'Средняя облачность', openMeteo: 'cloud_cover_mid', limit: 'информационно' },
  { id: 'cloud_high', group: 'Облачность', label: 'Высокая облачность', openMeteo: 'cloud_cover_high', limit: 'информационно' },
  { id: 'cloud_total', group: 'Облачность', label: 'Общая облачность', openMeteo: 'cloud_cover', limit: '<90%' },
  { id: 'visibility', group: 'Видимость', label: 'Видимость', openMeteo: 'visibility', limit: '≥3000 м' },
  { id: 'pressure', group: 'Давление', label: 'Давление у земли', openMeteo: 'surface_pressure', limit: 'информационно' },
  { id: 'range', group: 'Маршрут', label: 'Дальность', openMeteo: 'расчёт по точкам', limit: '≤120 км' },
  { id: 'endurance', group: 'Маршрут', label: 'Автономность', openMeteo: 'расчёт по времени', limit: '≤8 ч' },
];

export const ORLAN10_PRESSURE_LEVELS = [
  { id: 'surface', meters: 0, label: '0 м · земля' },
  { id: '1000h', meters: 110, label: '110 м' },
  { id: '950h', meters: 500, label: '500 м' },
  { id: '925h', meters: 760, label: '760 м' },
  { id: '900h', meters: 1000, label: '1000 м' },
  { id: '850h', meters: 1500, label: '1500 м' },
  { id: '800h', meters: 1900, label: '1900 м' },
  { id: '700h', meters: 3000, label: '3000 м' },
  { id: '600h', meters: 4200, label: '4200 м' },
  { id: '500h', meters: 5600, label: '5600 м' },
  { id: '400h', meters: 7200, label: '7200 м' },
  { id: '300h', meters: 9160, label: '9160 м' },
  { id: '200h', meters: 11800, label: '11800 m' },
  { id: '150h', meters: 13600, label: '13600 m' },
];

export const ORLAN10_THRESHOLDS: FlightThresholds = {
  preset: 'orlan-10',
  windSpeedMs: { goMax: 10, cautionMax: 12 },
  windGustMs: { goMax: 12 },
  visibilityKm: { goMin: 3 },
  precipitationMmH: { goMax: 0.5, cautionMax: 2 },
  temperatureC: { goMin: -30, goMax: 40 },
  maxSourceSpreadMs: 3,
};

export const ORLAN10_PROFILE_DEFAULTS = {
  name: 'Орлан-10 (пресет)',
  cruiseSpeedKmh: ORLAN10_SPECS.speedCruiseKmh,
  maxDurationHours: ORLAN10_SPECS.enduranceHours,
  isShared: true,
  thresholds: ORLAN10_THRESHOLDS,
};

/** WMO weather codes with thunder/heavy precip — NO_GO */
export const SEVERE_WEATHER_CODES = new Set([
  95, 96, 99, 65, 66, 67, 75, 77, 82, 86,
]);
