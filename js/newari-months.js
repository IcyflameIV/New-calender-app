import {
  addLocalDays,
  formatLunarMonthLabel,
  getLocalDayKey
} from "./date-utils.js";
import {
  getNextOverriddenLunarMonthStart,
  getOverriddenLunarMonthStart
} from "./lunar-month-overrides.js";
import {
  findLunarMonthStart,
  findNextLunarMonthStart
} from "./astronomy.js";

const CYCLE_ANCHOR = { year: 2025, month: 10, day: 22 };
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

const LEAP_MONTH_TITLES = {
  "2026-06-16": "The leap month"
};

const sequenceCache = new Map();

export function getMonthHeader(startDay, endDay, timeZone, config) {
  const title = getTranslatedMonthTitle(startDay, config);
  const subtitle = formatLunarMonthLabel(startDay, endDay, timeZone);

  return { title, subtitle };
}

function getTranslatedMonthTitle(startDay, config) {
  const startKey = getLocalDayKey(startDay);
  const sequence = getMonthSequence(config);

  return sequence.get(startKey) || formatFallbackTitle(startDay);
}

function getMonthSequence(config) {
  const cacheKey = `${config.lat}|${config.lon}|${config.timeZone}`;

  if (sequenceCache.has(cacheKey)) {
    return sequenceCache.get(cacheKey);
  }

  const sequence = new Map();

  sequence.set(getLocalDayKey(CYCLE_ANCHOR), ENGLISH_MONTH_TITLES[0]);

  let backwardStart = CYCLE_ANCHOR;
  let backwardIndex = 0;

  for (let step = 0; step < 24; step += 1) {
    const previousStart = findLunarMonthStart(addLocalDays(backwardStart, -1), config);
    backwardIndex =
      (backwardIndex - 1 + ENGLISH_MONTH_TITLES.length) % ENGLISH_MONTH_TITLES.length;
    sequence.set(getLocalDayKey(previousStart), ENGLISH_MONTH_TITLES[backwardIndex]);
    backwardStart = previousStart;
  }

  let forwardStart = CYCLE_ANCHOR;
  let forwardIndex = 0;

  for (let step = 0; step < 72; step += 1) {
    const nextStart = findNextLunarMonthStart(forwardStart, config);
    const nextKey = getLocalDayKey(nextStart);

    if (LEAP_MONTH_TITLES[nextKey]) {
      sequence.set(nextKey, LEAP_MONTH_TITLES[nextKey]);
    } else {
      forwardIndex = (forwardIndex + 1) % ENGLISH_MONTH_TITLES.length;
      sequence.set(nextKey, ENGLISH_MONTH_TITLES[forwardIndex]);
    }

    forwardStart = nextStart;
  }

  sequenceCache.set(cacheKey, sequence);
  return sequence;
}

function formatFallbackTitle(startDay) {
  return `Month starting ${startDay.year}-${String(startDay.month).padStart(2, "0")}-${String(startDay.day).padStart(2, "0")}`;
}
