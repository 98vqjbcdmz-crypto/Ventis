export function isPointInsideBox(point, box, padding = 0) {
  if (![point?.x, point?.y, box?.x, box?.y, box?.width, box?.height]
    .every(Number.isFinite)) {
    return false;
  }

  return (
    point.x >= box.x - padding &&
    point.x <= box.x + box.width + padding &&
    point.y >= box.y - padding &&
    point.y <= box.y + box.height + padding
  );
}

const tooltipBeforeClick = new WeakMap();
const tooltipVisibility = new WeakMap();
const TOOLTIP_CLICK_GUARD_MS = 500;

function getEventTime(event) {
  return Number.isFinite(event?.native?.timeStamp)
    ? event.native.timeStamp
    : Date.now();
}

function getVisibleTooltip(tooltip) {
  const activeElements = tooltip?.getActiveElements?.() ?? [];
  if (!tooltip || tooltip.opacity <= 0 || !activeElements.length) return null;

  return {
    x: tooltip.x,
    y: tooltip.y,
    width: tooltip.width,
    height: tooltip.height,
    signature: activeElements
      .map(({ datasetIndex, index }) => `${datasetIndex}:${index}`)
      .join("|")
  };
}

function rememberTooltip(chart, event) {
  const tooltip = getVisibleTooltip(chart.tooltip);
  if (!tooltip) {
    tooltipVisibility.delete(chart);
    return;
  }

  const previous = tooltipVisibility.get(chart);
  tooltipVisibility.set(chart, {
    signature: tooltip.signature,
    openedAt: previous?.signature === tooltip.signature
      ? previous.openedAt
      : getEventTime(event)
  });
}

export const dismissTooltipOnClickPlugin = {
  id: "dismissTooltipOnClick",
  beforeEvent(chart, args) {
    const { event } = args;
    if (event.type !== "click") return;

    const tooltip = getVisibleTooltip(chart.tooltip);
    const visibility = tooltipVisibility.get(chart);

    tooltipBeforeClick.set(chart, tooltip ? {
      ...tooltip,
      openedAt: visibility?.signature === tooltip.signature
        ? visibility.openedAt
        : Number.NEGATIVE_INFINITY
    } : null);
  },
  afterEvent(chart, args) {
    const { event } = args;
    const tooltip = chart.tooltip;
    const previousTooltip = tooltipBeforeClick.get(chart);
    tooltipBeforeClick.delete(chart);

    if (event.type !== "click") {
      rememberTooltip(chart, event);
      return;
    }

    if (
      !tooltip ||
      !previousTooltip ||
      !isPointInsideBox(event, previousTooltip, 6) ||
      getEventTime(event) - previousTooltip.openedAt < TOOLTIP_CLICK_GUARD_MS
    ) {
      rememberTooltip(chart, event);
      return;
    }

    chart.setActiveElements([]);
    tooltip.setActiveElements([], { x: event.x, y: event.y });
    tooltipVisibility.delete(chart);
    args.changed = true;
  }
};
