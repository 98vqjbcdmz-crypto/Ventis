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

export const dismissTooltipOnClickPlugin = {
  id: "dismissTooltipOnClick",
  afterEvent(chart, args) {
    const { event } = args;
    const tooltip = chart.tooltip;

    if (
      event.type !== "click" ||
      !tooltip ||
      tooltip.opacity === 0 ||
      !tooltip.getActiveElements().length ||
      !isPointInsideBox(event, tooltip, 6)
    ) {
      return;
    }

    chart.setActiveElements([]);
    tooltip.setActiveElements([], { x: event.x, y: event.y });
    args.changed = true;
  }
};
