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
