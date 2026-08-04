import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifestUrl = new URL("../manifest.webmanifest", import.meta.url);

test("la PWA reste en portrait hors du plein écran des graphes", async () => {
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));

  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.orientation, "portrait-primary");
});
