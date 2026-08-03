const LAST_SPOT_KEY = "ventis:lastSpotId";
const GEOLOCATION_ENABLED_KEY = "ventis:geolocationEnabled";

function getDefaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function read(storage, key) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(storage, key, value) {
  try {
    storage?.setItem(key, value);
  } catch {
    // A blocked storage must never prevent forecast loading.
  }
}

export function getLastSpotId(storage = getDefaultStorage()) {
  return read(storage, LAST_SPOT_KEY);
}

export function setLastSpotId(spotId, storage = getDefaultStorage()) {
  write(storage, LAST_SPOT_KEY, spotId);
}

export function isGeolocationEnabled(storage = getDefaultStorage()) {
  return read(storage, GEOLOCATION_ENABLED_KEY) === "true";
}

export function setGeolocationEnabled(enabled, storage = getDefaultStorage()) {
  write(storage, GEOLOCATION_ENABLED_KEY, String(Boolean(enabled)));
}
