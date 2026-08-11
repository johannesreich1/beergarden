/**
 * Sunset from a date and a place.
 *
 * The prototype had a constant here — 20:34, the value for Munich on
 * 2026-08-11. That pinned the planner to exactly one day. The method below is
 * the usual NOAA approach and is accurate to the minute, which is more than
 * enough for "does the last stop run into dusk".
 *
 * The cross-check lives in the test: same day, same place.
 */

const DAY_MS = 86_400_000
const J1970 = 2_440_588
const J2000 = 2_451_545

const rad = Math.PI / 180
const OBLIQUITY = rad * 23.4397

/**
 * Sunset is when the centre of the sun sits 0.833° below the horizon. That
 * covers refraction and the apparent radius of the solar disc.
 */
const SUNSET_ALTITUDE = rad * -0.833

const toDays = (date: Date) => date.valueOf() / DAY_MS - 0.5 + J1970 - J2000
const fromJulian = (julian: number) => new Date((julian + 0.5 - J1970) * DAY_MS)

const solarMeanAnomaly = (days: number) => rad * (357.5291 + 0.98560028 * days)

const eclipticLongitude = (meanAnomaly: number) => {
  const center =
    rad *
    (1.9148 * Math.sin(meanAnomaly) +
      0.02 * Math.sin(2 * meanAnomaly) +
      0.0003 * Math.sin(3 * meanAnomaly))
  const perihelion = rad * 102.9372

  return meanAnomaly + center + perihelion + Math.PI
}

const declination = (eclipticLon: number) =>
  Math.asin(Math.sin(OBLIQUITY) * Math.sin(eclipticLon))

/** Correction between mean and true solar time. */
const solarTransit = (approx: number, meanAnomaly: number, eclipticLon: number) =>
  J2000 + approx + 0.0053 * Math.sin(meanAnomaly) - 0.0069 * Math.sin(2 * eclipticLon)

function sunsetAt(date: Date, lat: number, lon: number): Date {
  const west = rad * -lon
  const latitude = rad * lat
  const days = toDays(date)

  const cycle = Math.round(days - 0.0009 - west / (2 * Math.PI))
  const noonApprox = 0.0009 + west / (2 * Math.PI) + cycle

  const meanAnomaly = solarMeanAnomaly(noonApprox)
  const eclipticLon = eclipticLongitude(meanAnomaly)
  const dec = declination(eclipticLon)

  const hourAngle = Math.acos(
    (Math.sin(SUNSET_ALTITUDE) - Math.sin(latitude) * Math.sin(dec)) /
      (Math.cos(latitude) * Math.cos(dec)),
  )

  const setApprox = 0.0009 + (hourAngle + west) / (2 * Math.PI) + cycle

  return fromJulian(solarTransit(setApprox, meanAnomaly, eclipticLon))
}

/**
 * Minutes since midnight in a time zone.
 *
 * Via Intl rather than a library: daylight saving is exactly where doing the
 * arithmetic yourself goes wrong, and the runtime ships the zone data anyway.
 */
function minutesInZone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0)

  return value('hour') * 60 + value('minute')
}

/** Sunset as minutes since midnight, local time. */
export function sunsetMinutes(
  date: Date,
  lat: number,
  lon: number,
  timeZone = 'Europe/Berlin',
): number {
  return minutesInZone(sunsetAt(date, lat, lon), timeZone)
}
