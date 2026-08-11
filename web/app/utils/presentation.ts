import type { Mode, PlanningMode } from '#core'
import { UNKNOWN_BREWERY } from '#core'

/**
 * Alles, was nur mit Darstellung zu tun hat. Bewusst nicht im Kern: Farben und
 * Abkürzungen sind eine Sache dieser Oberfläche, nicht der Domäne.
 */

export interface BreweryStyle {
  label: string
  /** Zweizeilig auf der Kachel, deshalb ein Array statt eines <br>. */
  short: string[]
  color: string
}

export const BREWERY_STYLES: Record<string, BreweryStyle> = {
  augustiner: { label: 'Augustiner', short: ['AUGU-', 'STINER'], color: '#2E6B3A' },
  paulaner: { label: 'Paulaner', short: ['PAU-', 'LANER'], color: '#2B5EA8' },
  loewen: { label: 'Löwenbräu', short: ['LÖWEN-', 'BRÄU'], color: '#1F4C8F' },
  hofbraeu: { label: 'Hofbräu', short: ['HOF-', 'BRÄU'], color: '#3E86C4' },
  spaten: { label: 'Spaten', short: ['SPATEN'], color: '#D19A16' },
  ayinger: { label: 'Ayinger', short: ['AYIN-', 'GER'], color: '#6E8FC4' },
  giesinger: { label: 'Giesinger', short: ['GIE-', 'SINGER'], color: '#9E3030' },
  bio: { label: 'Bio / Lammsbräu', short: ['BIO'], color: '#6E8F3C' },
  wechselnd: { label: 'wechselnd', short: ['WECH-', 'SELND'], color: '#B08D50' },
  // Der Platzhalter für die neun Gärten ohne verifizierte Brauerei. "k. A."
  // ist die ehrliche Anzeige — nicht "wechselnd" und nicht gar nichts.
  [UNKNOWN_BREWERY]: { label: 'k. A.', short: ['K. A.'], color: '#6B5A3E' },
}

export const breweryStyle = (slug: string): BreweryStyle =>
  BREWERY_STYLES[slug] ?? BREWERY_STYLES[UNKNOWN_BREWERY]

export const TAG_LABELS: Record<string, string> = {
  wasser: 'Am Wasser',
  wald: 'Wald & Grün',
  stadt: 'Stadtfeeling',
  aussicht: 'Aussicht',
  keller: 'Bierkeller',
  spielplatz: 'Spielplatz',
  musik: 'Live-Musik',
}

export const MODE_OPTIONS: Record<PlanningMode, string> = {
  mix: 'Gemischt',
  walk: 'Zu Fuß',
  bike: 'Rad',
  transit: 'ÖPNV',
}

export const MODE_LABELS: Record<Mode, string> = {
  walk: 'zu Fuß',
  bike: 'Rad',
  transit: 'ÖPNV',
}

/** ISO-8601, wie in der Datenbank: 1 = Montag. */
export const WEEKDAYS = [
  { value: 1, label: 'Mo', name: 'Montag' },
  { value: 2, label: 'Di', name: 'Dienstag' },
  { value: 3, label: 'Mi', name: 'Mittwoch' },
  { value: 4, label: 'Do', name: 'Donnerstag' },
  { value: 5, label: 'Fr', name: 'Freitag' },
  { value: 6, label: 'Sa', name: 'Samstag' },
  { value: 7, label: 'So', name: 'Sonntag' },
]

export const WEEKDAY_NAMES: Record<number, string> = {
  1: 'montags', 2: 'dienstags', 3: 'mittwochs', 4: 'donnerstags',
  5: 'freitags', 6: 'samstags', 7: 'sonntags',
}

/** Kürzt Namen für Karte und Ketten-Anzeige, wo der volle Name nicht hinpasst. */
export function shortName(name: string): string {
  return name
    .replace(/^(Augustiner Gutshof |Biergarten am |Königlicher |Waldgaststätte |Schlosswirtschaft |Café )/, '')
    .replace(' im Englischen Garten', '')
    .replace(' am Wiener Platz', '')
    .replace(' am Nockherberg', '')
    .replace(' im Alten Botanischen Garten', '')
    .replace(' Kunstkraftwerk', '')
    .replace(' im Westpark', '')
}

export const formatSeats = (seats: number | null): string =>
  seats === null ? 'Größe unbekannt' : `${seats.toLocaleString('de-DE')} Plätze`

/**
 * Die echte Verbindung bei Google. Solange die Fahrzeiten geschätzt sind,
 * gehört zu jeder Zahl ein Weg zur belastbaren Auskunft.
 */
export function directionsUrl(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  mode: Mode,
): string {
  const travelMode = mode === 'walk' ? 'walking' : mode === 'bike' ? 'bicycling' : 'transit'

  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lon}&destination=${to.lat},${to.lon}&travelmode=${travelMode}`
}

export const mapsSearchUrl = (name: string): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, München`)}`
