import assert from "node:assert/strict";
import test from "node:test";

import { requestCurrentPosition } from "../js/geolocation.js";

test("requestCurrentPosition normalise les coordonnées GPS", async () => {
  const geolocation = {
    getCurrentPosition(success) {
      success({
        coords: { latitude: 48.864, longitude: -1.557, accuracy: 12 }
      });
    }
  };

  const position = await requestCurrentPosition(geolocation);

  assert.deepEqual(position, {
    latitude: 48.864,
    longitude: -1.557,
    accuracy: 12
  });
});

test("requestCurrentPosition traduit un refus utilisateur", async () => {
  const geolocation = {
    getCurrentPosition(_success, failure) {
      failure({ code: 1 });
    }
  };

  await assert.rejects(
    requestCurrentPosition(geolocation),
    (error) => error.reason === "denied" && /refusée/.test(error.message)
  );
});

for (const [code, reason] of [
  [2, "unavailable"],
  [3, "timeout"]
]) {
  test(`requestCurrentPosition traduit l'erreur GPS ${code}`, async () => {
    const geolocation = {
      getCurrentPosition(_success, failure) {
        failure({ code });
      }
    };

    await assert.rejects(
      requestCurrentPosition(geolocation),
      (error) => error.reason === reason
    );
  });
}

test("requestCurrentPosition gère un navigateur non compatible", async () => {
  await assert.rejects(
    requestCurrentPosition(null),
    (error) => error.reason === "unsupported"
  );
});
