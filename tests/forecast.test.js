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
  assert.match(
    html,
    /x: \{\s*ticks: \{ display: false \},\s*border: \{ display: false \}/
  );
  assert.match(html, /@media \(orientation: portrait\)/);
  assert.match(html, /transform: rotate\(90deg\)/);
  assert.match(html, /matchMedia\?\.\("\(orientation: portrait\)"\)\.matches/);
  assert.match(html, /afterDatasetsDraw\(chart, args, pluginOptions\)/);
  assert.doesNotMatch(html, /afterDraw\(chart, args, pluginOptions\)/);
  assert.match(html, /coef\. estimé/);
  assert.match(html, /orientation\?\.lock\?\.\("portrait-primary"\)/);
  assert.match(html, /await lockHomeOrientation\(\)/);
});
