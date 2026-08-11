import { Injectable } from '@nestjs/common';
import {
  ORLAN10_SPECS,
  ORLAN10_TTX_PARAMS,
  SEVERE_WEATHER_CODES,
} from '../presets/orlan-10.preset';
import { OrlanWeatherHour, RouteMissionContext } from '../entities/orlan-weather.entity';
import { TthAssessment, TthCheck, TthStatus } from '../entities/tth-check.entity';

function worst(a: TthStatus, b: TthStatus): TthStatus {
  const order: TthStatus[] = ['INFO', 'GO', 'CAUTION', 'NO_GO'];
  return order[Math.max(order.indexOf(a), order.indexOf(b))] ?? 'NO_GO';
}

function fmtNum(v: number | undefined, unit: string): string {
  if (v === undefined || v === null || Number.isNaN(v)) return '—';
  return `${Math.round(v * 10) / 10} ${unit}`;
}

@Injectable()
export class OrlanTthService {
  evaluate(
    surface: OrlanWeatherHour,
    aloft: OrlanWeatherHour | undefined,
    mission: RouteMissionContext,
  ): TthAssessment {
    const s = ORLAN10_SPECS;
    const checks: TthCheck[] = [];

    const push = (
      id: string,
      group: string,
      label: string,
      status: TthStatus,
      value: string,
      limit: string,
      detail?: string,
    ) => {
      checks.push({ id, group, label, status, value, limit, detail });
    };

    // altitude
    const alt = mission.maxAltitudeM;
    let altStatus: TthStatus = 'GO';
    if (alt < s.altitudeMinM || alt > s.altitudeMaxM) altStatus = 'NO_GO';
    else if (alt > s.ceilingM) altStatus = 'CAUTION';
    push('altitude', 'Высота', 'Высота полёта', altStatus, fmtNum(alt, 'м'), '300–5000 м');

    push('ceiling', 'Высота', 'Потолок борта', 'INFO', fmtNum(s.ceilingM, 'м'), '≤6000 м');

    // wind surface
    const ws = surface.windSpeedMs;
    let windSurf: TthStatus = 'GO';
    if (ws !== undefined) {
      if (ws > s.windLaunchMaxMs) windSurf = ws > s.windCruiseMaxMs ? 'NO_GO' : 'CAUTION';
    }
    push('wind_surface', 'Ветер', 'Ветер у земли', windSurf, fmtNum(ws, 'м/с'), '≤10 м/с');

    const gust = surface.windGustMs;
    let gustSt: TthStatus = 'GO';
    if (gust !== undefined && gust > s.windGustMaxMs) gustSt = gust > s.windGustMaxMs * 1.25 ? 'NO_GO' : 'CAUTION';
    push('wind_gust', 'Ветер', 'Порывы ветра', gustSt, fmtNum(gust, 'м/с'), '≤12 м/с');

    const wa = aloft?.windSpeedMs ?? surface.windSpeedMs;
    let windAlt: TthStatus = 'GO';
    if (wa !== undefined && wa > s.windCruiseMaxMs) windAlt = 'NO_GO';
    else if (wa !== undefined && wa > s.windLaunchMaxMs) windAlt = 'CAUTION';
    push('wind_alt', 'Ветер', 'Ветер на высоте полёта', windAlt, fmtNum(wa, 'м/с'), '≤15 м/с');

    const ts = surface.temperatureC;
    let tempSt: TthStatus = 'GO';
    if (ts !== undefined && (ts < s.tempSurfaceMinC || ts > s.tempSurfaceMaxC)) tempSt = 'NO_GO';
    push('temp_surface', 'Температура', 'Температура у земли', tempSt, fmtNum(ts, '°C'), '−30…+40 °C');

    const ta = surface.apparentTemperatureC;
    let appSt: TthStatus = 'INFO';
    if (ta !== undefined && (ta < s.tempSurfaceMinC || ta > s.tempSurfaceMaxC)) appSt = 'CAUTION';
    push('temp_apparent', 'Температура', 'Ощущаемая температура', appSt, fmtNum(ta, '°C'), '−30…+40 °C');

    const tAlt = aloft?.temperatureC;
    push('temp_alt', 'Температура', 'Температура на высоте', 'INFO', fmtNum(tAlt, '°C'), 'контроль обледенения');

    const rh = aloft?.relativeHumidityPct;
    let rhSt: TthStatus = 'INFO';
    if (rh !== undefined && rh >= s.rhIcingThreshold) rhSt = 'CAUTION';
    push('rh_alt', 'Температура', 'Влажность на высоте', rhSt, fmtNum(rh, '%'), '<80% вне зоны льда');

    const td = aloft?.dewPointC;
    const tForDew = aloft?.temperatureC;
    let dewSt: TthStatus = 'INFO';
    if (td !== undefined && tForDew !== undefined) {
      const delta = tForDew - td;
      if (delta <= 3) dewSt = delta <= 1 ? 'NO_GO' : 'CAUTION';
      push('dewpoint_alt', 'Температура', 'Точка росы на высоте', dewSt, `ΔT ${fmtNum(delta, '°C')}`, 'ΔT > 3 °C');
    } else {
      push('dewpoint_alt', 'Температура', 'Точка росы на высоте', 'INFO', '—', 'ΔT > 3 °C');
    }

    const fz = surface.freezingLevelM;
    let fzSt: TthStatus = 'INFO';
    if (fz !== undefined && fz <= mission.maxAltitudeM) fzSt = 'CAUTION';
    push('freezing_level', 'Обледенение', 'Уровень 0 °C', fzSt, fmtNum(fz, 'м'), 'выше высоты полёта');

    let iceSt: TthStatus = 'GO';
    if (
      tForDew !== undefined &&
      rh !== undefined &&
      tForDew <= s.tempIcingMaxC &&
      rh >= s.rhIcingThreshold
    ) {
      iceSt = tForDew <= 0 ? 'NO_GO' : 'CAUTION';
    } else if (tForDew !== undefined && tForDew <= s.tempIcingWarnC && rh !== undefined && rh >= 70) {
      iceSt = 'CAUTION';
    }
    push('icing', 'Обледенение', 'Риск обледенения', iceSt, iceSt === 'GO' ? 'низкий' : 'повышенный', 'нет высокого риска');

    const rain = surface.rainMmH ?? 0;
    let rainSt: TthStatus = 'GO';
    if (rain > s.rainForbiddenMmH) rainSt = 'NO_GO';
    else if (rain > s.rainMaxMmH) rainSt = 'CAUTION';
    push('rain', 'Осадки', 'Дождь', rainSt, fmtNum(rain, 'мм/ч'), '≤0,5 мм/ч');

    const showers = surface.showersMmH ?? 0;
    let shSt: TthStatus = 'GO';
    if (showers > s.rainForbiddenMmH) shSt = 'NO_GO';
    else if (showers > s.showersMaxMmH) shSt = 'CAUTION';
    push('showers', 'Осадки', 'Ливни', shSt, fmtNum(showers, 'мм/ч'), '≤0,5 мм/ч');

    const precip = surface.precipitationMmH ?? 0;
    let prSt: TthStatus = 'GO';
    if (precip > s.precipForbiddenMmH) prSt = 'NO_GO';
    else if (precip > s.precipMaxMmH) prSt = 'CAUTION';
    push('precip', 'Осадки', 'Осадки общие', prSt, fmtNum(precip, 'мм/ч'), '≤0,5 мм/ч');

    const snow = surface.snowfallMmH ?? 0;
    let snowSt: TthStatus = snow >= s.snowForbiddenMmH ? 'NO_GO' : snow > 0 ? 'CAUTION' : 'GO';
    push('snow', 'Осадки', 'Снег', snowSt, fmtNum(snow, 'мм/ч'), '0 мм/ч');

    const pp = surface.precipProbabilityPct;
    let ppSt: TthStatus = 'INFO';
    if (pp !== undefined) {
      if (pp >= s.precipProbabilityForbidden) ppSt = 'NO_GO';
      else if (pp >= s.precipProbabilityWarn) ppSt = 'CAUTION';
      else ppSt = 'GO';
    }
    push('precip_prob', 'Осадки', 'Вероятность осадков', ppSt, fmtNum(pp, '%'), '<50%');

    const wc = surface.weatherCode;
    let wcSt: TthStatus = 'INFO';
    if (wc !== undefined) {
      wcSt = SEVERE_WEATHER_CODES.has(wc) ? 'NO_GO' : 'GO';
    }
    push('weather_code', 'Явления', 'Погодный код', wcSt, wc !== undefined ? String(wc) : '—', 'без грозы/сильных осадков');

    const cape = surface.cape;
    let capeSt: TthStatus = 'INFO';
    if (cape !== undefined) {
      if (cape >= s.capeForbidden) capeSt = 'NO_GO';
      else if (cape >= s.capeWarn) capeSt = 'CAUTION';
      else capeSt = 'GO';
    }
    push('cape', 'Явления', 'CAPE (грозы)', capeSt, fmtNum(cape, 'J/kg'), '<1000 J/kg');

    const li = surface.liftedIndex;
    let liSt: TthStatus = 'INFO';
    if (li !== undefined) {
      liSt = li <= s.liftedIndexWarn ? 'CAUTION' : 'GO';
    }
    push('lifted_index', 'Явления', 'Lifted Index', liSt, li !== undefined ? String(Math.round(li * 10) / 10) : '—', '>0');

    const cl = surface.cloudCoverLowPct;
    let clSt: TthStatus = 'INFO';
    if (cl !== undefined) clSt = cl >= s.cloudLowWarn ? 'CAUTION' : 'GO';
    push('cloud_low', 'Облачность', 'Нижняя облачность', clSt, fmtNum(cl, '%'), '<80%');

    push('cloud_mid', 'Облачность', 'Средняя облачность', 'INFO', fmtNum(surface.cloudCoverMidPct, '%'), 'информационно');
    push('cloud_high', 'Облачность', 'Высокая облачность', 'INFO', fmtNum(surface.cloudCoverHighPct, '%'), 'информационно');

    const ct = surface.cloudCoverPct;
    let ctSt: TthStatus = 'INFO';
    if (ct !== undefined) ctSt = ct >= s.cloudTotalWarn ? 'CAUTION' : 'GO';
    push('cloud_total', 'Облачность', 'Общая облачность', ctSt, fmtNum(ct, '%'), '<90%');

    const vis = surface.visibilityM;
    let visSt: TthStatus = 'GO';
    if (vis !== undefined && vis < s.visibilityMinM) visSt = vis < s.visibilityMinM / 2 ? 'NO_GO' : 'CAUTION';
    push('visibility', 'Видимость', 'Видимость', visSt, vis !== undefined ? `${Math.round(vis)} м` : '—', '≥3000 м');

    push('pressure', 'Давление', 'Давление у земли', 'INFO', fmtNum(surface.surfacePressureHpa, 'гПа'), 'информационно');

    let rangeSt: TthStatus = 'GO';
    if (mission.totalDistanceKm > s.rangeKm) rangeSt = 'NO_GO';
    else if (mission.totalDistanceKm > s.rangeKm * 0.9) rangeSt = 'CAUTION';
    push('range', 'Маршрут', 'Дальность', rangeSt, fmtNum(mission.totalDistanceKm, 'км'), '≤120 км');

    let endSt: TthStatus = 'GO';
    if (mission.flightDurationHours > s.enduranceHours) endSt = 'NO_GO';
    else if (mission.flightDurationHours > s.enduranceHours * 0.9) endSt = 'CAUTION';
    push('endurance', 'Маршрут', 'Автономность', endSt, fmtNum(mission.flightDurationHours, 'ч'), '≤8 ч');

    let status: TthStatus = 'GO';
    const problemIds: string[] = [];
    for (const c of checks) {
      if (c.status === 'INFO') continue;
      status = worst(status, c.status);
      if (c.status === 'NO_GO' || c.status === 'CAUTION') problemIds.push(c.id);
    }

    // Ensure all 28 params present (match ORLAN10_TTX_PARAMS order)
    const byId = new Map(checks.map((c) => [c.id, c]));
    const ordered = ORLAN10_TTX_PARAMS.map((p) => byId.get(p.id)!);

    return { status, checks: ordered, problemIds };
  }
}
