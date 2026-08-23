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

  dismissTooltipOnClickPlugin.beforeEvent(chart, args);
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

  const args = {
    event: { type: "click", x: 180, y: 120 },
    changed: false
  };

  dismissTooltipOnClickPlugin.beforeEvent(chart, args);
  dismissTooltipOnClickPlugin.afterEvent(chart, args);

  assert.equal(wasCleared, false);
});

test("le clic qui ouvre une infobulle ne la referme pas aussitôt", () => {
  let wasCleared = false;
  const tooltip = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    opacity: 0,
    getActiveElements: () => [],
    setActiveElements() {
      wasCleared = true;
    }
  };
  const chart = {
    setActiveElements() {
      wasCleared = true;
    },
    tooltip
  };
  const args = {
    event: { type: "click", x: 40, y: 40 },
    changed: false
  };

  dismissTooltipOnClickPlugin.beforeEvent(chart, args);

  // Chart.js ouvre ensuite l'infobulle sur le point cliqué.
  tooltip.x = 20;
  tooltip.y = 20;
  tooltip.width = 120;
  tooltip.height = 80;
  tooltip.opacity = 1;
  tooltip.getActiveElements = () => [{ datasetIndex: 0, index: 1 }];

  dismissTooltipOnClickPlugin.afterEvent(chart, args);

  assert.equal(wasCleared, false);
  assert.equal(args.changed, false);
});

test("le clic suivant immédiatement l'ouverture au pointeur est ignoré", () => {
  let wasCleared = false;
  const chart = {
    setActiveElements() {
      wasCleared = true;
    },
    tooltip: {
      x: 20,
      y: 20,
      width: 120,
      height: 80,
      opacity: 1,
      getActiveElements: () => [{ datasetIndex: 0, index: 2 }],
      setActiveElements() {
        wasCleared = true;
      }
    }
  };

  dismissTooltipOnClickPlugin.afterEvent(chart, {
    event: { type: "mousemove", native: { timeStamp: 100 } },
    changed: false
  });

  const firstClick = {
    event: {
      type: "click",
      x: 40,
      y: 40,
      native: { timeStamp: 120 }
    },
    changed: false
  };
  dismissTooltipOnClickPlugin.beforeEvent(chart, firstClick);
  dismissTooltipOnClickPlugin.afterEvent(chart, firstClick);

  assert.equal(wasCleared, false);
  assert.equal(firstClick.changed, false);

  const laterClick = {
    event: {
      type: "click",
      x: 40,
      y: 40,
      native: { timeStamp: 700 }
    },
    changed: false
  };
  dismissTooltipOnClickPlugin.beforeEvent(chart, laterClick);
  dismissTooltipOnClickPlugin.afterEvent(chart, laterClick);

  assert.equal(wasCleared, true);
  assert.equal(laterClick.changed, true);
});

test("une infobulle déjà ouverte hors de la zone tracée reste fermable", () => {
  let wasCleared = false;
  const chart = {
    setActiveElements(elements) {
      if (!elements.length) wasCleared = true;
    },
    tooltip: {
      x: 15,
      y: 5,
      width: 130,
      height: 75,
      opacity: 1,
      getActiveElements: () => [{ datasetIndex: 0, index: 0 }],
      setActiveElements() {}
    }
  };
  const args = {
    event: { type: "click", x: 30, y: 15 },
    changed: false
  };

  dismissTooltipOnClickPlugin.beforeEvent(chart, args);
  dismissTooltipOnClickPlugin.afterEvent(chart, args);

  assert.equal(wasCleared, true);
  assert.equal(args.changed, true);
});
