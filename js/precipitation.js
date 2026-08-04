export function summarizeDailyPrecipitation(times, probabilities, amounts) {
  const summaries = Object.create(null);

  times.forEach((time, index) => {
    const dateKey = typeof time === "string" ? time.slice(0, 10) : "";
    if (!dateKey) return;

    const summary = summaries[dateKey] ?? {
      probabilityMax: null,
      amountMm: 0,
      hasAmount: false
    };
    const probability = probabilities?.[index];
    const amount = amounts?.[index];

    if (Number.isFinite(probability)) {
      summary.probabilityMax = summary.probabilityMax == null
        ? probability
        : Math.max(summary.probabilityMax, probability);
    }
    if (Number.isFinite(amount) && amount >= 0) {
      summary.amountMm += amount;
      summary.hasAmount = true;
    }

    summaries[dateKey] = summary;
  });

  return summaries;
}

export function summarizePrecipitationWindow(
  times,
  probabilities,
  amounts,
  startTime,
  hours = 24
) {
  const start = new Date(startTime).getTime();
  const end = start + hours * 3_600_000;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  const matchingIndexes = times
    .map((time, index) => ({ index, time: new Date(time).getTime() }))
    .filter(({ time }) => time > start && time <= end)
    .map(({ index }) => index);

  if (!matchingIndexes.length) return null;

  const summary = {
    probabilityMax: null,
    amountMm: 0,
    hasAmount: false
  };

  matchingIndexes.forEach((index) => {
    const probability = probabilities?.[index];
    const amount = amounts?.[index];

    if (Number.isFinite(probability)) {
      summary.probabilityMax = summary.probabilityMax == null
        ? probability
        : Math.max(summary.probabilityMax, probability);
    }
    if (Number.isFinite(amount) && amount >= 0) {
      summary.amountMm += amount;
      summary.hasAmount = true;
    }
  });

  return summary;
}

export function formatDailyPrecipitation(summary) {
  if (!summary) return "";

  const probability = Number.isFinite(summary.probabilityMax)
    ? `${Math.round(summary.probabilityMax)}%`
    : "–%";
  const amount = summary.hasAmount && Number.isFinite(summary.amountMm)
    ? `${summary.amountMm.toFixed(1).replace(".", ",")} mm`
    : "– mm";

  return `${probability} · ${amount}`;
}
