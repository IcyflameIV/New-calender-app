import React from "react";
import { getTithiDisplayLabel } from "../lib/calendar-data.js";

export default function DayCard({
  day,
  trackingEnabled,
  markDateEnabled,
  monthKey,
  labelMode,
  onTrackPeriod
}) {
  const tithiLabel = getTithiDisplayLabel(day.tithi.index, day.tithi.name, labelMode);

  return (
    <div
      className={[
        "day",
        day.isToday ? "today" : "",
        trackingEnabled && day.isLoggedStart ? "period-start" : "",
        trackingEnabled && day.isExpectedStart ? "expected-start" : ""
      ].filter(Boolean).join(" ")}
    >
      <div className="day-corner">
        <div className="day-badges">
          {trackingEnabled && day.isExpectedStart ? (
            <span className="day-badge expected">Expected</span>
          ) : null}
          {trackingEnabled && day.isLoggedStart ? (
            <span className="day-badge actual">🩸</span>
          ) : null}
        </div>
        {tithiLabel.secondary ? (
          <div className="tithi-phase-icon" aria-hidden="true">{tithiLabel.secondary}</div>
        ) : null}
      </div>
      <div className="tithi-label">
        <div className="tithi-primary">{tithiLabel.primary}</div>
      </div>
      <div className="weekday-label">{day.weekdayLabel}</div>
      <div className="solar-date">{day.solarLabel}</div>
      {trackingEnabled && markDateEnabled ? (
        <button
          className={`track-button ${day.isLoggedStart ? "selected" : ""}`}
          type="button"
          onClick={() =>
            onTrackPeriod({
              monthKey,
              tithiIndex: day.tithi.index,
              tithiName: day.tithi.name,
              solarLabel: day.solarLabel,
              dayKey: day.dayKey
            })
          }
          title={day.isLoggedStart ? "Click to unselect" : "Mark period start"}
        >
          {day.isLoggedStart ? "Started" : "Mark Start"}
        </button>
      ) : null}
    </div>
  );
}
