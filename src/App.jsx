import React, { useEffect, useState } from "react";
import {
  DEFAULT_LOCATION,
  DEFAULT_THEME,
  STORAGE_KEYS
} from "../js/constants.js";
import {
  addLocalDays,
  formatLocalMonthDay,
  getDateFromLocalParts,
  getLocalDateParts,
  getLocalDayKey,
  parseLocalDayKey
} from "../js/date-utils.js";
import {
  findLunarMonthStart,
  findNextLunarMonthStart,
  getTithiAtSunrise
} from "../js/astronomy.js";
import { getMonthHeader } from "../js/newari-months.js";
import {
  clearSavedLocation,
  findCountryByCity,
  getLocationConfig,
  loadLocationsData,
  loadSavedLocation,
  saveLocation
} from "../js/location.js";
import {
  getExpectedRecordsForMonth,
  loadPeriodTracker,
  persistPeriodTracker,
  removePeriodStart,
  saveExpectedHistory,
  savePeriodStart,
} from "../js/period-tracking.js";
import {
  safeStorageGet,
  safeStorageSet
} from "../js/storage.js";

const LABEL_MODES = {
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

function getTithiDisplayLabel(tithiIndex, tithiName, labelMode) {
  if (labelMode === LABEL_MODES.english) {
    return getEnglishTithiLabel(tithiIndex);
  }

  return {
    primary: tithiName,
    secondary: ""
  };
}

function formatTithiText(tithiIndex, tithiName, labelMode) {
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

function getPakshaTitle(paksha, labelMode) {
  if (labelMode === LABEL_MODES.english) {
    return paksha === "Shukla" ? "Waxing 🌔" : "Waning 🌘";
  }

  return paksha === "Shukla" ? "Shukla Paksha 🌔" : "Krishna Paksha 🌘";
}

function clonePeriodTracker(periodTracker) {
  return {
    ...periodTracker,
    latestRecord: periodTracker.latestRecord ? { ...periodTracker.latestRecord } : null,
    referenceRecord: periodTracker.referenceRecord ? { ...periodTracker.referenceRecord } : null,
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

function buildCalendarData(currentDate, selectedLocation, locationsData, periodTracker) {
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
  const latestReferenceMonthKey =
    periodTracker.latestRecord?.monthKey || periodTracker.referenceRecord?.monthKey || null;
  let expectedRecords = [];

  if (latestReferenceMonthKey && monthKey <= latestReferenceMonthKey) {
    // Historical or current reference month: preserve only what was already shown there.
    expectedRecords = [...savedExpectedRecords];
  } else {
    // Future months should always follow the latest reference only.
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

function DayCard({
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

function PakshaSection({
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

function InfoPanel() {
  return (
    <section className="info-panel">
      <p className="info-eyebrow">About This Calendar</p>
      <h2>Follow the lunar month from Shukla Pratipada through Krishna Paksha.</h2>
      <p>
        This calendar begins each month from the lunar cycle rather than the solar
        month. Each card shows the tithi as the primary label, with the Gregorian date
        kept as a small secondary reference.
      </p>
      <p>
        The current month is determined from the selected location&apos;s sunrise, which
        helps keep the tithi view aligned with local day changes. You can also turn on
        period tracking, mark a period start, and follow the same expected tithi into
        later lunar months.
      </p>
    </section>
  );
}

function AboutTeaser() {
  return (
    <section className="info-panel info-teaser">
      <p className="info-eyebrow">About This Calendar</p>
      <h2>Lunar months here begin with the tithi cycle, not the Gregorian month.</h2>
      <p>
        The calendar follows sunrise-based tithi calculation for the selected location,
        with solar dates shown quietly as secondary reference.
      </p>
      <a className="read-more-link" href="/about">
        Read More
      </a>
    </section>
  );
}

function AboutPage() {
  const theme = safeStorageGet(STORAGE_KEYS.theme) || DEFAULT_THEME;

  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  return (
    <>
      <header className="hero">
        <p className="hero-kicker">Lunar Rhythm Planner</p>
        <h1>About This Calendar</h1>
        <p className="hero-copy">
          A sunrise-based lunar calendar designed to keep tithi at the center of your
          month.
        </p>
      </header>

      <section className="about-page">
        <div className="about-card">
          <p className="info-eyebrow">How It Works</p>
          <h2>The month begins from the lunar cycle.</h2>
          <p>
            This calendar does not start from the Gregorian first day of the month.
            Instead, each displayed month begins from the start of the lunar cycle, with
            Shukla Paksha following the Krishna to Shukla transition at sunrise.
          </p>
          <p>
            Tithi is calculated from the Sun-Moon phase relation and assigned from the
            selected location&apos;s sunrise. That helps the day labels reflect how the
            lunar date is typically observed locally.
          </p>
        </div>

        <div className="about-card">
          <p className="info-eyebrow">What You See</p>
          <h2>Tithi first, solar date second.</h2>
          <p>
            Each card highlights the tithi as the primary label, while the Gregorian
            month and day stay as a smaller supporting reference. The two paksha sections
            let you read the month through its waxing and waning halves instead of a
            standard Western calendar grid.
          </p>
          <p>
            Period tracking can be turned on to mark actual starts and let the latest
            saved start drive the expected tithi for coming lunar months.
          </p>
        </div>
      </section>

      <div className="about-actions">
        <a className="read-more-link" href="/">
          Back To Calendar
        </a>
      </div>
    </>
  );
}

function MainPage() {
  const [locationsData, setLocationsData] = useState({});
  const [selectedLocation, setSelectedLocation] = useState(loadSavedLocation() || DEFAULT_LOCATION);
  const [selectedCountry, setSelectedCountry] = useState(
    (loadSavedLocation() || DEFAULT_LOCATION).country || DEFAULT_LOCATION.country
  );
  const [periodTracker, setPeriodTracker] = useState(loadPeriodTracker());
  const [theme, setTheme] = useState(safeStorageGet(STORAGE_KEYS.theme) || DEFAULT_THEME);
  const [labelMode, setLabelMode] = useState(
    safeStorageGet(STORAGE_KEYS.labelMode) || LABEL_MODES.traditional
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  const [markDateEnabled, setMarkDateEnabled] = useState(false);
  const [trackerError, setTrackerError] = useState("");

  useEffect(() => {
    let active = true;

    loadLocationsData()
      .then((data) => {
        if (!active) {
          return;
        }

        setLocationsData(data);
        setSelectedCountry(
          selectedLocation.country ||
            findCountryByCity(selectedLocation.name, data) ||
            DEFAULT_LOCATION.country
        );
      })
      .catch((error) => {
        console.error("Unable to load locations:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.body.dataset.theme = theme;
    safeStorageSet(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    safeStorageSet(STORAGE_KEYS.labelMode, labelMode);
  }, [labelMode]);

  useEffect(() => {
    const config = getLocationConfig(selectedLocation, locationsData);
    const now = new Date();
    const currentLocal = getLocalDateParts(now, config.timeZone);
    const nextLocalDay = addLocalDays(currentLocal, 1);
    const nextMidnight = getDateFromLocalParts(
      nextLocalDay.year,
      nextLocalDay.month,
      nextLocalDay.day,
      0,
      0,
      config.timeZone
    );
    const delay = Math.max(1000, nextMidnight.getTime() - now.getTime() + 1000);
    const timerId = window.setTimeout(() => {
      const refreshConfig = getLocationConfig(selectedLocation, locationsData);

      setCurrentDate((previousDate) => {
        const viewedLocal = getLocalDateParts(previousDate, refreshConfig.timeZone);
        const nowLocal = getLocalDateParts(new Date(), refreshConfig.timeZone);
        const viewedMonthStart = findLunarMonthStart(viewedLocal, refreshConfig);
        const nowMonthStart = findLunarMonthStart(nowLocal, refreshConfig);

        if (getLocalDayKey(viewedMonthStart) === getLocalDayKey(nowMonthStart)) {
          return new Date();
        }

        return previousDate;
      });
    }, delay);

    return () => window.clearTimeout(timerId);
  }, [currentDate, selectedLocation, locationsData]);

  const calendarData = buildCalendarData(
    currentDate,
    selectedLocation,
    locationsData,
    periodTracker
  );
  const cityOptions = selectedCountry && locationsData[selectedCountry]
    ? locationsData[selectedCountry]
    : [];

  useEffect(() => {
    if (!periodTracker.enabled || calendarData.expectedRecords.length === 0) {
      return;
    }

    const savedExpectedRecords = periodTracker.expectedHistory?.[calendarData.monthKey] || [];
    const hasUnsavedExpected = calendarData.expectedRecords.some(
      (record) => !savedExpectedRecords.some((saved) => saved.dayKey === record.dayKey)
    );

    if (!hasUnsavedExpected) {
      return;
    }

    const nextTracker = clonePeriodTracker(periodTracker);
    saveExpectedHistory(nextTracker, calendarData.monthKey, calendarData.expectedRecords);
    persistPeriodTracker(nextTracker);
    setPeriodTracker(nextTracker);
  }, [
    calendarData.expectedRecords,
    calendarData.monthKey,
    periodTracker,
    periodTracker.enabled
  ]);

  const handleCountryChange = (event) => {
    setSelectedCountry(event.target.value);
  };

  const handleCityChange = (event) => {
    if (!event.target.value) {
      setSelectedLocation(DEFAULT_LOCATION);
      setSelectedCountry(DEFAULT_LOCATION.country);
      clearSavedLocation();
      setCurrentDate(new Date());
      return;
    }

    const nextLocation = JSON.parse(event.target.value);
    setSelectedLocation(nextLocation);
    saveLocation(nextLocation);
    setCurrentDate(new Date());
  };

  const handleThemeChange = (event) => {
    setTheme(event.target.value);
  };

  const handleLabelModeChange = (event) => {
    setLabelMode(event.target.value);
  };

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

  const handleTrackPeriod = ({ monthKey, tithiIndex, tithiName, solarLabel, dayKey }) => {
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

  const handleUntrackPeriod = ({ monthKey, dayKey }) => {
    const nextTracker = clonePeriodTracker(periodTracker);
    removePeriodStart(nextTracker, monthKey, dayKey);
    setPeriodTracker(nextTracker);
  };

  const handlePreviousMonth = () => {
    const currentLocalDay = getLocalDateParts(currentDate, calendarData.config.timeZone);
    const currentLunarMonthStart = findLunarMonthStart(currentLocalDay, calendarData.config);
    const previousLocalDay = addLocalDays(currentLunarMonthStart, -1);

    setCurrentDate(
      getDateFromLocalParts(
        previousLocalDay.year,
        previousLocalDay.month,
        previousLocalDay.day,
        12,
        0,
        calendarData.config.timeZone
      )
    );
  };

  const handleNextMonth = () => {
    const currentLocalDay = getLocalDateParts(currentDate, calendarData.config.timeZone);
    const currentLunarMonthStart = findLunarMonthStart(currentLocalDay, calendarData.config);
    const nextLunarMonthStart = findNextLunarMonthStart(
      currentLunarMonthStart,
      calendarData.config
    );

    setCurrentDate(
      getDateFromLocalParts(
        nextLunarMonthStart.year,
        nextLunarMonthStart.month,
        nextLunarMonthStart.day,
        12,
        0,
        calendarData.config.timeZone
      )
    );
  };

  const selectedCityValue = JSON.stringify({
    name: selectedLocation.name,
    lat: selectedLocation.lat,
    lon: selectedLocation.lon,
    country: selectedLocation.country || selectedCountry
  });

  return (
    <>
      <header className="hero">
        <p className="hero-kicker">Lunar Rhythm Planner</p>
        <h1>Lunar Calendar</h1>
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
              onTrackPeriod={handleTrackPeriod}
              onUntrackPeriod={handleUntrackPeriod}
            />

            <PakshaSection
              paksha="Krishna"
              className="krishna"
              days={calendarData.krishnaDays}
              labelMode={labelMode}
              trackingEnabled={periodTracker.enabled}
              markDateEnabled={markDateEnabled}
              monthKey={calendarData.monthKey}
              onTrackPeriod={handleTrackPeriod}
              onUntrackPeriod={handleUntrackPeriod}
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
                    {periodTracker.latestRecord || periodTracker.referenceRecord ? (
                      <>
                        Active reference:{" "}
                        <strong>
                          {formatTithiText(
                            (periodTracker.latestRecord || periodTracker.referenceRecord).tithiIndex,
                            (periodTracker.latestRecord || periodTracker.referenceRecord).tithiName,
                            labelMode
                          )}
                        </strong>{" "}
                        on{" "}
                        <strong>
                          {(periodTracker.latestRecord || periodTracker.referenceRecord).solarLabel}
                        </strong>{" "}
                        ({(periodTracker.latestRecord || periodTracker.referenceRecord).dayKey}).
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

export default function App() {
  if (window.location.pathname === "/about") {
    return <AboutPage />;
  }

  return <MainPage />;
}
