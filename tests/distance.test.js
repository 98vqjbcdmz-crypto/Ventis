import assert from "node:assert/strict";
import test from "node:test";

import {
  formatDistance,
  haversineDistance,
  sortSpotsByDistance
} from "../js/distance.js";

test("haversineDistance retourne zéro pour une même position", () => {
  const position = { latitude: 48.838, longitude: -1.6 };
  assert.equal(haversineDistance(position, position), 0);
});

test("haversineDistance calcule une distance connue", () => {
  const distance = haversineDistance(
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 1 }
  );

  assert.ok(Math.abs(distance - 111.195) < 0.01);
});

test("sortSpotsByDistance classe les spots sans modifier la source", () => {
  const spots = [
    { id: "far", latitude: 49, longitude: -1.6 },
    { id: "near", latitude: 48.84, longitude: -1.6 }
  ];

  const sorted = sortSpotsByDistance(
    { latitude: 48.838, longitude: -1.6 },
    spots
  );

  assert.deepEqual(sorted.map((spot) => spot.id), ["near", "far"]);
  assert.equal("distanceKm" in spots[0], false);
});

test("formatDistance utilise les mètres sous un kilomètre", () => {
  assert.equal(formatDistance(0.42), "420 m");
  assert.equal(formatDistance(8.6), "9 km");
});
