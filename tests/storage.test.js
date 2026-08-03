import assert from "node:assert/strict";
import test from "node:test";

import {
  getLastSpotId,
  isGeolocationEnabled,
  setGeolocationEnabled,
  setLastSpotId
} from "../js/storage.js";

class MemoryStorage {
  #values = new Map();

  getItem(key) {
    return this.#values.get(key) ?? null;
  }

  setItem(key, value) {
    this.#values.set(key, value);
  }
}

test("les préférences de spot et de géolocalisation sont persistées", () => {
  const storage = new MemoryStorage();

  setLastSpotId("jullouville", storage);
  setGeolocationEnabled(true, storage);

  assert.equal(getLastSpotId(storage), "jullouville");
  assert.equal(isGeolocationEnabled(storage), true);

  setGeolocationEnabled(false, storage);
  assert.equal(isGeolocationEnabled(storage), false);
});

test("un stockage bloqué ne fait pas échouer l'application", () => {
  const blockedStorage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    }
  };

  assert.doesNotThrow(() => setLastSpotId("ponant", blockedStorage));
  assert.equal(getLastSpotId(blockedStorage), null);
  assert.equal(isGeolocationEnabled(blockedStorage), false);
});
