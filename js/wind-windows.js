export const GREEN_WIND_MIN_KT = 12;
export const GREEN_WIND_MAX_KT = 20;
export const GREEN_WINDOW_MIN_HOURS = 1;

export function computeGreenIntervals(
  timesISO,
  valuesKt,
  minKt = GREEN_WIND_MIN_KT,
  maxKt = GREEN_WIND_MAX_KT,
  minHours = GREEN_WINDOW_MIN_HOURS
) {
  const pointCount = Math.min(timesISO?.length ?? 0, valuesKt?.length ?? 0);
  const intervals = [];
  if (!pointCount) return intervals;

  const timesMs = timesISO
    .slice(0, pointCount)
    .map((time) => new Date(time).getTime());
  const minimumDurationMs = minHours * 3_600_000;

  let index = 0;
  while (index < pointCount) {
    if (valuesKt[index] >= minKt && valuesKt[index] < maxKt) {
      let endIndex = index;
      while (
        endIndex + 1 < pointCount &&
        valuesKt[endIndex + 1] >= minKt &&
        valuesKt[endIndex + 1] < maxKt
      ) {
        endIndex += 1;
      }

      if (timesMs[endIndex] - timesMs[index] >= minimumDurationMs) {
        intervals.push({ startIndex: index, endIndex });
      }
      index = endIndex + 1;
    } else {
      index += 1;
    }
  }

  return intervals;
}

export function findNextGreenWindow(
  timesISO,
  valuesKt,
  currentTime,
  minKt = GREEN_WIND_MIN_KT,
  maxKt = GREEN_WIND_MAX_KT,
  minHours = GREEN_WINDOW_MIN_HOURS
) {
  const currentMs = new Date(currentTime).getTime();
  if (!Number.isFinite(currentMs)) return null;

  const intervals = computeGreenIntervals(
    timesISO,
    valuesKt,
    minKt,
    maxKt,
    minHours
  );

  for (const interval of intervals) {
    const startTime = timesISO[interval.startIndex];
    const endTime = timesISO[interval.endIndex];
    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();
    if (endMs < currentMs) continue;

    return {
      ...interval,
      startTime,
      endTime,
      isOngoing: startMs <= currentMs,
      delayMs: Math.max(0, startMs - currentMs)
    };
  }

  return null;
}

export function formatGreenWindowDelay(window) {
  if (!window) return "aucun dans les prévisions";
  if (window.isOngoing) return "en cours";

  const totalMinutes = Math.max(1, Math.round(window.delayMs / 60_000));
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];

  if (days) parts.push(`${days} j`);
  if (hours) parts.push(`${hours} h`);
  if (minutes && !days) parts.push(`${minutes} min`);

  return `dans ${parts.join(" ")}`;
}
