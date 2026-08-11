/**
 * Sonnenuntergang aus Datum und Ort.
 *
 * Vorher stand im Prototyp eine Konstante — 20:34, der Wert für München am
 * 11.08.2026. Damit war der Planer auf genau einen Tag festgenagelt. Das
 * Verfahren hier ist der übliche NOAA-Ansatz und liegt auf die Minute genau,
 * was für "geht die letzte Station in die Dämmerung" mehr als reicht.
 *
 * Die Gegenprobe steht im Test: derselbe Tag, derselbe Ort, 20:34.
 */

const DAY_MS = 86_400_000
const J1970 = 2_440_588
const J2000 = 2_451_545

const rad = Math.PI / 180
const OBLIQUITY = rad * 23.4397

/**
 * Sonnenuntergang gilt, wenn die Sonnenmitte 0.833° unter dem Horizont steht.
 * Das deckt Refraktion und den scheinbaren Radius der Sonnenscheibe ab.
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

/** Korrektur zwischen mittlerer und wahrer Sonnenzeit. */
const solarTransit = (approx: number, meanAnomaly: number, eclipticLon: number) =>
  J2000 + approx + 0.0053 * Math.sin(meanAnomaly) - 0.0069 * Math.sin(2 * eclipticLon)

export function sunsetAt(date: Date, lat: number, lon: number): Date {
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
 * Minuten seit Mitternacht in einer Zeitzone.
 *
 * Über Intl statt über eine Bibliothek: Sommerzeit ist genau der Fall, bei dem
 * eigene Rechnerei schiefgeht, und die Zeitzonendaten bringt die Laufzeit mit.
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

/** Sonnenuntergang als Minuten seit Mitternacht Ortszeit. */
export function sunsetMinutes(
  date: Date,
  lat: number,
  lon: number,
  timeZone = 'Europe/Berlin',
): number {
  return minutesInZone(sunsetAt(date, lat, lon), timeZone)
}
