const DEG_TO_RAD = Math.PI / 180;
const SUNSET_ELEVATION_DEGREES = -0.833;
const CIVIL_TWILIGHT_ELEVATION_DEGREES = -6;

function parseDateKey(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  if (!match) return null;

  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;

  return { date, year, month, day };
}

function getSolarDeclination(date) {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear) / 86_400_000) + 1;
  const gamma = 2 * Math.PI / 365 * (dayOfYear - 1);

  return 0.006918
    - 0.399912 * Math.cos(gamma)
    + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma)
    + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma)
    + 0.00148 * Math.sin(3 * gamma);
}

function getEveningHourAngle(latitude, declination, elevationDegrees) {
  const latitudeRadians = latitude * DEG_TO_RAD;
  const elevationRadians = elevationDegrees * DEG_TO_RAD;
  const cosine = (
    Math.sin(elevationRadians) -
    Math.sin(latitudeRadians) * Math.sin(declination)
  ) / (
    Math.cos(latitudeRadians) * Math.cos(declination)
  );

  if (!Number.isFinite(cosine) || cosine < -1 || cosine > 1) return null;
  return Math.acos(cosine);
}

export function calculateCivilTwilightEnd(sunsetTime, latitude) {
  const parsedDate = parseDateKey(sunsetTime);
  const timeMatch = /T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(sunsetTime ?? "");
  if (!parsedDate || !timeMatch || !Number.isFinite(latitude)) return null;

  const declination = getSolarDeclination(parsedDate.date);
  const sunsetAngle = getEveningHourAngle(
    latitude,
    declination,
    SUNSET_ELEVATION_DEGREES
  );
  const civilTwilightAngle = getEveningHourAngle(
    latitude,
    declination,
    CIVIL_TWILIGHT_ELEVATION_DEGREES
  );
  if (sunsetAngle == null || civilTwilightAngle == null) return null;

  const twilightSeconds = Math.round(
    (civilTwilightAngle - sunsetAngle) / DEG_TO_RAD * 4 * 60
  );
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const seconds = Number(timeMatch[3] ?? 0);
  const eventTime = Date.UTC(
    parsedDate.year,
    parsedDate.month - 1,
    parsedDate.day,
    hours,
    minutes,
    seconds + twilightSeconds
  );

  return new Date(eventTime).toISOString().slice(0, 16);
}

export function getCurrentDaylightTimes(daily, currentTime, latitude) {
  const dateKey = typeof currentTime === "string" ? currentTime.slice(0, 10) : "";
  const index = daily?.time?.indexOf(dateKey) ?? -1;
  const sunsetTime = index >= 0 ? daily?.sunset?.[index] : null;
  if (typeof sunsetTime !== "string") return null;

  return {
    sunsetTime,
    civilTwilightEndTime: calculateCivilTwilightEnd(sunsetTime, latitude)
  };
}

export function formatDaylightDeparture(daylight, currentTime) {
  if (!daylight?.sunsetTime) return "indisponible";

  const sunset = daylight.sunsetTime.slice(11, 16);
  const twilightEnd = daylight.civilTwilightEndTime?.slice(11, 16);
  if (!twilightEnd) return `coucher ${sunset}`;

  const currentTimestamp = new Date(currentTime).getTime();
  const twilightTimestamp = new Date(daylight.civilTwilightEndTime).getTime();
  if (
    Number.isFinite(currentTimestamp) &&
    Number.isFinite(twilightTimestamp) &&
    currentTimestamp >= twilightTimestamp
  ) {
    return `coucher ${sunset} · frontale nécessaire depuis ${twilightEnd}`;
  }

  return `coucher ${sunset} · parking quitté avant ${twilightEnd} (frontale ensuite)`;
}
