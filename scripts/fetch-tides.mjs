import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { haversineDistance } from "../js/distance.js";
import { TIDE_ATTRIBUTION, validateTideCache } from "../js/tides.js";

const API_BASE_URL = "https://api-maree.fr";
const TIME_ZONE = "Europe/Paris";
export const TIDE_SITE_MAX_DISTANCE_KM = 100;

function formatLocalDate(date) {
  const parts = new Intl.DateTimeFormat("fr-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addCalendarDays(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

async function fetchJson(url, label) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`${label}: réponse HTTP ${response.status}.`);
  }

  return response.json();
}

export function mapSpotsToTideSites(
  spots,
  tideSites,
  maxDistanceKm = TIDE_SITE_MAX_DISTANCE_KM
) {
  const mappings = {};

  spots.forEach((spot) => {
    const waterType = spot.typePlanEau?.trim().toLocaleLowerCase("fr-FR");
    if (spot.maree === "sans marée" || ["lac", "étang"].includes(waterType)) {
      return;
    }

    const nearest = tideSites
      .map((site) => ({
        site,
        distanceKm: haversineDistance(spot, site)
      }))
      .sort((first, second) => first.distanceKm - second.distanceKm)[0];

    if (!nearest || nearest.distanceKm > maxDistanceKm) return;

    mappings[spot.id] = {
      siteId: nearest.site.siteId,
      distanceKm: Number(nearest.distanceKm.toFixed(1))
    };
  });

  return mappings;
}

export function normalizeWaterLevels(payload, expectedSiteId) {
  if (
    payload?.site_id !== expectedSiteId ||
    payload?.unit !== "m" ||
    !Array.isArray(payload?.data) ||
    !payload.data.length
  ) {
    throw new TypeError(`Réponse de marée invalide pour ${expectedSiteId}.`);
  }

  return payload.data.map((point) => {
    if (
      typeof point?.time !== "string" ||
      !Number.isFinite(point?.height) ||
      point.height < 0
    ) {
      throw new TypeError(`Hauteur de marée invalide pour ${expectedSiteId}.`);
    }

    return {
      time: point.time,
      height: point.height
    };
  });
}

export function normalizeTideExtrema(payload, expectedSiteId) {
  if (
    payload?.site_id !== expectedSiteId ||
    payload?.unit !== "m" ||
    !Array.isArray(payload?.data)
  ) {
    throw new TypeError(`Réponse des extrêmes invalide pour ${expectedSiteId}.`);
  }

  const extrema = payload.data.flatMap((day) => {
    if (
      typeof day?.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(day.date) ||
      !Array.isArray(day.extrema)
    ) {
      throw new TypeError(`Jour de marée invalide pour ${expectedSiteId}.`);
    }

    return day.extrema.map((extremum) => {
      if (
        !["PM", "BM"].includes(extremum?.type) ||
        typeof extremum.time !== "string" ||
        !/^\d{2}:\d{2}$/.test(extremum.time) ||
        !Number.isFinite(extremum.height) ||
        extremum.height < 0 ||
        (extremum.type === "PM" &&
          (!Number.isFinite(extremum.coef) || extremum.coef < 0))
      ) {
        throw new TypeError(`Extrême de marée invalide pour ${expectedSiteId}.`);
      }

      return {
        type: extremum.type,
        time: `${day.date}T${extremum.time}`,
        height: extremum.height,
        ...(extremum.type === "PM" ? { coefficient: extremum.coef } : {})
      };
    });
  });

  if (!extrema.length) {
    throw new TypeError(`Aucun extrême de marée pour ${expectedSiteId}.`);
  }

  return extrema;
}

export function normalizeTideCycles(payload, expectedSiteId) {
  return normalizeTideExtrema(payload, expectedSiteId)
    .filter((extremum) => extremum.type === "PM")
    .map(({ time, height, coefficient }) => ({
      time,
      height,
      coefficient
    }));
}

export async function buildTideCache({ apiKey, now = new Date() }) {
  if (!apiKey) {
    throw new Error("Le secret TIDE_API_KEY est absent.");
  }

  const spots = JSON.parse(
    await readFile(new URL("../data/spots.json", import.meta.url), "utf8")
  );
  const sitesPayload = await fetchJson(
    new URL("/sites", API_BASE_URL),
    "Liste des ports de marée"
  );
  const tideSites = (sitesPayload.sites ?? []).map((site) => ({
    siteId: site.site_id,
    siteName: site.site_name,
    latitude: site.latitude,
    longitude: site.longitude
  }));

  if (!tideSites.length) {
    throw new Error("Aucun port de marée n'a été retourné.");
  }

  const spotMappings = mapSpotsToTideSites(spots, tideSites);
  const requiredSiteIds = [...new Set(
    Object.values(spotMappings).map(({ siteId }) => siteId)
  )].sort();
  const fromDate = formatLocalDate(now);
  const toDate = addCalendarDays(fromDate, 9);
  const extremaToDate = addCalendarDays(fromDate, 8);

  const siteEntries = await Promise.all(requiredSiteIds.map(async (siteId) => {
    const site = tideSites.find((candidate) => candidate.siteId === siteId);
    const waterLevelsUrl = new URL("/water-levels", API_BASE_URL);
    waterLevelsUrl.search = new URLSearchParams({
      site: siteId,
      from: `${fromDate}T00:00`,
      to: `${toDate}T00:00`,
      step: "60",
      tz: TIME_ZONE,
      key: apiKey
    });
    const extremaUrl = new URL("/tide-extrema", API_BASE_URL);
    extremaUrl.search = new URLSearchParams({
      site: siteId,
      from: fromDate,
      to: extremaToDate,
      tz: TIME_ZONE,
      key: apiKey
    });

    const [waterLevels, extrema] = await Promise.all([
      fetchJson(waterLevelsUrl, `Hauteurs de marée ${siteId}`),
      fetchJson(extremaUrl, `Cycles de marée ${siteId}`)
    ]);
    const normalizedExtrema = normalizeTideExtrema(extrema, siteId);
    return [siteId, {
      siteName: waterLevels.site_name ?? site.siteName,
      latitude: site.latitude,
      longitude: site.longitude,
      data: normalizeWaterLevels(waterLevels, siteId),
      extrema: normalizedExtrema,
      cycles: normalizedExtrema
        .filter((extremum) => extremum.type === "PM")
        .map(({ time, height, coefficient }) => ({
          time,
          height,
          coefficient
        }))
    }];
  }));

  const cache = {
    generatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 7 * 3_600_000).toISOString(),
    source: "api-maree.fr",
    sourceUrl: "https://api-maree.fr/",
    attribution: TIDE_ATTRIBUTION,
    spots: spotMappings,
    sites: Object.fromEntries(siteEntries)
  };

  return validateTideCache(cache);
}

async function main() {
  const cache = await buildTideCache({ apiKey: process.env.TIDE_API_KEY });
  const outputUrl = new URL("../data/tides.json", import.meta.url);
  await writeFile(outputUrl, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
  console.log(
    `Cache de marée généré pour ${Object.keys(cache.spots).length} spots ` +
    `et ${Object.keys(cache.sites).length} ports.`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
