import { useEffect } from "react";
import {
  persistPeriodTracker,
  saveExpectedHistory
} from "../../js/period-tracking.js";
import { clonePeriodTracker } from "../lib/calendar-data.js";

export default function useExpectedHistorySync(calendarData, periodTracker, setPeriodTracker) {
  useEffect(() => {
    if (!periodTracker.enabled || !calendarData) {
      return;
    }

    const savedExpectedRecords = periodTracker.expectedHistory?.[calendarData.monthKey] || [];
    const nextExpectedRecord = calendarData.expectedRecords[calendarData.expectedRecords.length - 1] || null;
    const savedExpectedRecord = savedExpectedRecords[savedExpectedRecords.length - 1] || null;
    const hasChanged =
      (nextExpectedRecord?.dayKey || null) !== (savedExpectedRecord?.dayKey || null) ||
      savedExpectedRecords.length > 1;

    if (!hasChanged) {
      return;
    }

    const nextTracker = clonePeriodTracker(periodTracker);
    saveExpectedHistory(nextTracker, calendarData.monthKey, calendarData.expectedRecords);
    persistPeriodTracker(nextTracker);
    setPeriodTracker(nextTracker);
  }, [calendarData, periodTracker, setPeriodTracker]);
}
