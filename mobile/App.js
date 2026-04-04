import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import locationsData from "../locations.json";
import {
  DEFAULT_LOCATION,
  DEFAULT_PERIOD_TRACKER,
  DEFAULT_THEME,
  STORAGE_KEYS
} from "../js/constants.js";
import {
  addLocalDays,
  getDateFromLocalParts,
  getLocalDateParts,
  getLocalDayKey
} from "../js/date-utils.js";
import {
  findCountryByCity,
  getLocationConfig
} from "../js/location.js";
import {
  findLunarMonthStart,
  findNextLunarMonthStart
} from "../js/astronomy.js";
import {
  buildCalendarData,
  clonePeriodTracker,
  formatTithiText,
  getPakshaTitle,
  getTithiDisplayLabel,
  LABEL_MODES
} from "../src/lib/calendar-data.js";

const THEMES = {
  "soft-romantic": {
    background: "#f7efeb",
    panel: "#fffaf6",
    border: "#e4cbd0",
    shadow: "#c88d9f",
    text: "#5a4a4a",
    muted: "#876e74",
    accent: "#cf6f88",
    waxing: "#ffe8ef",
    waning: "#fff0ea",
    badge: "#fff7f4",
    cardSurface: "#fffdfb",
    expected: "#efd6dd",
    actual: "#f3d0da",
    ring: "#b93258"
  },
  "natural-whimsical": {
    background: "#f4ecdf",
    panel: "#faf6ef",
    border: "#d6ccb6",
    shadow: "#a99c72",
    text: "#4f5c49",
    muted: "#72806c",
    accent: "#7f9a64",
    waxing: "#e5edd9",
    waning: "#f3dfd3",
    badge: "#f5f0e4",
    cardSurface: "#fbf7f0",
    expected: "#ead9cc",
    actual: "#dbe7cf",
    ring: "#7f9a64"
  },
  "clean-minimal": {
    background: "#f9f7f2",
    panel: "#ffffff",
    border: "#e6e0d8",
    shadow: "#c5b7a8",
    text: "#2b2b2b",
    muted: "#726b63",
    accent: "#a85d3f",
    waxing: "#ffffff",
    waning: "#f5eee6",
    badge: "#f5f1ea",
    cardSurface: "#fffdfa",
    expected: "#ece2d6",
    actual: "#f2ddd3",
    ring: "#a85d3f"
  },
  "dark-feminine": {
    background: "#17161c",
    panel: "#241f2b",
    border: "#4b4354",
    shadow: "#09080d",
    text: "#ece7eb",
    muted: "#beb4be",
    accent: "#d95d7f",
    waxing: "#3b2c36",
    waning: "#292635",
    badge: "#302938",
    cardSurface: "#2b2533",
    expected: "#5b486e",
    actual: "#6a3946",
    ring: "#d95d7f"
  }
};

const countryNames = Object.keys(locationsData);
const themeNames = Object.keys(THEMES);

function normalizeExpectedRecords(value) {
  const records = Array.isArray(value) ? value : value ? [value] : [];

  return [...records]
    .sort((left, right) => left.dayKey.localeCompare(right.dayKey))
    .slice(-1);
}

function parseSavedTracker(rawValue) {
  if (!rawValue) {
    return { ...DEFAULT_PERIOD_TRACKER };
  }

  try {
    const parsed = JSON.parse(rawValue);
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
    console.error("Unable to parse saved mobile period tracker:", error);
    return { ...DEFAULT_PERIOD_TRACKER };
  }
}

function saveExpectedHistoryLocal(periodTracker, monthKey, expectedRecords) {
  if (!expectedRecords?.length) {
    delete periodTracker.expectedHistory[monthKey];
    return;
  }

  periodTracker.expectedHistory[monthKey] = normalizeExpectedRecords(expectedRecords);
}

function savePeriodStartLocal(periodTracker, monthKey, tithiIndex, tithiName, solarLabel, dayKey) {
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
}

function removePeriodStartLocal(periodTracker, monthKey, dayKey) {
  const monthHistory = (periodTracker.history[monthKey] || []).filter(
    (entry) => entry.dayKey !== dayKey
  );

  if (monthHistory.length > 0) {
    periodTracker.history[monthKey] = monthHistory;
  } else {
    delete periodTracker.history[monthKey];
  }

  periodTracker.latestRecord = Object.values(periodTracker.history)
    .flat()
    .sort((left, right) => left.dayKey.localeCompare(right.dayKey))
    .at(-1) || null;
}

