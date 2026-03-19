import {
  DEFAULT_PERIOD_TRACKER,
  STORAGE_KEYS
} from "./constants.js";
import { getLocalDayKey, parseLocalDayKey } from "./date-utils.js";
import { findNextLunarMonthStart } from "./astronomy.js";

export function loadPeriodTracker() {
  const savedTracker = localStorage.getItem(STORAGE_KEYS.periodTracker);

  if (!savedTracker) {
    return { ...DEFAULT_PERIOD_TRACKER };
  }

  try {
    const parsed = JSON.parse(savedTracker);
    return {
      ...DEFAULT_PERIOD_TRACKER,
      ...parsed,
      history: parsed.history || {}
    };
  } catch (error) {
    console.error("Unable to parse period tracker data:", error);
    localStorage.removeItem(STORAGE_KEYS.periodTracker);
    return { ...DEFAULT_PERIOD_TRACKER };
  }
}

export function persistPeriodTracker(periodTracker) {
  localStorage.setItem(STORAGE_KEYS.periodTracker, JSON.stringify(periodTracker));
}

export function getExpectedRecordForMonth(periodTracker, monthStart, config) {
  const basis = periodTracker.latestRecord || periodTracker.referenceRecord;

  if (!basis) {
    return null;
  }

  const basisMonthStart = parseLocalDayKey(basis.monthKey);
  const nextMonthStart = findNextLunarMonthStart(basisMonthStart, config);

  if (getLocalDayKey(nextMonthStart) !== getLocalDayKey(monthStart)) {
    return null;
  }

  return {
    ...basis,
    source: periodTracker.latestRecord ? "latest" : "reference"
  };
}

export function savePeriodStart(periodTracker, monthKey, tithiIndex, tithiName, solarLabel) {
  const record = { monthKey, tithiIndex, tithiName, solarLabel };
  periodTracker.history[monthKey] = record;
  periodTracker.latestRecord = record;
  persistPeriodTracker(periodTracker);
}

export function saveReferenceRecord(periodTracker, currentRecord) {
  if (!currentRecord) {
    return;
  }

  periodTracker.referenceRecord = { ...currentRecord };
  persistPeriodTracker(periodTracker);
}

export function resetReferenceRecord(periodTracker) {
  periodTracker.referenceRecord = null;
  persistPeriodTracker(periodTracker);
}
