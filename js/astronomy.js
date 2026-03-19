import { TITHIS } from "./constants.js";
import { addLocalDays, getDateFromLocalParts, getDayOfYear } from "./date-utils.js";

export function findLunarMonthStart(referenceDay, config) {
  for (let offset = 0; offset <= 35; offset += 1) {
    const candidate = addLocalDays(referenceDay, -offset);
    const candidateTithi = getTithiAtSunrise(candidate, config);
    const previousTithi = getTithiAtSunrise(addLocalDays(candidate, -1), config);

    if (candidateTithi.index === 1 && previousTithi.index !== 1) {
      return candidate;
    }
  }

  return referenceDay;
}

export function findNextLunarMonthStart(referenceDay, config) {
  for (let offset = 1; offset <= 35; offset += 1) {
    const candidate = addLocalDays(referenceDay, offset);
    const candidateTithi = getTithiAtSunrise(candidate, config);
    const previousTithi = getTithiAtSunrise(addLocalDays(candidate, -1), config);

    if (candidateTithi.index === 1 && previousTithi.index !== 1) {
      return candidate;
    }
  }

  return addLocalDays(referenceDay, 30);
}

export function getTithiAtSunrise(localDay, config) {
  const sunrise = getSunriseDate(localDay, config.lat, config.lon, config.timeZone);
  return getTithiForDate(sunrise);
}

export function getTithiForDate(date) {
  const julianDay = date.getTime() / 86400000 + 2440587.5;
  const daysSinceJ2000 = julianDay - 2451543.5;
  const solarLongitude = getSolarLongitude(daysSinceJ2000);
  const lunarLongitude = getLunarLongitude(
    daysSinceJ2000,
    solarLongitude.meanAnomaly,
    solarLongitude.longitude
  );
  const phaseAngle = normalizeDegrees(lunarLongitude - solarLongitude.longitude);
  const tithiIndex = Math.floor(phaseAngle / 12) % 30;

  return {
    index: tithiIndex + 1,
    name: TITHIS[tithiIndex],
    paksha: tithiIndex < 15 ? "Shukla" : "Krishna"
  };
}

function getSolarLongitude(daysSinceJ2000) {
  const perihelion = normalizeDegrees(282.9404 + 0.0000470935 * daysSinceJ2000);
  const eccentricity = 0.016709 - 0.000000001151 * daysSinceJ2000;
  const meanAnomaly = normalizeDegrees(356.047 + 0.9856002585 * daysSinceJ2000);
  const eccentricAnomaly =
    meanAnomaly +
    (180 / Math.PI) *
      eccentricity *
      Math.sin(toRadians(meanAnomaly)) *
      (1 + eccentricity * Math.cos(toRadians(meanAnomaly)));
  const x = Math.cos(toRadians(eccentricAnomaly)) - eccentricity;
  const y = Math.sin(toRadians(eccentricAnomaly)) * Math.sqrt(1 - eccentricity ** 2);
  const trueAnomaly = toDegrees(Math.atan2(y, x));
  const longitude = normalizeDegrees(trueAnomaly + perihelion);

  return { longitude, meanAnomaly };
}

