import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  findNearestTideCoefficient,
  getTideSeries,
  loadTideCache,
  validateTideCache
} from "../js/tides.js";
import {
  mapSpotsToTideSites,
  normalizeTideCycles,
  normalizeWaterLevels
} from "../scripts/fetch-tides.mjs";

const validCache = {
  generatedAt: "2026-08-04T08:00:00.000Z",
  attribution: "Source test",
  spots: {
    granville: { siteId: "granville", distanceKm: 1.2 }
  },
  sites: {
    granville: {
      siteName: "Granville",
      data: [
        { time: "2026-08-04T10:00:00+02:00", height: 2.8 },
        { time: "2026-08-04T11:00:00+02:00", height: 3.1 }
      ],
      cycles: [
        { time: "2026-08-04T06:00", height: 9.2, coefficient: 72 },
        { time: "2026-08-04T18:00", height: 10.1, coefficient: 84 }
      ]
    }
  }
};

test("le cache fourni avec l'application est valide", async () => {
  const content = await readFile(
    new URL("../data/tides.json", import.meta.url),
    "utf8"
  );
  assert.equal(validateTideCache(JSON.parse(content)).source, "api-maree.fr");
});

test("les hauteurs sont alignées sur les heures locales des prévisions", () => {
  const series = getTideSeries(validCache, "granville", [
    "2026-08-04T10:00",
    "2026-08-04T11:00",
    "2026-08-04T12:00"
  ]);

  assert.deepEqual(series.heights, [2.8, 3.1, null]);
  assert.deepEqual(series.coefficients, [72, 72, 72]);
  assert.equal(series.siteName, "Granville");
  assert.equal(series.distanceKm, 1.2);
});

test("le coefficient correspond à la pleine mer la plus proche", () => {
  const cycles = validCache.sites.granville.cycles;

  assert.equal(findNearestTideCoefficient(cycles, "2026-08-04T10:00"), 72);
  assert.equal(findNearestTideCoefficient(cycles, "2026-08-04T16:00"), 84);
  assert.equal(findNearestTideCoefficient(cycles, "date invalide"), null);
});

test("les pleines mers de l'API sont normalisées en cycles", () => {
  const cycles = normalizeTideCycles({
    site_id: "granville",
    unit: "m",
    data: [{
      date: "2026-08-04",
      extrema: [
        { type: "PM", time: "06:12", height: 9.2, coef: 72 },
        { type: "BM", time: "12:25", height: 1.8 },
        { type: "PM", time: "18:40", height: 10.1, coef: 84 }
      ]
    }]
  }, "granville");

  assert.deepEqual(cycles, [
    {
      time: "2026-08-04T06:12",
      height: 9.2,
      coefficient: 72
    },
    {
      time: "2026-08-04T18:40",
      height: 10.1,
      coefficient: 84
    }
  ]);
});

test("un spot sans port de référence n'affiche pas de marée", () => {
  assert.equal(
    getTideSeries(validCache, "leucate-le-goulet", ["2026-08-04T10:00"]),
    null
  );
});

test("les hauteurs négatives sont rejetées", () => {
  const invalidCache = structuredClone(validCache);
  invalidCache.sites.granville.data[0].height = -0.1;

  assert.throws(
    () => validateTideCache(invalidCache),
    /Hauteur de marée invalide/
  );
  assert.throws(
    () => normalizeWaterLevels({
      site_id: "granville",
      unit: "m",
      data: [{ time: "2026-08-04T10:00:00+02:00", height: -0.1 }]
    }, "granville"),
    /Hauteur de marée invalide/
  );
});

test("le chargement du cache contourne le cache navigateur", async () => {
  let requestedUrl;
  let requestedOptions;
  const loaded = await loadTideCache((url, options) => {
    requestedUrl = url;
    requestedOptions = options;
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(validCache)
    });
  }, "https://example.test/tides.json");

  assert.match(requestedUrl, /tides\.json\?v=\d+$/);
  assert.equal(requestedOptions.cache, "no-store");
  assert.equal(loaded, validCache);
});

test("le générateur ignore les spots trop éloignés d'un port couvert", () => {
  const mappings = mapSpotsToTideSites([
    { id: "manche", latitude: 48.84, longitude: -1.6 },
    { id: "mediterranee", latitude: 42.91, longitude: 3.02 }
  ], [{
    siteId: "granville",
    siteName: "Granville",
    latitude: 48.84,
    longitude: -1.6
  }], 100);

  assert.equal(mappings.manche.siteId, "granville");
  assert.equal(mappings.mediterranee, undefined);
});
