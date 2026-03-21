import { useState } from "react";
import {
  clearPeriodTracker,
  loadPeriodTracker,
  persistPeriodTracker,
  removePeriodStart,
  saveExpectedHistory,
  savePeriodStart
} from "../../js/period-tracking.js";
import { clonePeriodTracker } from "../lib/calendar-data.js";

export default function usePeriodTrackerState() {
  const [periodTracker, setPeriodTracker] = useState(loadPeriodTracker());
  const [markDateEnabled, setMarkDateEnabled] = useState(false);
  const [trackerError, setTrackerError] = useState("");

  const handleTrackingToggle = (event) => {
    const nextTracker = {
      ...clonePeriodTracker(periodTracker),
      enabled: event.target.checked
    };

    if (!event.target.checked) {
      setMarkDateEnabled(false);
      setTrackerError("");
    }

    persistPeriodTracker(nextTracker);
    setPeriodTracker(nextTracker);
  };

  const handleTrackPeriod = (calendarData, { monthKey, tithiIndex, tithiName, solarLabel, dayKey }) => {
    const monthRecords = periodTracker.history[monthKey] || [];

    if (monthRecords.some((record) => record.dayKey === dayKey)) {
      const nextTracker = clonePeriodTracker(periodTracker);
      removePeriodStart(nextTracker, monthKey, dayKey);
      setPeriodTracker(nextTracker);
      setTrackerError("");
      return;
    }

    if (monthRecords.length >= 2) {
      setTrackerError("You can only mark up to 2 period start dates in one lunar month.");
      return;
    }

    const nextTracker = clonePeriodTracker(periodTracker);
    saveExpectedHistory(nextTracker, monthKey, calendarData.expectedRecords);
    savePeriodStart(nextTracker, monthKey, tithiIndex, tithiName, solarLabel, dayKey);
    setPeriodTracker(nextTracker);
    setTrackerError("");
  };

  const handleClearTrackingData = () => {
    clearPeriodTracker();
    setPeriodTracker(loadPeriodTracker());
    setMarkDateEnabled(false);
    setTrackerError("");
  };

  return {
    markDateEnabled,
    periodTracker,
    trackerError,
    handleClearTrackingData,
    setPeriodTracker,
    setMarkDateEnabled,
    handleTrackPeriod,
    handleTrackingToggle
  };
}
