import React from "react";
import AboutTeaser from "../components/AboutTeaser.jsx";
import PakshaSection from "../components/PakshaSection.jsx";
import {
  formatTithiText,
  LABEL_MODES
} from "../lib/calendar-data.js";
import useCalendarState from "../hooks/useCalendarState.js";
import useExpectedHistorySync from "../hooks/useExpectedHistorySync.js";
import usePeriodTrackerState from "../hooks/usePeriodTrackerState.js";

export default function MainPage() {
  const {
    markDateEnabled,
    periodTracker,
    trackerError,
    handleClearTrackingData,
    setPeriodTracker,
    setMarkDateEnabled,
    handleTrackPeriod,
    handleTrackingToggle
  } = usePeriodTrackerState();
  const {
    calendarData,
    cityOptions,
    labelMode,
    selectedLocation,
    selectedCityValue,
    selectedCountry,
    locationsData,
    theme,
    handleCityChange,
    handleCountryChange,
    handleLabelModeChange,
    handleNextMonth,
    handlePreviousMonth,
    handleThemeChange
  } = useCalendarState(periodTracker);

  useExpectedHistorySync(calendarData, periodTracker, setPeriodTracker);

  return (
    <>
      <header className="hero">
        <p className="hero-kicker">Lunar Rhythm Planner</p>
        <h1>Lunar Calendar</h1>
        <a
          className="support-link"
          href="https://buymemomo.com/Icyflame"
          target="_blank"
          rel="noreferrer"
          aria-label="Support this project on Buy Me Momo"
        >
          <span className="support-link-label">Want to support this project?</span>
          <span className="support-link-action">Buy me a momo</span>
        </a>
      </header>

      <div className="dashboard-layout">
        <aside className="side-panel side-panel-left">
          <section className="control-panel">
            <p className="panel-label">Location</p>
            <h2>Choose your city</h2>
            <p className="panel-copy">
              Sunrise and month boundaries are calculated from the selected location.
            </p>

            <div className="field-stack">
              <select id="countrySelect" value={selectedCountry} onChange={handleCountryChange}>
                <option value="">Select Country</option>
                {Object.keys(locationsData).map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>

              <select
                id="citySelect"
                value={cityOptions.some((city) => city.name === selectedLocation.name) ? selectedCityValue : ""}
                onChange={handleCityChange}
                disabled={!selectedCountry || cityOptions.length === 0}
              >
                <option value="">Select City</option>
                {cityOptions.map((city) => (
                  <option
                    key={`${selectedCountry}-${city.name}`}
                    value={JSON.stringify({ ...city, country: selectedCountry })}
                  >
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="control-panel">
            <label className="theme-control" htmlFor="themeSelect">
              <span>Theme Selection</span>
              <select id="themeSelect" value={theme} onChange={handleThemeChange}>
                <option value="soft-romantic">Soft Romantic</option>
                <option value="natural-whimsical">Natural Whimsical</option>
                <option value="clean-minimal">Clean Minimal</option>
                <option value="dark-feminine">Dark Feminine</option>
              </select>
            </label>
          </section>

          <section className="control-panel">
            <label className="theme-control" htmlFor="labelModeSelect">
              <span>Label Style</span>
              <select id="labelModeSelect" value={labelMode} onChange={handleLabelModeChange}>
                <option value={LABEL_MODES.traditional}>Traditional</option>
                <option value={LABEL_MODES.english}>English</option>
              </select>
            </label>
          </section>
        </aside>

        <main className="calendar-stage">
          <div className="nav calendar-nav">
            <button id="prev" type="button" onClick={handlePreviousMonth}>
              ◀
            </button>
            <div id="monthYear" className="month-year" aria-live="polite">
              <span className="month-year-title">{calendarData.monthLabel}</span>
              {calendarData.monthSubLabel ? (
                <span className="month-year-range">{calendarData.monthSubLabel}</span>
              ) : null}
            </div>
            <button id="next" type="button" onClick={handleNextMonth}>
              ▶
            </button>
          </div>

          <div className="calendar-columns">
            <PakshaSection
              paksha="Shukla"
              className="shukla"
              days={calendarData.shuklaDays}
              labelMode={labelMode}
              trackingEnabled={periodTracker.enabled}
              markDateEnabled={markDateEnabled}
              monthKey={calendarData.monthKey}
              onTrackPeriod={(payload) => handleTrackPeriod(calendarData, payload)}
            />

            <PakshaSection
              paksha="Krishna"
              className="krishna"
              days={calendarData.krishnaDays}
              labelMode={labelMode}
              trackingEnabled={periodTracker.enabled}
              markDateEnabled={markDateEnabled}
              monthKey={calendarData.monthKey}
              onTrackPeriod={(payload) => handleTrackPeriod(calendarData, payload)}
            />
          </div>
        </main>

        <aside className="side-panel side-panel-right">
          <section className="tracker-panel">
            <div className="tracker-head">
              <div>
                <p className="panel-label">Cycle Tracking</p>
                <h2>Period Tracking</h2>
                <p>
                  Turn this on to track period starts and expected dates.
                </p>
              </div>
              <label className="toggle">
                <input
                  id="trackingToggle"
                  type="checkbox"
                  checked={periodTracker.enabled}
                  onChange={handleTrackingToggle}
                />
                <span className="toggle-label">{periodTracker.enabled ? "On" : "Off"}</span>
              </label>
            </div>

            {periodTracker.enabled ? (
              <>
                <div className="tracker-actions">
                  <label className="toggle">
                    <input
                      id="markDateToggle"
                      type="checkbox"
                      checked={markDateEnabled}
                      onChange={(event) => setMarkDateEnabled(event.target.checked)}
                    />
                    <span className="toggle-label">
                      {markDateEnabled ? "Mark Date On" : "Mark Date Off"}
                    </span>
                  </label>
                  <p className="tracker-hint">
                    Turn on Mark Date, then click a calendar day to set the period start.
                    Click the same marked day again to unselect it.
                  </p>
                  <button type="button" onClick={handleClearTrackingData}>
                    Clear Tracking Data
                  </button>
                </div>

                {trackerError ? <p className="tracker-error">{trackerError}</p> : null}

                <div id="trackerStatus" className="tracker-status" aria-live="polite">
                  <>
                    <p>
                      {calendarData.currentRecords.length > 0 ? (
                        <>
                          Period starts this month:{" "}
                          <strong>
                            {calendarData.currentRecords
                              .map(
                                (record) =>
                                  `${formatTithiText(record.tithiIndex, record.tithiName, labelMode)} (${record.solarLabel})`
                              )
                              .join(", ")}
                          </strong>
                          .
                        </>
                      ) : (
                        "This month period start is not marked yet."
                      )}
                    </p>
                    <p>
                      {calendarData.expectedRecords.length > 0 ? (
                        <>
                          Expected date:{" "}
                          <strong>
                            {calendarData.expectedRecords
                              .map(
                                (record) =>
                                  `${formatTithiText(record.tithiIndex, record.tithiName, labelMode)} on ${record.solarLabel} (${record.dayKey})`
                              )
                              .join(", ")}
                          </strong>
                          .
                        </>
                      ) : (
                        "Expected date will appear once you mark a period start."
                      )}
                    </p>
                    <p>
                      {periodTracker.latestRecord ? (
                        <>
                          Active reference:{" "}
                          <strong>
                            {formatTithiText(
                              periodTracker.latestRecord.tithiIndex,
                              periodTracker.latestRecord.tithiName,
                              labelMode
                            )}
                          </strong>{" "}
                          on{" "}
                          <strong>
                            {periodTracker.latestRecord.solarLabel}
                          </strong>{" "}
                          ({periodTracker.latestRecord.dayKey}).
                        </>
                      ) : (
                        "Active reference: not set yet."
                      )}
                    </p>
                  </>
                </div>
              </>
            ) : null}
          </section>

          <AboutTeaser />
        </aside>
      </div>
    </>
  );
}
