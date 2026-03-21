import React from "react";
import DayCard from "./DayCard.jsx";
import { getPakshaTitle } from "../lib/calendar-data.js";

export default function PakshaSection({
  paksha,
  className,
  days,
  labelMode,
  trackingEnabled,
  markDateEnabled,
  monthKey,
  onTrackPeriod
}) {
  return (
    <div className="paksha-section">
      <h2 className={`paksha-title ${className}`}>{getPakshaTitle(paksha, labelMode)}</h2>
      <div className="lunar-grid">
        {days.map((day) => (
          <DayCard
            key={day.key}
            day={day}
            labelMode={labelMode}
            trackingEnabled={trackingEnabled}
            markDateEnabled={markDateEnabled}
            monthKey={monthKey}
            onTrackPeriod={onTrackPeriod}
          />
        ))}
      </div>
    </div>
  );
}
