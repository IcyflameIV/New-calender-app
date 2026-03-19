import {
  CITY_TIMEZONES,
  COUNTRY_TIMEZONES,
  DEFAULT_LOCATION,
  STORAGE_KEYS
} from "./constants.js";

export function loadSavedLocation() {
  const savedLocation = localStorage.getItem(STORAGE_KEYS.location);

  if (!savedLocation) {
    return null;
  }

  try {
    return JSON.parse(savedLocation);
  } catch (error) {
    console.error("Unable to parse saved location:", error);
    localStorage.removeItem(STORAGE_KEYS.location);
    return null;
  }
}

export function saveLocation(location) {
  localStorage.setItem(STORAGE_KEYS.location, JSON.stringify(location));
}

export function clearSavedLocation() {
  localStorage.removeItem(STORAGE_KEYS.location);
}

export function getLocationConfig(location, locationsData) {
  const resolvedLocation = location || DEFAULT_LOCATION;
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

export function populateCountries(countrySelect, locationsData) {
  Object.keys(locationsData).forEach((country) => {
    const option = document.createElement("option");
    option.value = country;
    option.textContent = country;
    countrySelect.appendChild(option);
  });
}

export function populateCities(citySelect, selectedCountry, locationsData) {
  citySelect.innerHTML = '<option value="">Select City</option>';

  if (!selectedCountry || !locationsData[selectedCountry]) {
    citySelect.disabled = true;
    return;
  }

  locationsData[selectedCountry].forEach((city) => {
    const option = document.createElement("option");
    option.value = JSON.stringify({ ...city, country: selectedCountry });
    option.textContent = city.name;
    citySelect.appendChild(option);
  });

  citySelect.disabled = false;
}

export function restoreSavedLocation(countrySelect, citySelect, selectedLocation, locationsData) {
  if (!selectedLocation) {
    return;
  }

  const country = selectedLocation.country || findCountryByCity(selectedLocation.name, locationsData);

  if (!country) {
    return;
  }

  countrySelect.value = country;
  populateCities(citySelect, country, locationsData);
  citySelect.value = JSON.stringify({
    name: selectedLocation.name,
    lat: selectedLocation.lat,
    lon: selectedLocation.lon,
    country
  });
}

export async function loadLocationsData() {
  const response = await fetch("locations.json");
  return response.json();
}
