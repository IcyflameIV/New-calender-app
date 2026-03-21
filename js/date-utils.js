export function getLocalDateParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year").value),
    month: Number(parts.find((part) => part.type === "month").value),
    day: Number(parts.find((part) => part.type === "day").value)
  };
}

export function formatLocalMonthDay(localDay, timeZone) {
  return getDateFromLocalParts(localDay.year, localDay.month, localDay.day, 12, 0, timeZone)
    .toLocaleDateString(undefined, {
      timeZone,
      month: "short",
      day: "numeric"
    });
}

export function formatLunarMonthLabel(startDay, endDay, timeZone) {
  const startLabel = formatLocalMonthDay(startDay, timeZone);
  const endLabel = getDateFromLocalParts(endDay.year, endDay.month, endDay.day, 12, 0, timeZone)
    .toLocaleDateString(undefined, {
      timeZone,
      month: "short",
      day: "numeric",
      year: "numeric"
    });

  return `${startLabel} - ${endLabel}`;
}

export function addLocalDays(localDay, delta) {
  const result = new Date(Date.UTC(localDay.year, localDay.month - 1, localDay.day + delta));

  return {
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate()
  };
}

export function getDayOfYear(year, month, day) {
  const startOfYear = Date.UTC(year, 0, 0);
  const currentDay = Date.UTC(year, month - 1, day);
  return Math.floor((currentDay - startOfYear) / 86400000);
}

export function getDateFromLocalParts(year, month, day, hour, minute, timeZone) {
  let utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const offsetMinutes = getTimeZoneOffsetMinutes(new Date(utcGuess), timeZone);
    const corrected = Date.UTC(year, month - 1, day, hour, minute, 0) - offsetMinutes * 60000;

    if (corrected === utcGuess) {
      break;
    }

    utcGuess = corrected;
  }

  return new Date(utcGuess);
}

export function getTimeZoneOffsetMinutes(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year").value);
  const month = Number(parts.find((part) => part.type === "month").value);
  const day = Number(parts.find((part) => part.type === "day").value);
  const hour = Number(parts.find((part) => part.type === "hour").value);
  const minute = Number(parts.find((part) => part.type === "minute").value);
  const second = Number(parts.find((part) => part.type === "second").value);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);

  return (asUtc - date.getTime()) / 60000;
}

export function getLocalDayKey(localDay) {
  return `${localDay.year}-${String(localDay.month).padStart(2, "0")}-${String(localDay.day).padStart(2, "0")}`;
}

export function parseLocalDayKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}

export function compareLocalDays(left, right) {
  return (
    Date.UTC(left.year, left.month - 1, left.day) -
    Date.UTC(right.year, right.month - 1, right.day)
  );
}
