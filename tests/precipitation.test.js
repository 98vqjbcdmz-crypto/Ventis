import assert from "node:assert/strict";
import test from "node:test";

import {
  findNextRainWindow,
  formatDailyPrecipitation,
  summarizeDailyPrecipitation,
  summarizePrecipitationWindow
} from "../js/precipitation.js";

test("la prochaine pluie démarre un cumul glissant de 24 heures", () => {
  const forecast = findNextRainWindow(
    [
      "2026-08-04T11:00",
      "2026-08-04T13:00",
      "2026-08-04T14:00",
      "2026-08-05T12:00",
      "2026-08-05T14:00"
    ],
    [90, 20, 65, 80, 100],
    [5, 0, 0.2, 1.3, 12],
    "2026-08-04T12:00"
  );

  assert.deepEqual(forecast, {
    startTime: "2026-08-04T14:00",
    probabilityMax: 80,
    amountMm: 1.5,
    hasAmount: true
  });
});

test("aucune prochaine pluie n'est annoncée sous le seuil de 0,1 mm", () => {
  assert.equal(
    findNextRainWindow(
      ["2026-08-04T13:00", "2026-08-04T14:00"],
      [60, 80],
      [0, 0.09],
      "2026-08-04T12:00"
    ),
    null
  );
});

test("les précipitations sont cumulées par jour avec la probabilité maximale", () => {
  const summaries = summarizeDailyPrecipitation(
    [
      "2026-08-04T22:00",
      "2026-08-04T23:00",
      "2026-08-05T00:00",
      "2026-08-05T01:00"
    ],
    [20, 70, 35, 50],
    [0, 1.2, 0.3, 0.4]
  );

  assert.deepEqual({ ...summaries["2026-08-04"] }, {
    probabilityMax: 70,
    amountMm: 1.2,
    hasAmount: true
  });
  assert.equal(summaries["2026-08-05"].probabilityMax, 50);
  assert.ok(Math.abs(summaries["2026-08-05"].amountMm - 0.7) < 1e-9);
});

test("le résumé pluie est formaté pour l'en-tête du jour", () => {
  assert.equal(
    formatDailyPrecipitation({
      probabilityMax: 73.6,
      amountMm: 3.24,
      hasAmount: true
    }),
    "74% · 3,2 mm"
  );
  assert.equal(formatDailyPrecipitation(null), "");
});

test("les données météo manquantes restent explicites", () => {
  const summaries = summarizeDailyPrecipitation(
    ["2026-08-04T12:00"],
    [null],
    [null]
  );

  assert.equal(
    formatDailyPrecipitation(summaries["2026-08-04"]),
    "–% · – mm"
  );
});

test("le résumé 24 h ignore le passé et les heures plus lointaines", () => {
  const summary = summarizePrecipitationWindow(
    [
      "2026-08-04T11:00",
      "2026-08-04T13:00",
      "2026-08-05T12:00",
      "2026-08-05T13:00"
    ],
    [95, 30, 80, 100],
    [9, 0.2, 1.3, 12],
    "2026-08-04T12:00",
    24
  );

  assert.deepEqual(summary, {
    probabilityMax: 80,
    amountMm: 1.5,
    hasAmount: true
  });
  assert.equal(formatDailyPrecipitation(summary), "80% · 1,5 mm");
});
