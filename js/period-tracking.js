import {
  DEFAULT_PERIOD_TRACKER,
  STORAGE_KEYS
} from "./constants.js";
import { addLocalDays, getLocalDayKey } from "./date-utils.js";
import { getTithiAtSunrise } from "./astronomy.js";
import {
  safeStorageGet,
  safeStorageRemove,
  safeStorageSet
} from "./storage.js";

export function loadPeriodTracker() {
  const savedTracker = safeStorageGet(STORAGE_KEYS.periodTracker);

  if (!savedTracker) {
    return { ...DEFAULT_PERIOD_TRACKER };
  }

  try {
    const parsed = JSON.parse(savedTracker);
    const history = Object.fromEntries(
      Object.entries(parsed.history || {}).map(([monthKey, value]) => [
        monthKey,
        Array.isArray(value) ? value : value ? [value] : []
      ])
    );
    const expectedHistory = Object.fromEntries(
      Object.entries(parsed.expectedHistory || {}).map(([monthKey, value]) => [
        monthKey,
        Array.isArray(value) ? value : value ? [value] : []
      ])
    );
    return {
      ...DEFAULT_PERIOD_TRACKER,
      ...parsed,
      history,
      expectedHistory
    };
  } catch (error) {
    console.error("Unable to parse period tracker data:", error);
    safeStorageRemove(STORAGE_KEYS.periodTracker);
    return { ...DEFAULT_PERIOD_TRACKER };
  }
}

export function persistPeriodTracker(periodTracker) {
  safeStorageSet(STORAGE_KEYS.periodTracker, JSON.stringify(periodTracker));
}

export function getExpectedRecordsForMonth(periodTracker, monthStart, monthEnd, config) {
  const basis = periodTracker.latestRecord || periodTracker.referenceRecord;

  if (!basis?.tithiIndex) {
    return [];
  }

  const viewedMonthKey = getLocalDayKey(monthStart);

  // Expected dates only belong to lunar months after the marked period-start month.
  if (viewedMonthKey <= basis.monthKey) {
    return [];
  }

  let fallbackRecord = null;

  for (let offset = 0; ; offset += 1) {
    const localDay = addLocalDays(monthStart, offset);

    if (Date.UTC(localDay.year, localDay.month - 1, localDay.day) >
      Date.UTC(monthEnd.year, monthEnd.month - 1, monthEnd.day)) {
      break;
    }

    const tithi = getTithiAtSunrise(localDay, config);

    if (tithi.index === basis.tithiIndex) {
      return [{
        dayKey: getLocalDayKey(localDay),
        tithiIndex: tithi.index,
        tithiName: tithi.name,
        source: "latest"
      }];
    }

    if (!fallbackRecord && tithi.index > basis.tithiIndex) {
      fallbackRecord = {
        dayKey: getLocalDayKey(localDay),
        tithiIndex: tithi.index,
        tithiName: tithi.name,
        source: "latest"
      };
    }
  }

  return fallbackRecord ? [fallbackRecord] : [];
}

export function savePeriodStart(periodTracker, monthKey, tithiIndex, tithiName, solarLabel, dayKey) {
  const record = { monthKey, tithiIndex, tithiName, solarLabel, dayKey };
  const monthHistory = periodTracker.history[monthKey] || [];
  const existingIndex = monthHistory.findIndex((entry) => entry.dayKey === dayKey);

  if (existingIndex >= 0) {
    monthHistory[existingIndex] = record;
  } else {
    monthHistory.push(record);
    monthHistory.sort((left, right) => left.dayKey.localeCompare(right.dayKey));
  }

  periodTracker.history[monthKey] = monthHistory;
  periodTracker.latestRecord = record;
  persistPeriodTracker(periodTracker);
}

export function saveExpectedHistory(periodTracker, monthKey, expectedRecords) {
  if (!expectedRecords?.length) {
    return;
  }

  const currentHistory = periodTracker.expectedHistory[monthKey] || [];
  const merged = [...currentHistory];

  expectedRecords.forEach((record) => {
    if (!merged.some((entry) => entry.dayKey === record.dayKey)) {
      merged.push(record);
    }
  });

  merged.sort((left, right) => left.dayKey.localeCompare(right.dayKey));
  periodTracker.expectedHistory[monthKey] = merged;
}

export function removePeriodStart(periodTracker, monthKey, dayKey) {
  const monthHistory = (periodTracker.history[monthKey] || []).filter(
    (entry) => entry.dayKey !== dayKey
  );

  if (monthHistory.length > 0) {
    periodTracker.history[monthKey] = monthHistory;
  } else {
    delete periodTracker.history[monthKey];
  }

  periodTracker.latestRecord = getLatestRecord(periodTracker.history);
  persistPeriodTracker(periodTracker);
}

export function saveReferenceRecord(
  periodTracker,
  monthKey,
  dayKey,
  solarLabel,
  tithiIndex,
  tithiName
) {
  if (!dayKey || !tithiIndex) {
    return;
  }

  periodTracker.referenceRecord = {
    monthKey,
    dayKey,
    solarLabel,
    tithiIndex,
    tithiName
  };
  persistPeriodTracker(periodTracker);
}

function getLatestRecord(history) {
  return Object.values(history)
    .flat()
    .sort((left, right) => left.dayKey.localeCompare(right.dayKey))
    .at(-1) || null;
}
