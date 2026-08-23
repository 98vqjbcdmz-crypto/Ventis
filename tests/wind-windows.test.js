import assert from "node:assert/strict";
import test from "node:test";

import {
  computeGreenIntervals,
  findNextGreenWindow,
  formatGreenWindowDelay
} from "../js/wind-windows.js";

const times = [
  "2026-08-23T10:00",
  "2026-08-23T11:00",
  "2026-08-23T12:00",
  "2026-08-23T13:00",
  "2026-08-23T14:00",
  "2026-08-23T15:00"
];

test("les créneaux verts durent au moins une heure entre 12 et 20 kt", () => {
  assert.deepEqual(
    computeGreenIntervals(times, [8, 13, 15, 19.9, 20, 14]),
    [{ startIndex: 1, endIndex: 3 }]
  );
});

test("le prochain créneau vert fournit un compte à rebours", () => {
  const window = findNextGreenWindow(
    times,
    [8, 9, 13, 15, 9, 8],
    "2026-08-23T11:30"
  );

  assert.equal(window.startTime, "2026-08-23T12:00");
  assert.equal(window.isOngoing, false);
  assert.equal(formatGreenWindowDelay(window), "dans 30 min");
});

test("un créneau déjà commencé est indiqué comme en cours", () => {
  const window = findNextGreenWindow(
    times,
    [8, 13, 15, 19, 9, 8],
    "2026-08-23T12:30"
  );

  assert.equal(window.isOngoing, true);
  assert.equal(formatGreenWindowDelay(window), "en cours");
  assert.equal(formatGreenWindowDelay(null), "aucun dans les prévisions");
});