export default function App() {
  const [selectedLocation, setSelectedLocation] = useState(DEFAULT_LOCATION);
  const [selectedCountry, setSelectedCountry] = useState(
    DEFAULT_LOCATION.country || findCountryByCity(DEFAULT_LOCATION.name, locationsData)
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  const [labelMode, setLabelMode] = useState(LABEL_MODES.traditional);
  const [themeName, setThemeName] = useState(DEFAULT_THEME);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [themePickerVisible, setThemePickerVisible] = useState(false);
  const [periodTracker, setPeriodTracker] = useState({ ...DEFAULT_PERIOD_TRACKER });
  const [trackerReady, setTrackerReady] = useState(false);
  const [markDateEnabled, setMarkDateEnabled] = useState(false);
  const [trackerError, setTrackerError] = useState("");
  const theme = THEMES[themeName] || THEMES[DEFAULT_THEME];

  useEffect(() => {
    let active = true;

    Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.periodTracker),
      AsyncStorage.getItem(STORAGE_KEYS.location),
      AsyncStorage.getItem(STORAGE_KEYS.labelMode),
      AsyncStorage.getItem(STORAGE_KEYS.theme)
    ])
      .then(([trackerValue, locationValue, labelModeValue, themeValue]) => {
        if (!active) {
          return;
        }

        setPeriodTracker(parseSavedTracker(trackerValue));

        if (locationValue) {
          try {
            const parsedLocation = JSON.parse(locationValue);

            if (parsedLocation?.name && Number.isFinite(parsedLocation.lat) && Number.isFinite(parsedLocation.lon)) {
              setSelectedLocation(parsedLocation);
              setSelectedCountry(
                parsedLocation.country ||
                findCountryByCity(parsedLocation.name, locationsData) ||
                DEFAULT_LOCATION.country
              );
            }
          } catch (error) {
            console.error("Unable to parse saved mobile location:", error);
          }
        }

        if (labelModeValue === LABEL_MODES.traditional || labelModeValue === LABEL_MODES.english) {
          setLabelMode(labelModeValue);
        }

        if (themeValue && THEMES[themeValue]) {
          setThemeName(themeValue);
        }

        setTrackerReady(true);
      })
      .catch((error) => {
        console.error("Unable to load mobile period tracker:", error);
        if (active) {
          setTrackerReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!trackerReady) {
      return;
    }

    Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.periodTracker, JSON.stringify(periodTracker)),
      AsyncStorage.setItem(STORAGE_KEYS.location, JSON.stringify(selectedLocation)),
      AsyncStorage.setItem(STORAGE_KEYS.labelMode, labelMode),
      AsyncStorage.setItem(STORAGE_KEYS.theme, themeName)
    ]).catch((error) => {
      console.error("Unable to persist mobile app state:", error);
    });
  }, [labelMode, periodTracker, selectedLocation, themeName, trackerReady]);

  const calendarData = useMemo(
    () => buildCalendarData(currentDate, selectedLocation, locationsData, periodTracker),
    [currentDate, periodTracker, selectedLocation]
  );

  useEffect(() => {
    if (!trackerReady || !periodTracker.enabled || !calendarData) {
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
    saveExpectedHistoryLocal(nextTracker, calendarData.monthKey, calendarData.expectedRecords);
    setPeriodTracker(nextTracker);
  }, [calendarData, periodTracker, trackerReady]);

  const cityOptions = selectedCountry ? locationsData[selectedCountry] || [] : [];

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
    const nextLunarMonthStart = findNextLunarMonthStart(currentLunarMonthStart, calendarData.config);

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

  const handleSelectLocation = (city) => {
    const nextLocation = {
      ...city,
      country: selectedCountry
    };

    setSelectedLocation(nextLocation);
    setCurrentDate(new Date());
    setPickerVisible(false);
  };

  const handleTrackPeriod = ({ monthKey, tithiIndex, tithiName, solarLabel, dayKey }) => {
    const monthRecords = periodTracker.history[monthKey] || [];

    if (monthRecords.some((record) => record.dayKey === dayKey)) {
      const nextTracker = clonePeriodTracker(periodTracker);
      removePeriodStartLocal(nextTracker, monthKey, dayKey);
      setPeriodTracker(nextTracker);
      setTrackerError("");
      return;
    }

    if (monthRecords.length >= 2) {
      setTrackerError("You can only mark up to 2 period start dates in one lunar month.");
      return;
    }

    const nextTracker = clonePeriodTracker(periodTracker);
    saveExpectedHistoryLocal(nextTracker, monthKey, calendarData.expectedRecords);
    savePeriodStartLocal(nextTracker, monthKey, tithiIndex, tithiName, solarLabel, dayKey);
    setPeriodTracker(nextTracker);
    setTrackerError("");
  };

  const handleToggleTracking = () => {
    const nextEnabled = !periodTracker.enabled;

    setPeriodTracker((currentTracker) => ({
      ...clonePeriodTracker(currentTracker),
      enabled: nextEnabled
    }));

    if (!nextEnabled) {
      setMarkDateEnabled(false);
      setTrackerError("");
    }
  };

  const handleClearTrackingData = () => {
    const clearedTracker = { ...DEFAULT_PERIOD_TRACKER };
    setPeriodTracker(clearedTracker);
    setMarkDateEnabled(false);
    setTrackerError("");
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.panel,
              borderColor: theme.border,
              shadowColor: theme.shadow
            }
          ]}
        >
          <Text style={[styles.kicker, { color: theme.muted }]}>Lunar Rhythm Planner</Text>
          <Text style={[styles.heroTitle, { color: theme.text }]}>Mobile Calendar</Text>
          <Text style={[styles.heroCopy, { color: theme.muted }]}>
            A native month view using the same sunrise-based tithi logic as the web app.
          </Text>
        </View>

        <View style={styles.settingsStack}>
          <View
            style={[
              styles.settingCard,
              {
                backgroundColor: theme.panel,
                borderColor: theme.border,
                shadowColor: theme.shadow
              }
            ]}
          >
            <Text style={[styles.kicker, { color: theme.muted, marginBottom: 6 }]}>Location</Text>
            <Text style={[styles.settingTitle, { color: theme.text }]}>Choose your city</Text>
            <Text style={[styles.settingBody, { color: theme.muted }]}>
              Sunrise and month boundaries follow the selected location.
            </Text>
            <Pressable
              style={[styles.pillButton, { backgroundColor: theme.badge, borderColor: theme.border, marginTop: 14 }]}
              onPress={() => setPickerVisible(true)}
            >
              <Text style={[styles.pillLabel, { color: theme.text }]}>
                {selectedLocation.name}, {selectedCountry}
              </Text>
            </Pressable>
          </View>

          <View
            style={[
              styles.settingCard,
              {
                backgroundColor: theme.panel,
                borderColor: theme.border,
                shadowColor: theme.shadow
              }
            ]}
          >
            <Text style={[styles.kicker, { color: theme.muted, marginBottom: 6 }]}>Theme</Text>
            <Text style={[styles.settingTitle, { color: theme.text }]}>Choose the look</Text>
            <Text style={[styles.settingBody, { color: theme.muted }]}>
              Switch between the same visual themes available on the web app.
            </Text>
            <Pressable
              style={[styles.pillButton, { backgroundColor: theme.badge, borderColor: theme.border, marginTop: 14 }]}
              onPress={() => setThemePickerVisible(true)}
            >
              <Text style={[styles.pillLabel, { color: theme.text }]}>
                {themeName.replace("-", " ")}
              </Text>
            </Pressable>
          </View>

          <View
            style={[
              styles.settingCard,
              {
                backgroundColor: theme.panel,
                borderColor: theme.border,
                shadowColor: theme.shadow
              }
            ]}
          >
            <Text style={[styles.kicker, { color: theme.muted, marginBottom: 6 }]}>Label Style</Text>
            <Text style={[styles.settingTitle, { color: theme.text }]}>Tithi label mode</Text>
            <Text style={[styles.settingBody, { color: theme.muted }]}>
              Toggle between traditional names and simplified English labels.
            </Text>
            <Pressable
              style={[styles.pillButton, { backgroundColor: theme.badge, borderColor: theme.border, marginTop: 14 }]}
              onPress={() =>
                setLabelMode((value) =>
                  value === LABEL_MODES.traditional ? LABEL_MODES.english : LABEL_MODES.traditional
                )
              }
            >
              <Text style={[styles.pillLabel, { color: theme.text }]}>
                {labelMode === LABEL_MODES.traditional ? "Traditional" : "English"}
              </Text>
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.calendarCard,
            {
              backgroundColor: theme.panel,
              borderColor: theme.border,
              shadowColor: theme.shadow
            }
          ]}
        >
          <View style={styles.monthNav}>
            <Pressable
              style={[styles.navButton, { borderColor: theme.border, backgroundColor: theme.badge }]}
              onPress={handlePreviousMonth}
            >
              <Text style={[styles.navButtonText, { color: theme.text }]}>Prev</Text>
            </Pressable>

            <View style={styles.monthTextWrap}>
              <Text style={[styles.monthTitle, { color: theme.text }]}>{calendarData.monthLabel}</Text>
              <Text style={[styles.monthSubtitle, { color: theme.muted }]}>
                {calendarData.monthSubLabel}
              </Text>
            </View>

            <Pressable
              style={[styles.navButton, { borderColor: theme.border, backgroundColor: theme.badge }]}
              onPress={handleNextMonth}
            >
              <Text style={[styles.navButtonText, { color: theme.text }]}>Next</Text>
            </Pressable>
          </View>
          <PakshaBlock
            title={getPakshaTitle("Shukla", labelMode)}
            days={calendarData.shuklaDays}
            labelMode={labelMode}
            theme={theme}
            backgroundColor={theme.waxing}
            trackingEnabled={periodTracker.enabled}
            markDateEnabled={markDateEnabled}
            monthKey={calendarData.monthKey}
            onTrackPeriod={handleTrackPeriod}
          />

          <PakshaBlock
            title={getPakshaTitle("Krishna", labelMode)}
            days={calendarData.krishnaDays}
            labelMode={labelMode}
            theme={theme}
            backgroundColor={theme.waning}
            trackingEnabled={periodTracker.enabled}
            markDateEnabled={markDateEnabled}
            monthKey={calendarData.monthKey}
            onTrackPeriod={handleTrackPeriod}
          />
        </View>

        <View
          style={[
            styles.trackerCard,
            {
              backgroundColor: theme.panel,
              borderColor: theme.border,
              shadowColor: theme.shadow
            }
          ]}
        >
          <View style={styles.trackerHeader}>
            <View style={styles.trackerHeadingCopy}>
              <Text style={[styles.kicker, { color: theme.muted, marginBottom: 4 }]}>Cycle Tracking</Text>
              <Text style={[styles.trackerTitle, { color: theme.text }]}>Period Tracking</Text>
              <Text style={[styles.trackerBody, { color: theme.muted }]}>
                Works offline on your phone. Turn on Mark Date, then tap a day card.
              </Text>
            </View>

            <Pressable
              style={[
                styles.toggleButton,
                {
                  backgroundColor: periodTracker.enabled ? theme.text : theme.badge,
                  borderColor: theme.border
                }
              ]}
              onPress={handleToggleTracking}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  { color: periodTracker.enabled ? theme.panel : theme.text }
                ]}
              >
                {periodTracker.enabled ? "Tracking On" : "Tracking Off"}
              </Text>
            </Pressable>
          </View>

          {periodTracker.enabled ? (
            <>
              <View style={styles.trackerActions}>
                <Pressable
                  style={[
                    styles.smallActionButton,
                    {
                      backgroundColor: markDateEnabled ? theme.text : theme.badge,
                      borderColor: theme.border
                    }
                  ]}
                  onPress={() => setMarkDateEnabled((value) => !value)}
                >
                  <Text
                    style={[
                      styles.smallActionText,
                      { color: markDateEnabled ? theme.panel : theme.text }
                    ]}
                  >
                    {markDateEnabled ? "Mark Date On" : "Mark Date Off"}
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.smallActionButton,
                    { backgroundColor: theme.badge, borderColor: theme.border }
                  ]}
                  onPress={handleClearTrackingData}
                >
                  <Text style={[styles.smallActionText, { color: theme.text }]}>Clear Data</Text>
                </Pressable>
              </View>

              {trackerError ? (
                <Text style={[styles.trackerError, { color: "#b05555" }]}>{trackerError}</Text>
              ) : null}

              <View style={styles.trackerStatus}>
                <Text style={[styles.trackerStatusText, { color: theme.muted }]}>
                  {calendarData.currentRecords.length > 0
                    ? `Period starts this month: ${calendarData.currentRecords
                        .map((record) =>
                          `${formatTithiText(record.tithiIndex, record.tithiName, labelMode)} (${record.solarLabel})`
                        )
                        .join(", ")}.`
                    : "This month period start is not marked yet."}
                </Text>
                <Text style={[styles.trackerStatusText, { color: theme.muted }]}>
                  {calendarData.expectedRecords.length > 0
                    ? `Expected date: ${calendarData.expectedRecords
                        .map((record) =>
                          `${formatTithiText(record.tithiIndex, record.tithiName, labelMode)} on ${record.solarLabel}`
                        )
                        .join(", ")}.`
                    : "Expected date will appear once you mark a period start."}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.panel,
              borderColor: theme.border,
              shadowColor: theme.shadow
            }
          ]}
        >
          <Text style={[styles.kicker, { color: theme.muted, marginBottom: 6 }]}>About This Calendar</Text>
          <Text style={[styles.infoTitle, { color: theme.text }]}>
            Lunar months here begin with the tithi cycle, not the Gregorian month.
          </Text>
          <Text style={[styles.infoBody, { color: theme.muted }]}>
            The mobile app follows the same sunrise-based tithi calculation, month naming,
            location rules, and cycle tracking behavior as the web calendar.
          </Text>
        </View>
      </ScrollView>

      <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalPanel, { backgroundColor: theme.panel, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Choose location</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.countryRow}>
              {countryNames.map((country) => (
                <Pressable
                  key={country}
                  style={[
                    styles.countryChip,
                    {
                      borderColor: country === selectedCountry ? theme.accent : theme.border,
                      backgroundColor: country === selectedCountry ? "#fff1ea" : theme.badge
                    }
                  ]}
                  onPress={() => setSelectedCountry(country)}
                >
                  <Text style={[styles.countryChipText, { color: theme.text }]}>{country}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <ScrollView style={styles.cityList}>
              {cityOptions.map((city) => (
                <Pressable
                  key={`${selectedCountry}-${city.name}`}
                  style={[styles.cityRow, { borderBottomColor: theme.border }]}
                  onPress={() => handleSelectLocation(city)}
                >
                  <Text style={[styles.cityName, { color: theme.text }]}>{city.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              style={[styles.closeButton, { backgroundColor: theme.text }]}
              onPress={() => setPickerVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={themePickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setThemePickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalPanel, { backgroundColor: theme.panel, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Choose theme</Text>

            <View style={styles.themeList}>
              {themeNames.map((name) => (
                <Pressable
                  key={name}
                  style={[
                    styles.themeRow,
                    {
                      borderColor: name === themeName ? theme.accent : theme.border,
                      backgroundColor: name === themeName ? theme.badge : "transparent"
                    }
                  ]}
                  onPress={() => {
                    setThemeName(name);
                    setThemePickerVisible(false);
                  }}
                >
                  <Text style={[styles.cityName, { color: theme.text }]}>{name.replace("-", " ")}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.closeButton, { backgroundColor: theme.text }]}
              onPress={() => setThemePickerVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function PakshaBlock({
  title,
  days,
  labelMode,
  theme,
  backgroundColor,
  trackingEnabled,
  markDateEnabled,
  monthKey,
  onTrackPeriod
}) {
  return (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: theme.panel,
          borderColor: theme.border,
          shadowColor: theme.shadow
        }
      ]}
    >
      <View style={[styles.sectionHeader, { backgroundColor }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      </View>

      <View style={styles.dayGrid}>
        {days.map((day) => (
          <DayTile
            key={day.key}
            day={day}
            labelMode={labelMode}
            theme={theme}
            trackingEnabled={trackingEnabled}
            markDateEnabled={markDateEnabled}
            monthKey={monthKey}
            onTrackPeriod={onTrackPeriod}
          />
        ))}
      </View>
    </View>
  );
}

function DayTile({
  day,
  labelMode,
  theme,
  trackingEnabled,
  markDateEnabled,
  monthKey,
  onTrackPeriod
}) {
  const label = getTithiDisplayLabel(day.tithi.index, day.tithi.name, labelMode);

  return (
    <Pressable
      style={[
        styles.dayTile,
        {
          borderColor: day.isToday ? theme.ring : day.isLoggedStart ? theme.text : theme.border,
          backgroundColor: day.isExpectedStart ? theme.badge : theme.cardSurface
        }
      ]}
      disabled={!trackingEnabled || !markDateEnabled}
      onPress={() =>
        onTrackPeriod({
          monthKey,
          tithiIndex: day.tithi.index,
          tithiName: day.tithi.name,
          solarLabel: day.solarLabel,
          dayKey: day.dayKey
        })
      }
    >
      <View style={styles.dayTileCorner}>
        {day.isExpectedStart ? (
          <View style={[styles.badge, { backgroundColor: theme.expected }]}>
            <Text style={[styles.badgeText, { color: theme.text }]}>Expected</Text>
          </View>
        ) : null}
        {day.isLoggedStart ? (
          <View style={[styles.badge, { backgroundColor: theme.actual }]}>
            <Text style={[styles.badgeText, { color: theme.text }]}>Marked</Text>
          </View>
        ) : null}
        {label.secondary ? <Text style={styles.phaseIcon}>{label.secondary}</Text> : null}
      </View>
      <Text style={[styles.dayPrimary, { color: theme.text }]}>{label.primary}</Text>
      <Text style={[styles.dayWeekday, { color: theme.muted }]}>{day.weekdayLabel}</Text>
      <Text style={[styles.daySolar, { color: theme.muted }]}>{day.solarLabel}</Text>
      {day.isToday ? <Text style={[styles.tapHint, { color: theme.ring }]}>Today</Text> : null}
      {trackingEnabled && markDateEnabled ? (
        <Text style={[styles.tapHint, { color: theme.muted }]}>
          {day.isLoggedStart ? "Tap to unmark" : "Tap to mark"}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    gap: 16
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 18,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2
  },
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase"
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "700",
    marginBottom: 8
  },
  heroCopy: {
    fontSize: 15,
    lineHeight: 22
  },
  pillButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: "600"
  },
  settingsStack: {
    gap: 16
  },
  settingCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 18,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: "700"
  },
  settingBody: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6
  },
  calendarCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 18,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  navButton: {
    minWidth: 64,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: "700"
  },
  monthTextWrap: {
    flex: 1,
    alignItems: "center"
  },
  monthTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "700",
    textAlign: "center"
  },
  monthSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
    textAlign: "center"
  },
  trackerCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 18,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2
  },
  trackerHeader: {
    gap: 12
  },
  trackerHeadingCopy: {
    gap: 4
  },
  trackerTitle: {
    fontSize: 18,
    fontWeight: "700"
  },
  trackerBody: {
    fontSize: 14,
    lineHeight: 20
  },
  toggleButton: {
    borderWidth: 1,
    borderRadius: 999,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: "700"
  },
  trackerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14
  },
  smallActionButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  smallActionText: {
    fontSize: 13,
    fontWeight: "700"
  },
  trackerError: {
    fontSize: 13,
    marginTop: 12
  },
  trackerStatus: {
    gap: 8,
    marginTop: 12
  },
  trackerStatusText: {
    fontSize: 14,
    lineHeight: 20
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 18,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2
  },
  infoTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "700"
  },
  infoBody: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 14,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2
  },
  sectionHeader: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700"
  },
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between"
  },
  dayTile: {
    width: "31.5%",
    aspectRatio: 0.9,
    borderWidth: 1,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    position: "relative",
    marginBottom: 12
  },
  dayTileCorner: {
    position: "absolute",
    top: 10,
    right: 10,
    alignItems: "flex-end",
    gap: 4
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  phaseIcon: {
    fontSize: 18
  },
  dayPrimary: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    textAlign: "center"
  },
  dayWeekday: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 6,
    textTransform: "uppercase"
  },
  daySolar: {
    fontSize: 11,
    marginTop: 3
  },
  tapHint: {
    fontSize: 9,
    marginTop: 6
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(38, 30, 24, 0.28)",
    justifyContent: "flex-end"
  },
  modalPanel: {
    maxHeight: "82%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 18
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14
  },
  countryRow: {
    gap: 10,
    paddingBottom: 6
  },
  countryChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  countryChipText: {
    fontSize: 14,
    fontWeight: "600"
  },
  cityList: {
    marginTop: 14,
    marginBottom: 16
  },
  themeList: {
    gap: 10,
    marginBottom: 16
  },
  cityRow: {
    paddingVertical: 14,
    borderBottomWidth: 1
  },
  themeRow: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14
  },
  cityName: {
    fontSize: 16
  },
  closeButton: {
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 14
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700"
  }
});
