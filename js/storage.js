export function safeStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.error(`Unable to read localStorage key "${key}":`, error);
    return null;
  }
}

export function safeStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Unable to write localStorage key "${key}":`, error);
  }
}

export function safeStorageRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error(`Unable to remove localStorage key "${key}":`, error);
  }
}
