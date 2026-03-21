import { compareLocalDays, getLocalDayKey } from "./date-utils.js";


export function getOverriddenLunarMonthStart(referenceDay) {
  for (let index = 0; index < MONTH_START_OVERRIDES.length; index += 1) {
    const { start, endExclusive } = MONTH_START_OVERRIDES[index];

    if (compareLocalDays(referenceDay, start) < 0) {
      continue;
    }

    if (compareLocalDays(referenceDay, endExclusive) < 0) {
      return start;
    }
  }

  return null;
}

export function getNextOverriddenLunarMonthStart(referenceDay) {
  const currentOverride = getOverriddenLunarMonthStart(referenceDay);

  if (!currentOverride) {
    return null;
  }

  const currentIndex = MONTH_START_OVERRIDES.findIndex(
    (override) => getLocalDayKey(override.start) === getLocalDayKey(currentOverride)
  );

  return MONTH_START_OVERRIDES[currentIndex + 1]?.start || null;
}
