import {
  addLocalDays,
  formatLocalMonthDay,
  getDateFromLocalParts,
  getLocalDateParts,
  getLocalDayKey,
  parseLocalDayKey
} from "../../js/date-utils.js";
import {
  findLunarMonthStart,
  findNextLunarMonthStart,
  getTithiAtSunrise
} from "../../js/astronomy.js";
import { getMonthHeader } from "../../js/newari-months.js";
import { getLocationConfig } from "../../js/location.js";
import { getExpectedRecordsForMonth } from "../../js/period-tracking.js";

export const LABEL_MODES = {
  traditional: "traditional",
  english: "english"
};

const PHASE_LABELS = {
  waxingCrescent: "🌒",
  firstQuarter: "🌓",
  waxingGibbous: "🌔",
  waningGibbous: "🌖",
  lastQuarter: "🌗",
  waningCrescent: "🌘"
};

function getEnglishTithiLabel(tithiIndex) {
  if (tithiIndex === 15) {
    return {
      primary: "Full Moon",
      secondary: ""
    };
  }

  if (tithiIndex === 30) {
    return {
      primary: "New Moon",
      secondary: ""
    };
  }

  const pakshaDay = tithiIndex <= 15 ? tithiIndex : tithiIndex - 15;

  if (tithiIndex <= 5) {
    return { primary: String(pakshaDay), secondary: PHASE_LABELS.waxingCrescent };
  }

  if (tithiIndex <= 8) {
    return { primary: String(pakshaDay), secondary: PHASE_LABELS.firstQuarter };
  }

  if (tithiIndex <= 14) {
    return { primary: String(pakshaDay), secondary: PHASE_LABELS.waxingGibbous };
  }

  if (tithiIndex <= 21) {
    return { primary: String(pakshaDay), secondary: PHASE_LABELS.waningGibbous };
  }

  if (tithiIndex <= 24) {
    return { primary: String(pakshaDay), secondary: PHASE_LABELS.lastQuarter };
  }

  return { primary: String(pakshaDay), secondary: PHASE_LABELS.waningCrescent };
}

export function getTithiDisplayLabel(tithiIndex, tithiName, labelMode) {
  if (labelMode === LABEL_MODES.english) {
    return getEnglishTithiLabel(tithiIndex);
  }

  return {
    primary: tithiName,
    secondary: ""
  };
}

export function formatTithiText(tithiIndex, tithiName, labelMode) {
  const label = getTithiDisplayLabel(tithiIndex, tithiName, labelMode);
  return label.secondary ? `${label.primary} (${label.secondary})` : label.primary;
}

function formatLocalWeekday(localDay, timeZone) {
  return getDateFromLocalParts(localDay.year, localDay.month, localDay.day, 12, 0, timeZone)
    .toLocaleDateString(undefined, {
      timeZone,
      weekday: "short"
    });
}

export function getPakshaTitle(paksha, labelMode) {
  if (labelMode === LABEL_MODES.english) {
    return paksha === "Shukla" ? "Waxing 🌔" : "Waning 🌘";
  }

  return paksha === "Shukla" ? "Shukla Paksha 🌔" : "Krishna Paksha 🌘";
}

export function clonePeriodTracker(periodTracker) {
  return {
    ...periodTracker,
    latestRecord: periodTracker.latestRecord ? { ...periodTracker.latestRecord } : null,
    history: Object.fromEntries(
      Object.entries(periodTracker.history).map(([monthKey, records]) => [
        monthKey,
        Array.isArray(records) ? records.map((record) => ({ ...record })) : []
      ])
    ),
    expectedHistory: Object.fromEntries(
      Object.entries(periodTracker.expectedHistory || {}).map(([monthKey, records]) => [
        monthKey,
        Array.isArray(records) ? records.map((record) => ({ ...record })) : []
      ])
    )
  };
}

export function buildCalendarData(currentDate, selectedLocation, locationsData, periodTracker) {
  const config = getLocationConfig(selectedLocation, locationsData);
  const displayedLocal = getLocalDateParts(currentDate, config.timeZone);
  const actualTodayLocal = getLocalDateParts(new Date(), config.timeZone);
  const lunarMonthStart = findLunarMonthStart(displayedLocal, config);
  const nextLunarMonthStart = findNextLunarMonthStart(lunarMonthStart, config);
  const lunarMonthEnd = addLocalDays(nextLunarMonthStart, -1);
  const totalDaysInLunarMonth = Math.round(
    (
      Date.UTC(nextLunarMonthStart.year, nextLunarMonthStart.month - 1, nextLunarMonthStart.day) -
      Date.UTC(lunarMonthStart.year, lunarMonthStart.month - 1, lunarMonthStart.day)
    ) / 86400000
  );
  const monthKey = getLocalDayKey(lunarMonthStart);
  const monthHeader = getMonthHeader(lunarMonthStart, lunarMonthEnd, config.timeZone, config);
  const currentRecords = periodTracker.history[monthKey] || [];
  const projectedExpectedRecords = getExpectedRecordsForMonth(
    periodTracker,
    lunarMonthStart,
    lunarMonthEnd,
    config
  );
  const savedExpectedRecords = periodTracker.expectedHistory?.[monthKey] || [];
  const latestReferenceMonthKey = periodTracker.latestRecord?.monthKey || null;
  let expectedRecords = [];

  if (latestReferenceMonthKey && monthKey <= latestReferenceMonthKey) {
    expectedRecords = [...savedExpectedRecords];
  } else {
    expectedRecords = [...projectedExpectedRecords];
  }

  expectedRecords.sort((left, right) => left.dayKey.localeCompare(right.dayKey));
  const loggedDayKeys = new Set(currentRecords.map((record) => record.dayKey));
  const expectedDayKeys = new Set(expectedRecords.map((record) => record.dayKey));
  const shuklaDays = [];
  const krishnaDays = [];

  for (let offset = 0; offset < totalDaysInLunarMonth; offset += 1) {
    const localDay = addLocalDays(lunarMonthStart, offset);
    const tithi = getTithiAtSunrise(localDay, config);
    const solarLabel = formatLocalMonthDay(localDay, config.timeZone);
    const weekdayLabel = formatLocalWeekday(localDay, config.timeZone);
    const dayKey = getLocalDayKey(localDay);
    const isToday =
      localDay.year === actualTodayLocal.year &&
      localDay.month === actualTodayLocal.month &&
      localDay.day === actualTodayLocal.day;
    const isLoggedStart = loggedDayKeys.has(dayKey);
    const isExpectedStart = expectedDayKeys.has(dayKey);
    const day = {
      key: `${monthKey}-${dayKey}-${tithi.index}`,
      localDay,
      dayKey,
      tithi,
      weekdayLabel,
      solarLabel,
      isToday,
      isLoggedStart,
      isExpectedStart
    };

    if (tithi.paksha === "Shukla") {
      shuklaDays.push(day);
    } else {
      krishnaDays.push(day);
    }
  }

  return {
    config,
    lunarMonthStart,
    lunarMonthEnd,
    monthKey,
    currentRecords,
    expectedRecords: expectedRecords.map((expectedRecord) => ({
      ...expectedRecord,
      solarLabel: formatLocalMonthDay(parseLocalDayKey(expectedRecord.dayKey), config.timeZone)
    })),
    monthLabel: monthHeader.title,
    monthSubLabel: monthHeader.subtitle,
    shuklaDays,
    krishnaDays
  };
}
