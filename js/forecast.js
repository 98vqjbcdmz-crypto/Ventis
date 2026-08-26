export const AROME_FRANCE_HD_MODEL = "meteofrance_arome_france_hd";

const HOURLY_WIND_VARIABLES = [
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m"
];

export function buildWindUrl(lat, lon, model = null) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: [
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "temperature_2m"
    ].join(","),
    minutely_15: [
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m"
    ].join(","),
    hourly: [
      ...HOURLY_WIND_VARIABLES,
      "temperature_2m",
      "precipitation_probability",
      "precipitation"
    ].join(","),
    timezone: "Europe/Paris"
  });

  if (model) url.searchParams.set("models", model);
  return url.href;
}

export function buildPreferredWindUrl(spot) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(spot.latitude),
    longitude: String(spot.longitude),
    hourly: HOURLY_WIND_VARIABLES.join(","),
    timezone: "Europe/Paris",
    models: spot.forecastModel ?? AROME_FRANCE_HD_MODEL
  });
  return url.href;
}

export function mergePreferredWindForecast(fallbackData, preferredData) {
  const fallbackHourly = fallbackData?.hourly;
  const preferredHourly = preferredData?.hourly;
  if (!fallbackHourly?.time || !preferredHourly?.time) return fallbackData;

  const preferredIndexes = new Map(
    preferredHourly.time.map((time, index) => [time, index])
  );
  const hourly = { ...fallbackHourly };

  HOURLY_WIND_VARIABLES.forEach((variable) => {
    const fallbackValues = fallbackHourly[variable];
    const preferredValues = preferredHourly[variable];
    if (!Array.isArray(fallbackValues) || !Array.isArray(preferredValues)) return;

    hourly[variable] = fallbackHourly.time.map((time, index) => {
      const preferredIndex = preferredIndexes.get(time);
      const preferredValue = preferredValues[preferredIndex];
      return Number.isFinite(preferredValue)
        ? preferredValue
        : fallbackValues[index];
    });
  });

  return { ...fallbackData, hourly };
}

export function buildWindguruUrl(spot) {
  if (!Number.isInteger(spot.windguruSpotId) || spot.windguruSpotId <= 0) {
    throw new TypeError(`Spot ${spot.id ?? "inconnu"}: fiche Windguru manquante.`);
  }

  return `https://www.windguru.cz/${spot.windguruSpotId}`;
}
