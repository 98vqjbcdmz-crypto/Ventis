import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const indexUrl = new URL("../index.html", import.meta.url);

test("les prévisions n'utilisent pas le niveau marin MSL comme hauteur de marée", async () => {
  const html = await readFile(indexUrl, "utf8");

  assert.doesNotMatch(html, /sea_level_height_msl/);
  assert.doesNotMatch(html, /tideCaution|yTide/);
});
