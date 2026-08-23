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

export const dismissTooltipOnClickPlugin = {
  id: "dismissTooltipOnClick",
  beforeEvent(chart, args) {
    const { event } = args;
    if (event.type !== "click") return;

    const tooltip = chart.tooltip;
    const wasVisible = Boolean(
      tooltip &&
      tooltip.opacity > 0 &&
      tooltip.getActiveElements().length
    );

    tooltipBeforeClick.set(chart, wasVisible ? {
      x: tooltip.x,
      y: tooltip.y,
      width: tooltip.width,
      height: tooltip.height
    } : null);
  },
  afterEvent(chart, args) {
    const { event } = args;
    const tooltip = chart.tooltip;
    const previousTooltip = tooltipBeforeClick.get(chart);
    tooltipBeforeClick.delete(chart);

    if (
      event.type !== "click" ||
      !tooltip ||
      !previousTooltip ||
      !isPointInsideBox(event, previousTooltip, 6)
    ) {
      return;
    }

    chart.setActiveElements([]);
    tooltip.setActiveElements([], { x: event.x, y: event.y });
    args.changed = true;
  }
};
