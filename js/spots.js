const REQUIRED_FIELDS = [
  "id",
  "nom",
  "latitude",
  "longitude",
  "region",
  "pays",
  "windguruSpotId"
];

function isValidCoordinate(value, minimum, maximum) {
  return Number.isFinite(value) && value >= minimum && value <= maximum;
}

function isValidHttpsUrl(value) {
  if (typeof value !== "string") return false;

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function validateOptionalMetadata(spot) {
  if (
    spot.windguruSpotId != null &&
    (!Number.isInteger(spot.windguruSpotId) || spot.windguruSpotId <= 0)
  ) {
    throw new TypeError(`Spot ${spot.id}: identifiant Windguru invalide.`);
  }

  if (
    spot.forecastModel != null &&
    spot.forecastModel !== "meteofrance_arome_france_hd"
  ) {
    throw new TypeError(`Spot ${spot.id}: modèle de prévision invalide.`);
  }

  if (spot.ecole != null) {
    if (
      typeof spot.ecole !== "object" ||
      typeof spot.ecole.nom !== "string" ||
      !spot.ecole.nom.trim() ||
      !isValidHttpsUrl(spot.ecole.url)
    ) {
      throw new TypeError(`Spot ${spot.id}: école invalide.`);
    }
  }

  if (spot.parking != null) {
    if (
      typeof spot.parking !== "object" ||
      !isValidCoordinate(spot.parking.latitude, -90, 90) ||
      !isValidCoordinate(spot.parking.longitude, -180, 180) ||
      !isValidHttpsUrl(spot.parking.url)
    ) {
      throw new TypeError(`Spot ${spot.id}: parking invalide.`);
    }
  }
}

export function validateSpots(spots) {
  if (!Array.isArray(spots) || spots.length === 0) {
    throw new TypeError("La base des spots est vide ou invalide.");
  }

  const ids = new Set();

  spots.forEach((spot, index) => {
    const missingField = REQUIRED_FIELDS.find((field) => spot[field] == null);
    if (missingField) {
      throw new TypeError(`Spot ${index}: champ ${missingField} manquant.`);
    }

    if (ids.has(spot.id)) {
      throw new TypeError(`Identifiant de spot dupliqué: ${spot.id}.`);
    }

    if (!isValidCoordinate(spot.latitude, -90, 90)) {
      throw new TypeError(`Spot ${spot.id}: latitude invalide.`);
    }

    if (!isValidCoordinate(spot.longitude, -180, 180)) {
      throw new TypeError(`Spot ${spot.id}: longitude invalide.`);
    }

    validateOptionalMetadata(spot);

    ids.add(spot.id);
  });

  return spots;
}

export async function loadSpots(fetchImplementation = globalThis.fetch) {
  if (typeof fetchImplementation !== "function") {
    throw new TypeError("Fetch n'est pas disponible.");
  }

  const spotsUrl = new URL("../data/spots.json", import.meta.url);
  const response = await fetchImplementation(spotsUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Chargement des spots impossible (${response.status}).`);
  }

  return validateSpots(await response.json());
}
