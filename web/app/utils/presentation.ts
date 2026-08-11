import type { Mode, PlanningMode } from '#core'
import { UNKNOWN_BREWERY } from '#core'

/**
 * Everything that is purely presentation. Deliberately not in the core:
 * colours and abbreviations belong to this interface, not to the domain.
 */

export interface BreweryStyle {
  label: string
  /** Two lines on the tile, hence an array rather than a <br>. */
  short: string[]
  color: string
}

/**
 * Brand colours, deliberately here and not in the stylesheet.
 *
 * The palette belongs in `main.css` — it is a design decision. These values are
 * something else: they belong to the respective brewery and come with it, like
 * its name and abbreviation. So they sit with the other brewery data. Making
 * them readable on light and dark ground is `--bc-readable`'s job in the
 * stylesheet, not a second set of values here.
 */
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
  // The placeholder for the nine gardens without a verified brewery. "k. A."
  // is the honest label — not "wechselnd" and not nothing at all.
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

/** ISO-8601, as in the database: 1 = Monday. */
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

/** Shortens names for the map and the chain display, where the full name will not fit. */
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

/**
 * "90 min" or "75–120 min".
 *
 * Since stays can be bounded per garden, they are no longer one number for the
 * whole tour. Showing only the first value would claim a uniformity that does
 * not exist.
 */
export function formatStays(stays: number[]): string {
  const min = Math.min(...stays)
  const max = Math.max(...stays)

  return min === max ? `${min} min` : `${min}–${max} min`
}

/** 980 → "9,80 €". Arithmetic happens in cents, formatting happens here. */
export const formatEuro = (cents: number): string =>
  (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })

/** Labels for the kinds. Anything unknown shows its key — better than nothing. */
export const BEER_KIND_LABELS: Record<string, string> = {
  hell: 'Helles',
  weizen: 'Weißbier',
  alkoholfrei: 'Alkoholfrei',
  radler: 'Radler',
  dunkel: 'Dunkles',
}

export const formatBeerSize = (ml: number): string =>
  ml === 1000 ? 'Maß' : ml === 500 ? 'Halbe' : `${ml} ml`

export const formatSeats = (seats: number | null): string =>
  seats === null ? 'Größe unbekannt' : `${seats.toLocaleString('de-DE')} Plätze`

/**
 * The real connection on Google. As long as travel times are estimates, every
 * number owes the reader a path to a reliable answer.
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
