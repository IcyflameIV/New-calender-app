import {
  TITHIS,
  DEFAULT_PERIOD_TRACKER,
  STORAGE_KEYS
} from "./constants.js";
import { addLocalDays, getLocalDayKey, parseLocalDayKey } from "./date-utils.js";
import {
  findNextLunarMonthStart,
  getTithiAtSunrise
} from "./astronomy.js";
import {
  safeStorageGet,
  safeStorageRemove,
  safeStorageSet
} from "./storage.js";

function normalizeExpectedRecords(value) {
  const records = Array.isArray(value) ? value : value ? [value] : [];

  if (records.length === 0) {
    return [];
  }

  return [...records]
    .sort((left, right) => left.dayKey.localeCompare(right.dayKey))
    .slice(-1);
}

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
        normalizeExpectedRecords(value)
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

export function clearPeriodTracker() {
  safeStorageRemove(STORAGE_KEYS.periodTracker);
}

function projectExpectedRecordForMonth(basis, monthStart, monthEnd, config) {
  const fallbackTithiIndex = basis.tithiIndex === 1 ? 2 : basis.tithiIndex - 1;
  let fallbackRecord = null;

  for (let offset = 0; ; offset += 1) {
    const localDay = addLocalDays(monthStart, offset);

    if (Date.UTC(localDay.year, localDay.month - 1, localDay.day) >
      Date.UTC(monthEnd.year, monthEnd.month - 1, monthEnd.day)) {
      break;
    }

    const tithi = getTithiAtSunrise(localDay, config);

    if (tithi.index === basis.tithiIndex) {
      return {
        monthKey: getLocalDayKey(monthStart),
        dayKey: getLocalDayKey(localDay),
        solarLabel: "",
        tithiIndex: tithi.index,
        tithiName: tithi.name,
        source: "latest"
      };
    }

    if (!fallbackRecord && tithi.index === fallbackTithiIndex) {
      fallbackRecord = {
        monthKey: getLocalDayKey(monthStart),
        dayKey: getLocalDayKey(localDay),
        solarLabel: "",
        tithiIndex: tithi.index,
        tithiName: tithi.name,
        source: "previous-tithi-fallback",
        nextBasisTithiIndex: basis.tithiIndex === 1 ? 1 : tithi.index,
        nextBasisTithiName: basis.tithiIndex === 1 ? TITHIS[0] : tithi.name
      };
    }
  }

  return fallbackRecord;
}

export function getExpectedRecordsForMonth(periodTracker, monthStart, monthEnd, config) {
  const viewedMonthKey = getLocalDayKey(monthStart);
  let basis = periodTracker.latestRecord;

  if (!basis?.tithiIndex) {
    return [];
  }

  if (viewedMonthKey <= basis.monthKey) {
    return [];
  }

  let cursorMonthStart = parseLocalDayKey(basis.monthKey);
  while (getLocalDayKey(cursorMonthStart) < viewedMonthKey) {
    const projectedMonthStart = findNextLunarMonthStart(cursorMonthStart, config);
    const followingMonthStart = findNextLunarMonthStart(projectedMonthStart, config);
    const projectedMonthEnd = addLocalDays(followingMonthStart, -1);
    const expectedRecord = projectExpectedRecordForMonth(
      basis,
      projectedMonthStart,
      projectedMonthEnd,
      config
    );
    const projectedMonthKey = getLocalDayKey(projectedMonthStart);

    if (projectedMonthKey === viewedMonthKey) {
      return expectedRecord ? [expectedRecord] : [];
    }

    if (expectedRecord) {
      basis = {
        ...expectedRecord,
        tithiIndex: expectedRecord.nextBasisTithiIndex || expectedRecord.tithiIndex,
        tithiName: expectedRecord.nextBasisTithiName || expectedRecord.tithiName
      };
      cursorMonthStart = projectedMonthStart;
    } else {
      cursorMonthStart = projectedMonthStart;
    }
  }

  return [];
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
    delete periodTracker.expectedHistory[monthKey];
    return;
  }

  periodTracker.expectedHistory[monthKey] = normalizeExpectedRecords(expectedRecords);
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

function getLatestRecord(history) {
  return Object.values(history)
    .flat()
    .sort((left, right) => left.dayKey.localeCompare(right.dayKey))
    .at(-1) || null;
}
