import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const indexUrl = new URL("../index.html", import.meta.url);

test("les prévisions n'utilisent pas le niveau marin MSL comme hauteur de marée", async () => {
  const html = await readFile(indexUrl, "utf8");

  assert.doesNotMatch(html, /sea_level_height_msl/);
  assert.match(html, /id="tideOverlayButton"/);
  assert.match(html, /hidden: true,[\s\S]*yAxisID: "yTide"/);
  assert.match(html, /threshold: 3/);
  assert.doesNotMatch(html, /id="tideAttribution"|class="tide-attribution"/);
  assert.match(html, /borderColor: "rgb\(54, 162, 235\)"/);
  assert.match(html, /borderColor: "rgb\(255, 99, 132\)"/);
  assert.match(html, /borderColor: "rgb\(255, 159, 64\)"/);
  assert.match(html, /borderColor: "rgb\(255, 205, 86\)"/);
});
