import { useEffect, useState } from "react";
import { DEFAULT_LOCATION, DEFAULT_THEME, STORAGE_KEYS } from "../../js/constants.js";
import {
  addLocalDays,
  getDateFromLocalParts,
  getLocalDateParts,
  getLocalDayKey
} from "../../js/date-utils.js";
import {
  findLunarMonthStart,
  findNextLunarMonthStart
} from "../../js/astronomy.js";
import {
  clearSavedLocation,
  findCountryByCity,
  getLocationConfig,
  loadLocationsData,
  loadSavedLocation,
  saveLocation
} from "../../js/location.js";
import { safeStorageGet, safeStorageSet } from "../../js/storage.js";
import {
  buildCalendarData,
  LABEL_MODES
} from "../lib/calendar-data.js";

export default function useCalendarState(periodTracker) {
  const savedLocation = loadSavedLocation() || DEFAULT_LOCATION;
  const [locationsData, setLocationsData] = useState({});
  const [selectedLocation, setSelectedLocation] = useState(savedLocation);
  const [selectedCountry, setSelectedCountry] = useState(
    savedLocation.country || DEFAULT_LOCATION.country
  );
  const [theme, setTheme] = useState(safeStorageGet(STORAGE_KEYS.theme) || DEFAULT_THEME);
  const [labelMode, setLabelMode] = useState(
    safeStorageGet(STORAGE_KEYS.labelMode) || LABEL_MODES.traditional
  );
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    let active = true;

    loadLocationsData()
      .then((data) => {
        if (!active) {
          return;
        }

        setLocationsData(data);
        setSelectedCountry(
          savedLocation.country ||
            findCountryByCity(savedLocation.name, data) ||
            DEFAULT_LOCATION.country
        );
      })
      .catch((error) => {
        console.error("Unable to load locations:", error);
      });

    return () => {
      active = false;
    };
  }, [savedLocation.country, savedLocation.name]);

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
  const selectedCityValue = JSON.stringify({
    name: selectedLocation.name,
    lat: selectedLocation.lat,
    lon: selectedLocation.lon,
    country: selectedLocation.country || selectedCountry
  });

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

  return {
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
  };
}
