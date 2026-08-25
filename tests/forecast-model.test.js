import assert from "node:assert/strict";
import test from "node:test";

import {
  AROME_FRANCE_HD_MODEL,
  buildPreferredWindUrl,
  buildWindguruUrl,
  mergePreferredWindForecast
} from "../js/forecast.js";

test("la requête prioritaire sélectionne AROME France HD", () => {
  const url = new URL(buildPreferredWindUrl({
    latitude: 43.56,
    longitude: 4.11,
    forecastModel: AROME_FRANCE_HD_MODEL
  }));

  assert.equal(url.searchParams.get("models"), AROME_FRANCE_HD_MODEL);
  assert.deepEqual(url.searchParams.get("hourly").split(","), [
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m"
  ]);
});

test("AROME est préféré puis la prévision générale prend le relais", () => {
  const fallback = {
    current: { wind_speed_10m: 9 },
    hourly: {
      time: ["2026-08-25T12:00", "2026-08-25T13:00", "2026-08-25T14:00"],
      wind_speed_10m: [10, 11, 12],
      wind_direction_10m: [100, 110, 120],
      wind_gusts_10m: [20, 21, 22],
      precipitation: [0, 0.1, 0]
    }
  };
  const preferred = {
    hourly: {
      time: ["2026-08-25T12:00", "2026-08-25T13:00"],
      wind_speed_10m: [15, null],
      wind_direction_10m: [150, 160],
      wind_gusts_10m: [25, 26]
    }
  };

  const merged = mergePreferredWindForecast(fallback, preferred);

  assert.deepEqual(merged.hourly.wind_speed_10m, [15, 11, 12]);
  assert.deepEqual(merged.hourly.wind_direction_10m, [150, 160, 120]);
  assert.deepEqual(merged.hourly.wind_gusts_10m, [25, 26, 22]);
  assert.equal(merged.hourly.precipitation, fallback.hourly.precipitation);
  assert.equal(merged.current, fallback.current);
});

test("le lien Windguru ouvre directement la fiche du spot", () => {
  assert.equal(
    buildWindguruUrl({ windguruSpotId: 5386 }),
    "https://www.windguru.cz/5386"
  );
  assert.throws(
    () => buildWindguruUrl({ id: "sans-fiche" }),
    /fiche Windguru manquante/
  );
});
