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
    confirmedByClick: event.type === "click" || (
      previous?.signature === tooltip.signature &&
      previous.confirmedByClick
    )
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
      confirmedByClick: visibility?.signature === tooltip.signature
        ? visibility.confirmedByClick
        : true
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
      !previousTooltip.confirmedByClick
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
