import { DEFAULT_LOCATION, DEFAULT_THEME, STORAGE_KEYS } from "./constants.js";
import {
  addLocalDays,
  formatLocalMonthDay,
  formatLunarMonthLabel,
  getDateFromLocalParts,
  getLocalDateParts,
  getLocalDayKey
} from "./date-utils.js";
import {
  findLunarMonthStart,
  findNextLunarMonthStart,
  getTithiAtSunrise
} from "./astronomy.js";
import {
  clearSavedLocation,
  getLocationConfig,
  loadLocationsData,
  loadSavedLocation,
  populateCities,
  populateCountries,
  restoreSavedLocation,
  saveLocation
} from "./location.js";
import {
  getExpectedRecordForMonth,
  loadPeriodTracker,
  persistPeriodTracker,
  resetReferenceRecord,
  savePeriodStart,
  saveReferenceRecord
} from "./period-tracking.js";

export function initApp() {
  const elements = getElements();
  const state = {
    currentDate: new Date(),
    locationsData: {},
    selectedLocation: loadSavedLocation() || DEFAULT_LOCATION,
    periodTracker: loadPeriodTracker(),
    theme: loadTheme()
  };

  applyTheme(state.theme);
  bindEvents(elements, state);
  renderCalendar(elements, state);
  hydrateLocations(elements, state);
}

function getElements() {
  return {
    monthYear: document.getElementById("monthYear"),
    countrySelect: document.getElementById("countrySelect"),
    citySelect: document.getElementById("citySelect"),
    themeSelect: document.getElementById("themeSelect"),
    shuklaContainer: document.getElementById("shuklaContainer"),
    krishnaContainer: document.getElementById("krishnaContainer"),
    trackingToggle: document.getElementById("trackingToggle"),
    trackingToggleLabel: document.querySelector(".toggle-label"),
    saveReferenceButton: document.getElementById("saveReference"),
    resetReferenceButton: document.getElementById("resetReference"),
    trackerStatus: document.getElementById("trackerStatus"),
    prevButton: document.getElementById("prev"),
    nextButton: document.getElementById("next")
  };
}

async function hydrateLocations(elements, state) {
  try {
    state.locationsData = await loadLocationsData();
    populateCountries(elements.countrySelect, state.locationsData);
    restoreSavedLocation(
      elements.countrySelect,
      elements.citySelect,
      state.selectedLocation,
      state.locationsData
    );
    renderCalendar(elements, state);
  } catch (error) {
    console.error("Unable to load locations:", error);
    renderCalendar(elements, state);
  }
}

function bindEvents(elements, state) {
  elements.themeSelect.value = state.theme;

  elements.countrySelect.addEventListener("change", function handleCountryChange() {
    populateCities(elements.citySelect, this.value, state.locationsData);
  });

  elements.themeSelect.addEventListener("change", function handleThemeChange() {
    state.theme = this.value;
    saveTheme(state.theme);
    applyTheme(state.theme);
  });

  elements.citySelect.addEventListener("change", function handleCityChange() {
    if (!this.value) {
      state.selectedLocation = DEFAULT_LOCATION;
      clearSavedLocation();
      renderCalendar(elements, state);
      return;
    }

    state.selectedLocation = JSON.parse(this.value);
    saveLocation(state.selectedLocation);
    renderCalendar(elements, state);
  });

  elements.trackingToggle.addEventListener("change", function handleTrackingToggle() {
    state.periodTracker.enabled = this.checked;
    persistPeriodTracker(state.periodTracker);
    renderCalendar(elements, state);
  });

  elements.saveReferenceButton.addEventListener("click", () => {
    const config = getLocationConfig(state.selectedLocation, state.locationsData);
    const displayedLocal = getLocalDateParts(state.currentDate, config.timeZone);
    const lunarMonthStart = findLunarMonthStart(displayedLocal, config);
    const currentRecord = state.periodTracker.history[getLocalDayKey(lunarMonthStart)];
    saveReferenceRecord(state.periodTracker, currentRecord);
    renderCalendar(elements, state);
  });

  elements.resetReferenceButton.addEventListener("click", () => {
    resetReferenceRecord(state.periodTracker);
    renderCalendar(elements, state);
  });

  document.addEventListener("click", (event) => {
    const trackButton = event.target.closest('[data-action="track-period"]');

    if (!trackButton || !state.periodTracker.enabled) {
      return;
    }

    savePeriodStart(
      state.periodTracker,
      trackButton.dataset.monthKey,
      Number(trackButton.dataset.tithiIndex),
      trackButton.dataset.tithiName,
      trackButton.dataset.solarLabel
    );
    renderCalendar(elements, state);
  });

  elements.prevButton.onclick = () => {
    const config = getLocationConfig(state.selectedLocation, state.locationsData);
    const currentLocalDay = getLocalDateParts(state.currentDate, config.timeZone);
    const currentLunarMonthStart = findLunarMonthStart(currentLocalDay, config);
    const previousLocalDay = addLocalDays(currentLunarMonthStart, -1);
    state.currentDate = getDateFromLocalParts(
      previousLocalDay.year,
      previousLocalDay.month,
      previousLocalDay.day,
      12,
      0,
      config.timeZone
    );
    renderCalendar(elements, state);
  };

  elements.nextButton.onclick = () => {
    const config = getLocationConfig(state.selectedLocation, state.locationsData);
    const currentLocalDay = getLocalDateParts(state.currentDate, config.timeZone);
    const currentLunarMonthStart = findLunarMonthStart(currentLocalDay, config);
    const nextLunarMonthStart = findNextLunarMonthStart(currentLunarMonthStart, config);
    state.currentDate = getDateFromLocalParts(
      nextLunarMonthStart.year,
      nextLunarMonthStart.month,
      nextLunarMonthStart.day,
      12,
      0,
      config.timeZone
    );
    renderCalendar(elements, state);
  };
}

