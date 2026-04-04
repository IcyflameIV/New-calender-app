import {
  CITY_TIMEZONES,
  COUNTRY_TIMEZONES,
  DEFAULT_LOCATION,
  STORAGE_KEYS
} from "./constants.js";
import locationsData from "../locations.json";
import {
  safeStorageGet,
  safeStorageRemove,
  safeStorageSet
} from "./storage.js";

function isValidLocation(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof value.name === "string" &&
    Number.isFinite(value.lat) &&
    Number.isFinite(value.lon)
  );
}

export function loadSavedLocation() {
  const savedLocation = safeStorageGet(STORAGE_KEYS.location);

  if (!savedLocation) {
    return null;
  }

  try {
    const parsed = JSON.parse(savedLocation);

    if (!isValidLocation(parsed)) {
      safeStorageRemove(STORAGE_KEYS.location);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error("Unable to parse saved location:", error);
    safeStorageRemove(STORAGE_KEYS.location);
    return null;
  }
}

export function saveLocation(location) {
  safeStorageSet(STORAGE_KEYS.location, JSON.stringify(location));
}

export function clearSavedLocation() {
  safeStorageRemove(STORAGE_KEYS.location);
}

export function getLocationConfig(location, locationsData) {
  const resolvedLocation = isValidLocation(location) ? location : DEFAULT_LOCATION;
  const country =
    resolvedLocation.country ||
    findCountryByCity(resolvedLocation.name, locationsData) ||
    DEFAULT_LOCATION.country;
  const cityKey = `${country}|${resolvedLocation.name}`;
  const timeZone =
    CITY_TIMEZONES[cityKey] ||
    COUNTRY_TIMEZONES[country] ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    lat: resolvedLocation.lat,
    lon: resolvedLocation.lon,
    timeZone
  };
}

export function findCountryByCity(cityName, locationsData) {
  return Object.entries(locationsData).find(([, cities]) =>
    cities.some((city) => city.name === cityName)
  )?.[0];
}

export async function loadLocationsData() {
  return locationsData;
}
