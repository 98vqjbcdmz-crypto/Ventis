import assert from "node:assert/strict";
import test from "node:test";

import {
  getPullState,
  setupPullToRefresh,
  triggerRefreshHaptic
} from "../js/pull-to-refresh.js";

class FakeEventTarget {
  listeners = new Map();

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  removeEventListener(type) {
    this.listeners.delete(type);
  }

  async dispatch(type, event = {}) {
    return this.listeners.get(type)?.(event);
  }
}

function createIndicator() {
  const properties = new Map();
  return {
    dataset: {},
    style: {
      setProperty(name, value) {
        properties.set(name, value);
      }
    },
    properties,
    textContent: ""
  };
}

test("le geste devient prêt après le seuil", () => {
  assert.equal(getPullState(0), "idle");
  assert.equal(getPullState(40), "pulling");
  assert.equal(getPullState(72), "ready");
});

test("le retour haptique est déclenché seulement s'il est disponible", () => {
  let duration = null;

  assert.equal(triggerRefreshHaptic(), false);
  assert.equal(triggerRefreshHaptic((value) => {
    duration = value;
    return true;
  }), true);
  assert.equal(duration, 18);
});

test("tirer depuis le haut puis relâcher actualise les données", async () => {
  const eventTarget = new FakeEventTarget();
  const indicator = createIndicator();
  let refreshCount = 0;
  let vibrationCount = 0;
  let prevented = false;

  const cleanup = setupPullToRefresh({
    indicator,
    eventTarget,
    scrollTarget: { scrollY: 0 },
    threshold: 50,
    completionDelayMs: 0,
    vibrate: () => {
      vibrationCount += 1;
      return true;
    },
    onRefresh: async () => {
      refreshCount += 1;
    }
  });

  await eventTarget.dispatch("touchstart", {
    touches: [{ clientY: 100 }]
  });
  await eventTarget.dispatch("touchmove", {
    touches: [{ clientY: 160 }],
    preventDefault() {
      prevented = true;
    }
  });

  assert.equal(indicator.dataset.state, "ready");
  assert.equal(prevented, true);

  await eventTarget.dispatch("touchend");
  assert.equal(refreshCount, 1);
  assert.equal(vibrationCount, 1);
  assert.equal(indicator.dataset.state, "idle");

  cleanup();
  assert.equal(eventTarget.listeners.size, 0);
});

test("le geste ne démarre pas lorsque la page est déjà descendue", async () => {
  const eventTarget = new FakeEventTarget();
  const indicator = createIndicator();
  let refreshCount = 0;

  setupPullToRefresh({
    indicator,
    eventTarget,
    scrollTarget: { scrollY: 20 },
    onRefresh: async () => {
      refreshCount += 1;
    }
  });

  await eventTarget.dispatch("touchstart", {
    touches: [{ clientY: 100 }]
  });
  await eventTarget.dispatch("touchmove", {
    touches: [{ clientY: 190 }],
    preventDefault() {}
  });
  await eventTarget.dispatch("touchend");

  assert.equal(refreshCount, 0);
  assert.equal(indicator.dataset.state, "idle");
});
