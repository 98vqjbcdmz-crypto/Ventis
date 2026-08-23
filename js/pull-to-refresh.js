export const DEFAULT_PULL_THRESHOLD = 72;

export function getPullState(distance, threshold = DEFAULT_PULL_THRESHOLD) {
  if (distance <= 0) return "idle";
  return distance >= threshold ? "ready" : "pulling";
}

export function triggerRefreshHaptic(vibrate) {
  if (typeof vibrate !== "function") return false;

  try {
    return vibrate(18) !== false;
  } catch {
    return false;
  }
}

export function setupPullToRefresh({
  indicator,
  onRefresh,
  canStart = () => true,
  eventTarget = globalThis.document,
  scrollTarget = globalThis,
  threshold = DEFAULT_PULL_THRESHOLD,
  vibrate = globalThis.navigator?.vibrate?.bind(globalThis.navigator),
  completionDelayMs = 450
}) {
  if (!indicator || typeof onRefresh !== "function") {
    throw new TypeError("Configuration du rafraîchissement invalide.");
  }

  let startY = null;
  let pullDistance = 0;
  let refreshing = false;
  const label = indicator.querySelector?.("[data-pull-label]");

  const setIndicator = (state, distance = 0) => {
    const labels = {
      idle: "Tirer vers le bas pour actualiser",
      pulling: "Tirer pour actualiser",
      ready: "Relâcher pour actualiser",
      refreshing: "Actualisation…",
      complete: "Données actualisées"
    };

    indicator.dataset.state = state;
    if (label) {
      label.textContent = labels[state];
    } else {
      indicator.textContent = labels[state];
    }
    indicator.style.setProperty(
      "--pull-offset",
      `${Math.min(68, Math.round(distance * 0.58))}px`
    );
  };

  const resetPull = () => {
    startY = null;
    pullDistance = 0;
    setIndicator("idle");
  };

  const handleTouchStart = (event) => {
    if (
      refreshing ||
      scrollTarget.scrollY > 0 ||
      event.touches.length !== 1 ||
      !canStart(event)
    ) return;

    startY = event.touches[0].clientY;
  };

  const handleTouchMove = (event) => {
    if (startY == null || event.touches.length !== 1) return;
    if (scrollTarget.scrollY > 0) {
      resetPull();
      return;
    }

    pullDistance = Math.max(0, event.touches[0].clientY - startY);
    const state = getPullState(pullDistance, threshold);
    if (state === "idle") {
      setIndicator("idle");
      return;
    }

    event.preventDefault();
    setIndicator(state, pullDistance);
  };

  const handleTouchEnd = async () => {
    if (startY == null || refreshing) return;

    const shouldRefresh = getPullState(pullDistance, threshold) === "ready";
    startY = null;
    if (!shouldRefresh) {
      resetPull();
      return;
    }

    refreshing = true;
    setIndicator("refreshing", threshold);
    triggerRefreshHaptic(vibrate);
    try {
      await onRefresh();
      setIndicator("complete", threshold);
      if (completionDelayMs > 0) {
        await new Promise((resolve) =>
          globalThis.setTimeout(resolve, completionDelayMs)
        );
      }
    } finally {
      refreshing = false;
      resetPull();
    }
  };

  const handleTouchCancel = () => {
    if (!refreshing) resetPull();
  };

  setIndicator("idle");
  eventTarget.addEventListener("touchstart", handleTouchStart, { passive: true });
  eventTarget.addEventListener("touchmove", handleTouchMove, { passive: false });
  eventTarget.addEventListener("touchend", handleTouchEnd, { passive: true });
  eventTarget.addEventListener("touchcancel", handleTouchCancel, { passive: true });

  return () => {
    eventTarget.removeEventListener("touchstart", handleTouchStart);
    eventTarget.removeEventListener("touchmove", handleTouchMove);
    eventTarget.removeEventListener("touchend", handleTouchEnd);
    eventTarget.removeEventListener("touchcancel", handleTouchCancel);
  };
}
