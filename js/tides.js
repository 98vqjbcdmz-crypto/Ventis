export const TIDE_CACHE_URL =
  "https://raw.githubusercontent.com/98vqjbcdmz-crypto/Ventis/main/data/tides.json";

export const TIDE_ATTRIBUTION =
  "Données de marée fournies par api-maree.fr, calculées à partir de composantes harmoniques Ifremer / PREVIMER, sous licence Creative Commons Attribution 4.0 International.";

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateTideCache(cache) {
  if (!isRecord(cache) || !isRecord(cache.spots) || !isRecord(cache.sites)) {
    throw new TypeError("Cache de marée invalide.");
  }

  Object.entries(cache.sites).forEach(([siteId, site]) => {
    if (!isRecord(site) || !Array.isArray(site.data)) {
      throw new TypeError(`Données de marée invalides pour ${siteId}.`);
    }

    site.data.forEach((point) => {
      if (
        !isRecord(point) ||
        typeof point.time !== "string" ||
        !Number.isFinite(point.height) ||
        point.height < 0
      ) {
        throw new TypeError(`Hauteur de marée invalide pour ${siteId}.`);
      }
    });

    if (site.cycles !== undefined && !Array.isArray(site.cycles)) {
      throw new TypeError(`Cycles de marée invalides pour ${siteId}.`);
    }

    (site.cycles ?? []).forEach((cycle) => {
      if (
        !isRecord(cycle) ||
        typeof cycle.time !== "string" ||
        !Number.isFinite(cycle.height) ||
        cycle.height < 0 ||
        !Number.isFinite(cycle.coefficient) ||
        cycle.coefficient < 0
      ) {
        throw new TypeError(`Cycle de marée invalide pour ${siteId}.`);
      }
    });

    if (site.extrema !== undefined && !Array.isArray(site.extrema)) {
      throw new TypeError(`Extrêmes de marée invalides pour ${siteId}.`);
    }

    (site.extrema ?? []).forEach((extremum) => {
      if (
        !isRecord(extremum) ||
        !["PM", "BM"].includes(extremum.type) ||
        typeof extremum.time !== "string" ||
        !Number.isFinite(extremum.height) ||
        extremum.height < 0 ||
        (extremum.type === "PM" &&
          (!Number.isFinite(extremum.coefficient) || extremum.coefficient < 0))
      ) {
        throw new TypeError(`Extrême de marée invalide pour ${siteId}.`);
      }
    });
  });

  Object.entries(cache.spots).forEach(([spotId, mapping]) => {
    if (!isRecord(mapping) || !cache.sites[mapping.siteId]) {
      throw new TypeError(`Port de référence invalide pour ${spotId}.`);
    }
  });

  return cache;
}

export async function loadTideCache(
  fetchImpl = globalThis.fetch,
  url = TIDE_CACHE_URL
) {
  const separator = url.includes("?") ? "&" : "?";
  const hourlyVersion = Math.floor(Date.now() / 3_600_000);
  const response = await fetchImpl(`${url}${separator}v=${hourlyVersion}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Cache de marée indisponible (${response.status}).`);
  }

  return validateTideCache(await response.json());
}

function localDateTimeValue(value) {
  const match = String(value).slice(0, 16).match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
  );
  if (!match) return Number.NaN;

  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5])
  );
}

export function findNearestTideCoefficient(cycles, time) {
  const target = localDateTimeValue(time);
  if (!Number.isFinite(target) || !Array.isArray(cycles)) return null;

  let nearestCoefficient = null;
  let nearestDifference = Number.POSITIVE_INFINITY;

  cycles.forEach((cycle) => {
    const cycleTime = localDateTimeValue(cycle.time);
    if (!Number.isFinite(cycleTime) || !Number.isFinite(cycle.coefficient)) return;

    const difference = Math.abs(cycleTime - target);
    if (difference < nearestDifference) {
      nearestDifference = difference;
      nearestCoefficient = cycle.coefficient;
    }
  });

  return nearestCoefficient;
}

function deriveTideExtrema(points) {
  const extrema = [];

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];

    if (current.height >= previous.height && current.height > next.height) {
      extrema.push({ ...current, type: "PM" });
    } else if (
      current.height <= previous.height &&
      current.height < next.height
    ) {
      extrema.push({ ...current, type: "BM" });
    }
  }

  return extrema;
}

export function getCurrentTideState(cache, spotId, time) {
  const mapping = cache?.spots?.[spotId];
  const site = mapping ? cache?.sites?.[mapping.siteId] : null;
  const target = localDateTimeValue(time);

  if (
    !site?.data?.length ||
    !Number.isFinite(mapping?.distanceKm) ||
    mapping.distanceKm >= 100 ||
    !Number.isFinite(target)
  ) return null;

  const points = site.data
    .map((point) => ({ ...point, value: localDateTimeValue(point.time) }))
    .filter((point) => Number.isFinite(point.value))
    .sort((first, second) => first.value - second.value);
  const previous = [...points].reverse().find((point) => point.value <= target);
  const next = points.find((point) => point.value >= target);
  if (!previous || !next) return null;

  const duration = next.value - previous.value;
  const progress = duration > 0 ? (target - previous.value) / duration : 0;
  const height = previous.height + (next.height - previous.height) * progress;

  const extrema = (site.extrema?.length
    ? site.extrema
    : deriveTideExtrema(points)
  )
    .map((extremum) => ({
      ...extremum,
      value: localDateTimeValue(extremum.time)
    }))
    .filter((extremum) => Number.isFinite(extremum.value))
    .sort((first, second) => first.value - second.value);
  const nextExtremum = extrema.find((extremum) => extremum.value > target);
  if (!nextExtremum) return null;

  return {
    height,
    direction: nextExtremum.type === "PM" ? "rising" : "falling",
    coefficient: findNearestTideCoefficient(site.cycles, time),
    nextEventType: nextExtremum.type,
    nextEventTime: nextExtremum.time,
    siteName: site.siteName,
    distanceKm: mapping.distanceKm
  };
}

export function getTideSeries(cache, spotId, forecastTimes) {
  if (!cache || !Array.isArray(forecastTimes)) return null;

  const mapping = cache.spots?.[spotId];
  const site = mapping ? cache.sites?.[mapping.siteId] : null;
  if (!site?.data?.length) return null;

  const heightsByLocalTime = new Map(
    site.data.map((point) => [point.time.slice(0, 16), point.height])
  );
  const heights = forecastTimes.map(
    (time) => heightsByLocalTime.get(time.slice(0, 16)) ?? null
  );
  const coefficients = forecastTimes.map(
    (time) => findNearestTideCoefficient(site.cycles, time)
  );

  if (!heights.some(Number.isFinite)) return null;

  return {
    heights,
    coefficients,
    siteId: mapping.siteId,
    siteName: site.siteName,
    distanceKm: mapping.distanceKm,
    attribution: cache.attribution ?? TIDE_ATTRIBUTION,
    generatedAt: cache.generatedAt ?? null
  };
}
