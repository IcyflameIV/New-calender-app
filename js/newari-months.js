import {
  addLocalDays,
  compareLocalDays,
  formatLunarMonthLabel,
  getLocalDayKey
} from "./date-utils.js";
import {
  findLunarMonthStart,
  findNextLunarMonthStart
} from "./astronomy.js";

const CYCLE_ANCHOR = { year: 2025, month: 10, day: 22 };
const LEAP_CYCLE_ANCHOR = { year: 2026, month: 6, day: 16 };
const LEAP_MONTH_INTERVAL = 36;
const ENGLISH_MONTH_TITLES = [
  "The first month",
  "The month of bright sky",
  "The month of snow",
  "The month of dew",
  "The month of chills",
  "The month of shining",
  "The month of mid spring",
  "The month of heat",
  "The month of planting",
  "The month of virtue",
  "The month of harvest",
  "The month of autumn"
];
const LEAP_MONTH_TITLE = "The leap month";

const sequenceCache = new Map();

export function getMonthHeader(startDay, endDay, timeZone, config) {
  const title = getTranslatedMonthTitle(startDay, config);
  const subtitle = formatLunarMonthLabel(startDay, endDay, timeZone);

  return { title, subtitle };
}

function getTranslatedMonthTitle(startDay, config) {
  const sequenceState = getMonthSequenceState(config);
  ensureSequenceIncludes(sequenceState, startDay, config);
  return sequenceState.titles.get(getLocalDayKey(startDay)) || formatFallbackTitle(startDay);
}

function getMonthSequenceState(config) {
  const cacheKey = `${config.lat}|${config.lon}|${config.timeZone}`;

  if (sequenceCache.has(cacheKey)) {
    return sequenceCache.get(cacheKey);
  }

  const leapAnchorStep = getStepBetweenMonthStarts(CYCLE_ANCHOR, LEAP_CYCLE_ANCHOR, config);
  const initialState = {
    titles: new Map([[getLocalDayKey(CYCLE_ANCHOR), ENGLISH_MONTH_TITLES[0]]]),
    earliestStart: CYCLE_ANCHOR,
    latestStart: CYCLE_ANCHOR,
    earliestStep: 0,
    latestStep: 0,
    earliestTitleIndex: 0,
    latestTitleIndex: 0,
    leapAnchorStep
  };

  sequenceCache.set(cacheKey, initialState);
  return initialState;
}

function ensureSequenceIncludes(sequenceState, targetStart, config) {
  while (compareLocalDays(targetStart, sequenceState.earliestStart) < 0) {
    extendSequenceBackward(sequenceState, config);
  }

  while (compareLocalDays(targetStart, sequenceState.latestStart) > 0) {
    extendSequenceForward(sequenceState, config);
  }
}

function extendSequenceBackward(sequenceState, config) {
  const previousStart = findLunarMonthStart(addLocalDays(sequenceState.earliestStart, -1), config);
  const previousStep = sequenceState.earliestStep - 1;
  const isLeapMonth = isLeapStep(previousStep, sequenceState.leapAnchorStep);
  const previousTitleIndex = isLeapMonth
    ? sequenceState.earliestTitleIndex
    : (sequenceState.earliestTitleIndex - 1 + ENGLISH_MONTH_TITLES.length) % ENGLISH_MONTH_TITLES.length;

  sequenceState.titles.set(
    getLocalDayKey(previousStart),
    isLeapMonth ? LEAP_MONTH_TITLE : ENGLISH_MONTH_TITLES[previousTitleIndex]
  );
  sequenceState.earliestStart = previousStart;
  sequenceState.earliestStep = previousStep;
  sequenceState.earliestTitleIndex = previousTitleIndex;
}

function extendSequenceForward(sequenceState, config) {
  const nextStart = findNextLunarMonthStart(sequenceState.latestStart, config);
  const nextStep = sequenceState.latestStep + 1;
  const isLeapMonth = isLeapStep(nextStep, sequenceState.leapAnchorStep);
  const nextTitleIndex = isLeapMonth
    ? sequenceState.latestTitleIndex
    : (sequenceState.latestTitleIndex + 1) % ENGLISH_MONTH_TITLES.length;

  sequenceState.titles.set(
    getLocalDayKey(nextStart),
    isLeapMonth ? LEAP_MONTH_TITLE : ENGLISH_MONTH_TITLES[nextTitleIndex]
  );
  sequenceState.latestStart = nextStart;
  sequenceState.latestStep = nextStep;
  sequenceState.latestTitleIndex = nextTitleIndex;
}

function getStepBetweenMonthStarts(fromStart, targetStart, config) {
  if (getLocalDayKey(fromStart) === getLocalDayKey(targetStart)) {
    return 0;
  }

  if (compareLocalDays(targetStart, fromStart) > 0) {
    let step = 0;
    let currentStart = fromStart;

    while (step < 240) {
      step += 1;
      currentStart = findNextLunarMonthStart(currentStart, config);

      if (getLocalDayKey(currentStart) === getLocalDayKey(targetStart)) {
        return step;
      }
    }
  } else {
    let step = 0;
    let currentStart = fromStart;

    while (step < 240) {
      step -= 1;
      currentStart = findLunarMonthStart(addLocalDays(currentStart, -1), config);

      if (getLocalDayKey(currentStart) === getLocalDayKey(targetStart)) {
        return step;
      }
    }
  }

  return 0;
}

function isLeapStep(step, leapAnchorStep) {
  return (step - leapAnchorStep) % LEAP_MONTH_INTERVAL === 0;
}

function formatFallbackTitle(startDay) {
  return `Month starting ${startDay.year}-${String(startDay.month).padStart(2, "0")}-${String(startDay.day).padStart(2, "0")}`;
}
