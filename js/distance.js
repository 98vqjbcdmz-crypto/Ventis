const EARTH_RADIUS_KM = 6371.0088;

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function assertCoordinates({ latitude, longitude }, label) {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new TypeError(`${label}: latitude invalide.`);
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new TypeError(`${label}: longitude invalide.`);
  }
}

export function haversineDistance(origin, destination) {
  assertCoordinates(origin, "Position de départ");
  assertCoordinates(destination, "Position d'arrivée");

  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
}

export function sortSpotsByDistance(position, spots) {
  return spots
    .map((spot) => ({
      ...spot,
      distanceKm: haversineDistance(position, spot)
    }))
    .sort((first, second) => first.distanceKm - second.distanceKm);
}

export function formatDistance(distanceKm) {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new TypeError("Distance invalide.");
  }

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${Math.round(distanceKm)} km`;
}