function getLunarLongitude(daysSinceJ2000, solarMeanAnomaly, solarLongitude) {
  const ascendingNode = normalizeDegrees(125.1228 - 0.0529538083 * daysSinceJ2000);
  const inclination = 5.1454;
  const periapsis = normalizeDegrees(318.0634 + 0.1643573223 * daysSinceJ2000);
  const meanAnomaly = normalizeDegrees(115.3654 + 13.0649929509 * daysSinceJ2000);
  const meanLongitude = normalizeDegrees(ascendingNode + periapsis + meanAnomaly);
  const meanElongation = normalizeDegrees(meanLongitude - solarLongitude);

  const evection = 1.2739 * Math.sin(toRadians(2 * meanElongation - meanAnomaly));
  const annualEquation = 0.1858 * Math.sin(toRadians(solarMeanAnomaly));
  const correction3 = 0.37 * Math.sin(toRadians(solarMeanAnomaly));
  const correctedAnomaly = meanAnomaly + evection - annualEquation - correction3;
  const equationOfCenter = 6.2886 * Math.sin(toRadians(correctedAnomaly));
  const correction4 = 0.214 * Math.sin(toRadians(2 * correctedAnomaly));
  const correctedLongitude =
    meanLongitude + evection + equationOfCenter - annualEquation + correction4;
  const variation = 0.6583 * Math.sin(toRadians(2 * (correctedLongitude - solarLongitude)));
  const trueLongitude = correctedLongitude + variation;
  const correctedNode = ascendingNode - 0.16 * Math.sin(toRadians(solarMeanAnomaly));

  const longitudeRadians = toRadians(normalizeDegrees(trueLongitude - correctedNode));
  const nodeRadians = toRadians(correctedNode);
  const inclinationRadians = toRadians(inclination);

  const x =
    Math.cos(nodeRadians) * Math.cos(longitudeRadians) -
    Math.sin(nodeRadians) * Math.sin(longitudeRadians) * Math.cos(inclinationRadians);
  const y =
    Math.sin(nodeRadians) * Math.cos(longitudeRadians) +
    Math.cos(nodeRadians) * Math.sin(longitudeRadians) * Math.cos(inclinationRadians);

  return normalizeDegrees(toDegrees(Math.atan2(y, x)));
}

function getSunriseDate(localDay, lat, lon, timeZone) {
  const dayOfYear = getDayOfYear(localDay.year, localDay.month, localDay.day);
  const lngHour = lon / 15;
  const approximateTime = dayOfYear + (6 - lngHour) / 24;
  const meanAnomaly = 0.9856 * approximateTime - 3.289;
  const trueLongitude = normalizeDegrees(
    meanAnomaly +
      1.916 * Math.sin(toRadians(meanAnomaly)) +
      0.02 * Math.sin(toRadians(2 * meanAnomaly)) +
      282.634
  );
  let rightAscension = toDegrees(Math.atan(0.91764 * Math.tan(toRadians(trueLongitude))));
  rightAscension = normalizeDegrees(rightAscension);
  rightAscension += getQuadrantCorrection(trueLongitude, rightAscension);
  rightAscension /= 15;

  const sinDeclination = 0.39782 * Math.sin(toRadians(trueLongitude));
  const cosDeclination = Math.cos(Math.asin(sinDeclination));
  const cosHourAngle =
    (Math.cos(toRadians(90.833)) - sinDeclination * Math.sin(toRadians(lat))) /
    (cosDeclination * Math.cos(toRadians(lat)));

  if (cosHourAngle > 1 || cosHourAngle < -1) {
    return getDateFromLocalParts(localDay.year, localDay.month, localDay.day, 6, 0, timeZone);
  }

  const localHourAngle = (360 - toDegrees(Math.acos(cosHourAngle))) / 15;
  const localMeanTime = localHourAngle + rightAscension - 0.06571 * approximateTime - 6.622;
  const universalTime = normalizeHours(localMeanTime - lngHour);
  const wholeMinutes = Math.round(universalTime * 60);

  return new Date(Date.UTC(localDay.year, localDay.month - 1, localDay.day, 0, wholeMinutes, 0));
}

function getQuadrantCorrection(trueLongitude, rightAscension) {
  const longitudeQuadrant = Math.floor(trueLongitude / 90) * 90;
  const raQuadrant = Math.floor(rightAscension / 90) * 90;
  return longitudeQuadrant - raQuadrant;
}

function normalizeDegrees(angle) {
  return ((angle % 360) + 360) % 360;
}

function normalizeHours(hours) {
  return ((hours % 24) + 24) % 24;
}

function toRadians(angle) {
  return (angle * Math.PI) / 180;
}

function toDegrees(angle) {
  return (angle * 180) / Math.PI;
}
