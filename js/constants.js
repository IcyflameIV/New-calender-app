export const TITHIS = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
  "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
  "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima",
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
  "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
  "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Amavasya"
];

export const COUNTRY_TIMEZONES = {
  Nepal: "Asia/Kathmandu",
  India: "Asia/Kolkata",
  UK: "Europe/London",
  France: "Europe/Paris",
  Germany: "Europe/Berlin",
  Italy: "Europe/Rome",
  China: "Asia/Shanghai",
  Japan: "Asia/Tokyo",
  "South Korea": "Asia/Seoul",
  Turkey: "Europe/Istanbul",
  Egypt: "Africa/Cairo",
  Spain: "Europe/Madrid",
  Netherlands: "Europe/Amsterdam",
  Sweden: "Europe/Stockholm",
  Norway: "Europe/Oslo",
  Switzerland: "Europe/Zurich",
  Argentina: "America/Argentina/Buenos_Aires",
  "South Africa": "Africa/Johannesburg",
  "Saudi Arabia": "Asia/Riyadh",
  UAE: "Asia/Dubai",
  Thailand: "Asia/Bangkok"
};

export const CITY_TIMEZONES = {
  "USA|New York": "America/New_York",
  "USA|Los Angeles": "America/Los_Angeles",
  "USA|Chicago": "America/Chicago",
  "USA|Houston": "America/Chicago",
  "USA|San Francisco": "America/Los_Angeles",
  "Canada|Toronto": "America/Toronto",
  "Canada|Vancouver": "America/Vancouver",
  "Canada|Montreal": "America/Montreal",
  "Canada|Calgary": "America/Edmonton",
  "Canada|Ottawa": "America/Toronto",
  "Australia|Sydney": "Australia/Sydney",
  "Australia|Melbourne": "Australia/Melbourne",
  "Australia|Brisbane": "Australia/Brisbane",
  "Australia|Perth": "Australia/Perth",
  "Australia|Adelaide": "Australia/Adelaide",
  "Brazil|São Paulo": "America/Sao_Paulo",
  "Brazil|Rio de Janeiro": "America/Sao_Paulo",
  "Brazil|Brasília": "America/Sao_Paulo",
  "Brazil|Salvador": "America/Bahia",
  "Brazil|Fortaleza": "America/Fortaleza",
  "Russia|Moscow": "Europe/Moscow",
  "Russia|Saint Petersburg": "Europe/Moscow",
  "Russia|Novosibirsk": "Asia/Novosibirsk",
  "Russia|Yekaterinburg": "Asia/Yekaterinburg",
  "Russia|Kazan": "Europe/Moscow",
  "Mexico|Mexico City": "America/Mexico_City",
  "Mexico|Guadalajara": "America/Mexico_City",
  "Mexico|Monterrey": "America/Monterrey",
  "Mexico|Puebla": "America/Mexico_City",
  "Mexico|Cancún": "America/Cancun"
};

export const DEFAULT_LOCATION = {
  country: "Nepal",
  name: "Kathmandu",
  lat: 27.7172,
  lon: 85.324
};

export const STORAGE_KEYS = {
  location: "userLocation",
  periodTracker: "periodTracker",
  theme: "uiTheme",
  labelMode: "labelMode"
};

export const DEFAULT_THEME = "soft-romantic";

export const DEFAULT_PERIOD_TRACKER = {
  enabled: false,
  latestRecord: null,
  history: {},
  expectedHistory: {}
};
