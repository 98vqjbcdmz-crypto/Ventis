import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCivilTwilightEnd,
  formatDaylightDeparture,
  getCurrentDaylightTimes
} from "../js/daylight.js";

test("la fin du crépuscule civil suit le coucher du soleil", () => {
  const twilightEnd = calculateCivilTwilightEnd(
    "2026-09-14T19:55",
    43.5646
  );

  assert.match(twilightEnd, /^2026-09-14T20:2\d$/);
});

test("les horaires de lumière sont sélectionnés pour le jour courant", () => {
  const daylight = getCurrentDaylightTimes({
    time: ["2026-09-14", "2026-09-15"],
    sunset: ["2026-09-14T19:55", "2026-09-15T19:53"]
  }, "2026-09-14T18:00", 43.5646);

  assert.equal(daylight.sunsetTime, "2026-09-14T19:55");
  assert.match(
    formatDaylightDeparture(daylight, "2026-09-14T18:00"),
    /coucher 19:55 · parking quitté avant 20:2\d \(frontale ensuite\)/
  );
});

test("après le crépuscule civil la frontale est signalée", () => {
  assert.equal(
    formatDaylightDeparture({
      sunsetTime: "2026-09-14T19:55",
      civilTwilightEndTime: "2026-09-14T20:25"
    }, "2026-09-14T20:30"),
    "coucher 19:55 · frontale nécessaire depuis 20:25"
  );
});

test("un horaire journalier manquant reste explicite", () => {
  assert.equal(
    getCurrentDaylightTimes({ time: [], sunset: [] }, "2026-09-14T18:00", 44),
    null
  );
  assert.equal(formatDaylightDeparture(null, "2026-09-14T18:00"), "indisponible");
});