function renderCalendar(elements, state) {
  elements.shuklaContainer.innerHTML = "";
  elements.krishnaContainer.innerHTML = "";

  const config = getLocationConfig(state.selectedLocation, state.locationsData);
  const displayedLocal = getLocalDateParts(state.currentDate, config.timeZone);
  const actualTodayLocal = getLocalDateParts(new Date(), config.timeZone);
  const lunarMonthStart = findLunarMonthStart(displayedLocal, config);
  const lunarMonthEnd = addLocalDays(lunarMonthStart, 29);
  const currentMonthKey = getLocalDayKey(lunarMonthStart);
  const currentRecord = state.periodTracker.history[currentMonthKey] || null;
  const expectedRecord = getExpectedRecordForMonth(state.periodTracker, lunarMonthStart, config);

  elements.monthYear.textContent = formatLunarMonthLabel(
    lunarMonthStart,
    lunarMonthEnd,
    config.timeZone
  );
  syncTrackingControls(elements, state.periodTracker, currentRecord, expectedRecord);

  for (let offset = 0; offset < 30; offset += 1) {
    const localDay = addLocalDays(lunarMonthStart, offset);
    const tithi = getTithiAtSunrise(localDay, config);
    const solarLabel = formatLocalMonthDay(localDay, config.timeZone);
    const isToday =
      localDay.year === actualTodayLocal.year &&
      localDay.month === actualTodayLocal.month &&
      localDay.day === actualTodayLocal.day;
    const isLoggedStart = currentRecord && currentRecord.tithiIndex === tithi.index;
    const isExpectedStart =
      !isLoggedStart && expectedRecord && expectedRecord.tithiIndex === tithi.index;
    const trackingAction = state.periodTracker.enabled
      ? `
        <button
          class="track-button ${isLoggedStart ? "selected" : ""}"
          type="button"
          data-action="track-period"
          data-month-key="${currentMonthKey}"
          data-tithi-index="${tithi.index}"
          data-tithi-name="${tithi.name}"
          data-solar-label="${solarLabel}"
        >
          ${isLoggedStart ? "Started" : "Mark Start"}
        </button>
      `
      : "";

    const card = `
      <div class="day ${isToday ? "today" : ""} ${isLoggedStart ? "period-start" : ""} ${isExpectedStart ? "expected-start" : ""}">
        <div class="day-badges">
          ${isExpectedStart ? '<span class="day-badge expected">Expected</span>' : ""}
          ${isLoggedStart ? '<span class="day-badge actual">🩸</span>' : ""}
        </div>
        <div class="tithi-primary">${tithi.name}</div>
        <div class="solar-date">${solarLabel}</div>
        ${trackingAction}
      </div>
    `;

    if (tithi.paksha === "Shukla") {
      elements.shuklaContainer.insertAdjacentHTML("beforeend", card);
    } else {
      elements.krishnaContainer.insertAdjacentHTML("beforeend", card);
    }
  }
}

function loadTheme() {
  return localStorage.getItem(STORAGE_KEYS.theme) || DEFAULT_THEME;
}

function saveTheme(theme) {
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
}

function syncTrackingControls(elements, periodTracker, currentRecord, expectedRecord) {
  elements.trackingToggle.checked = periodTracker.enabled;
  elements.trackingToggleLabel.textContent = periodTracker.enabled ? "On" : "Off";
  elements.saveReferenceButton.disabled = !periodTracker.enabled || !currentRecord;
  elements.resetReferenceButton.disabled = !periodTracker.referenceRecord;

  if (!periodTracker.enabled) {
    elements.trackerStatus.innerHTML = `
      <p>Tracking is off. Turn it on to mark the tithi when your period starts.</p>
    `;
    return;
  }

  const currentLine = currentRecord
    ? `This month start: <strong>${currentRecord.tithiName}</strong> (${currentRecord.solarLabel}).`
    : "This month start: not marked yet.";
  const expectedLine = expectedRecord
    ? `Next expected tithi for this month: <strong>${expectedRecord.tithiName}</strong>.`
    : "Expected tithi will appear after you save a period start.";
  const referenceLine = periodTracker.referenceRecord
    ? `Reference: <strong>${periodTracker.referenceRecord.tithiName}</strong> (${periodTracker.referenceRecord.solarLabel}).`
    : "Reference: not saved.";

  elements.trackerStatus.innerHTML = `
    <p>${currentLine}</p>
    <p>${expectedLine}</p>
    <p>${referenceLine}</p>
  `;
}
