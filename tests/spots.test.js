import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { sortSpotsByDistance } from "../js/distance.js";
import { loadSpots, validateSpots } from "../js/spots.js";

const spotsUrl = new URL("../data/spots.json", import.meta.url);

test("la base contient des spots valides et uniques", async () => {
  const spots = JSON.parse(await readFile(spotsUrl, "utf8"));

  assert.equal(validateSpots(spots), spots);
  assert.equal(new Set(spots.map((spot) => spot.id)).size, spots.length);
});

test("la base couvre les principaux spots de la Manche", async () => {
  const spots = JSON.parse(await readFile(spotsUrl, "utf8"));
  const mancheSpots = spots.filter((spot) => spot.departement === "Manche");
  const ids = new Set(mancheSpots.map((spot) => spot.id));

  assert.ok(mancheSpots.length >= 10);
  assert.ok(ids.has("breville-sur-mer"));
  assert.ok(ids.has("jullouville"));
  assert.ok(ids.has("carolles"));

  mancheSpots.forEach((spot) => {
    assert.ok(Array.isArray(spot.orientationIdeale));
    assert.ok(Array.isArray(spot.tags));
    assert.ok("niveau" in spot);
    assert.ok("maree" in spot);
    assert.ok("typePlanEau" in spot);
  });
});

test("la base permet de rechercher le spot de Leucate", async () => {
  const spots = JSON.parse(await readFile(spotsUrl, "utf8"));
  const leucate = spots.find((spot) => spot.id === "leucate-le-goulet");

  assert.equal(leucate?.nom, "Leucate – Le Goulet");
  assert.equal(leucate?.departement, "Aude");
  assert.ok(leucate?.tags.includes("Leucate"));
});

test("la base couvre les spots de wingfoil autour d'Arcachon", async () => {
  const spots = JSON.parse(await readFile(spotsUrl, "utf8"));
  const ids = new Set(spots.map((spot) => spot.id));

  [
    "arcachon-arbousiers",
    "gujan-mestras-la-hume",
    "andernos-le-betey",
    "pyla-cercle-de-voile",
    "sanguinet-caton"
  ].forEach((id) => assert.ok(ids.has(id)));

  const arcachonSpots = spots.filter((spot) => spot.tags.includes("Arcachon"));
  assert.ok(arcachonSpots.length >= 5);
  arcachonSpots.forEach((spot) => {
    assert.equal(spot.region, "Nouvelle-Aquitaine");
    assert.ok(spot.tags.includes("wingfoil"));
  });
});

test("le chargement de la base contourne le cache du navigateur", async () => {
  let fetchOptions;
  const spots = [{
    id: "test",
    nom: "Spot test",
    latitude: 48,
    longitude: -1,
    region: "Normandie",
    pays: "France"
  }];

  const loadedSpots = await loadSpots((url, options) => {
    fetchOptions = options;
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(spots)
    });
  });

  assert.equal(fetchOptions.cache, "no-store");
  assert.equal(loadedSpots, spots);
});

test("le classement autour de Granville retourne cinq spots cohérents", async () => {
  const spots = JSON.parse(await readFile(spotsUrl, "utf8"));
  const nearby = sortSpotsByDistance(
    { latitude: 48.85, longitude: -1.58 },
    spots
  ).slice(0, 5);

  assert.deepEqual(nearby.map((spot) => spot.id), [
    "granville",
    "breville-sur-mer",
    "saint-martin-de-brehal",
    "jullouville",
    "carolles"
  ]);
});
