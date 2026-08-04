import assert from "node:assert/strict";
import test from "node:test";

import {
  dismissTooltipOnClickPlugin,
  isPointInsideBox
} from "../js/chart-interactions.js";

test("isPointInsideBox détecte un clic dans une infobulle", () => {
  const box = { x: 20, y: 30, width: 100, height: 60 };

  assert.equal(isPointInsideBox({ x: 50, y: 50 }, box), true);
  assert.equal(isPointInsideBox({ x: 150, y: 50 }, box), false);
  assert.equal(isPointInsideBox({ x: 125, y: 50 }, box, 6), true);
});

test("un clic sur l'infobulle la ferme", () => {
  let chartActiveElements = null;
  let tooltipActiveElements = null;
  const chart = {
    setActiveElements(elements) {
      chartActiveElements = elements;
    },
    tooltip: {
      x: 20,
      y: 30,
      width: 100,
      height: 60,
      opacity: 1,
      getActiveElements: () => [{ datasetIndex: 0, index: 1 }],
      setActiveElements(elements) {
        tooltipActiveElements = elements;
      }
    }
  };
  const args = {
    event: { type: "click", x: 50, y: 50 },
    changed: false
  };

  dismissTooltipOnClickPlugin.afterEvent(chart, args);

  assert.deepEqual(chartActiveElements, []);
  assert.deepEqual(tooltipActiveElements, []);
  assert.equal(args.changed, true);
});

test("un clic hors de l'infobulle conserve son contenu", () => {
  let wasCleared = false;
  const chart = {
    setActiveElements() {
      wasCleared = true;
    },
    tooltip: {
      x: 20,
      y: 30,
      width: 100,
      height: 60,
      opacity: 1,
      getActiveElements: () => [{ datasetIndex: 0, index: 1 }],
      setActiveElements() {
        wasCleared = true;
      }
    }
  };

  dismissTooltipOnClickPlugin.afterEvent(chart, {
    event: { type: "click", x: 180, y: 120 },
    changed: false
  });

  assert.equal(wasCleared, false);
});
