const DEFAULT_OPTIONS = Object.freeze({
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5 * 60 * 1000
});

const ERROR_MESSAGES = Object.freeze({
  denied: "La géolocalisation a été refusée. Choisissez un spot dans la liste.",
  unavailable: "Votre position est indisponible. Vérifiez le GPS puis réessayez.",
  timeout: "La localisation prend trop de temps. Réessayez dans un instant.",
  unsupported: "La géolocalisation n'est pas disponible sur cet appareil.",
  unknown: "Impossible de récupérer votre position. Réessayez dans un instant."
});

export class GeolocationError extends Error {
  constructor(reason, cause) {
    super(ERROR_MESSAGES[reason] ?? ERROR_MESSAGES.unknown, { cause });
    this.name = "GeolocationError";
    this.reason = reason;
  }
}

export const EXACT_POSITION_SPOT_ID = "position-exacte";

export function buildExactPositionSpot(position, nearestSpot) {
  const latitude = position?.latitude;
  const longitude = position?.longitude;
  if (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180
  ) {
    throw new TypeError("Coordonnées GPS invalides.");
  }
  if (!nearestSpot) {
    throw new TypeError("Aucun spot Windguru de référence disponible.");
  }

  return {
    id: EXACT_POSITION_SPOT_ID,
    nom: "Ma position exacte",
    latitude,
    longitude,
    region: nearestSpot.region,
    departement: nearestSpot.departement,
    pays: nearestSpot.pays,
    orientationIdeale: [],
    niveau: null,
    maree: null,
    typePlanEau: null,
    windguruSpotId: nearestSpot.windguruSpotId,
    windguruSpotName: nearestSpot.windguruSpotName ?? nearestSpot.nom,
    windguruReferenceDistanceKm: nearestSpot.distanceKm,
    accuracyM: Number.isFinite(position.accuracy) ? position.accuracy : null,
    isExactPosition: true,
    tags: ["GPS"]
  };
}

function normalizeError(error) {
  const reasonsByCode = {
    1: "denied",
    2: "unavailable",
    3: "timeout"
  };

  return new GeolocationError(reasonsByCode[error?.code] ?? "unknown", error);
}

export function requestCurrentPosition(
  geolocation = globalThis.navigator?.geolocation,
  options = DEFAULT_OPTIONS
) {
  if (!geolocation?.getCurrentPosition) {
    return Promise.reject(new GeolocationError("unsupported"));
  }

  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      ({ coords }) => {
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy
        });
      },
      (error) => reject(normalizeError(error)),
      options
    );
  });
}
