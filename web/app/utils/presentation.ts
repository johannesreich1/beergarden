import type { Filters, Garden, Mode, PlanningMode } from '#core'
import { TAGS, UNKNOWN_BREWERY, brewerySlug } from '#core'

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
  lammsbraeu: { label: 'Lammsbräu', short: ['LAMMS-', 'BRÄU'], color: '#6E8F3C' },
  wechselnd: { label: 'wechselnd', short: ['WECH-', 'SELND'], color: '#B08D50' },
  // The placeholder for the nine gardens without a verified brewery. "k. A."
  // is the honest label — not "wechselnd" and not nothing at all.
  [UNKNOWN_BREWERY]: { label: 'k. A.', short: ['K. A.'], color: '#6B5A3E' },
}

export const breweryStyle = (slug: string): BreweryStyle =>
  BREWERY_STYLES[slug] ?? BREWERY_STYLES[UNKNOWN_BREWERY]!

/**
 * The brewery's name for running text — null when none is verified.
 *
 * A meta line is a list of facts, and "k. A." in the middle of one is a gap
 * pretending to be a fact. The filter tiles still need something to print, so
 * `BREWERY_STYLES` keeps its entry; this is only about sentences.
 */
export const breweryName = (slug: string): string | null =>
  slug === UNKNOWN_BREWERY ? null : breweryStyle(slug).label

/**
 * The one separator for meta lines, with the empty parts dropped.
 *
 * Without it every caller reinvents where the dot goes when a fact is missing —
 * and gets it wrong at the start of the line.
 */
export const metaLine = (...parts: Array<string | null | undefined>): string =>
  parts.filter(Boolean).join(' · ')

/**
 * Re-exported from the core so components keep their auto-import — the
 * definitions moved there because the server-side sitemap needs them too.
 */
export { gardenPath, gardensFor } from '#core'

/**
 * The boolean wish filters, in the order every surface shows them.
 * Their names live in the locale file under `extras.<key>`.
 */
export type ExtraFilter = Extract<
  keyof Filters,
  'waterRequired' | 'selfServiceOnly' | 'ownFoodOnly' | 'cityOnly' | 'unvisitedOnly'
>

export const EXTRA_FILTERS: ExtraFilter[] = [
  'waterRequired', 'selfServiceOnly', 'ownFoodOnly', 'cityOnly', 'unvisitedOnly',
]

/**
 * How often each brewery occurs in the data.
 *
 * Every filter surface derives its tiles from this: a brewery with zero
 * gardens is not a filter but a dead end, so only the present ones show.
 */
export function breweryCounts(gardens: Garden[]): Record<string, number> {
  const counts: Record<string, number> = {}

  for (const garden of gardens) {
    const slug = brewerySlug(garden)
    counts[slug] = (counts[slug] ?? 0) + 1
  }

  return counts
}

export function presentBreweries(gardens: Garden[]): string[] {
  const counts = breweryCounts(gardens)

  return Object.keys(BREWERY_STYLES).filter((slug) => (counts[slug] ?? 0) > 0)
}

/** The character tags in display order — the vocabulary is the core's. */
export const TAG_KEYS: string[] = Object.values(TAGS)

/** The planning modes, in menu order. Their names sit under `planningModes.*`. */
export const PLANNING_MODES: PlanningMode[] = ['mix', 'walk', 'bike', 'transit']

/** The travel modes, in display order. Their names sit under `modes.*`. */
export const MODES: Mode[] = ['walk', 'bike', 'transit']

/** ISO-8601, as in the database: 1 = Monday. Names sit under `weekdays.*`. */
export const WEEKDAY_VALUES = [1, 2, 3, 4, 5, 6, 7]

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

/** 980 → "9,80 €". Arithmetic happens in cents, formatting happens here. */
export const formatEuro = (cents: number): string =>
  (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })

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

/** The time windows on offer. One list, wherever the question is asked. */
export const BUDGETS = [
  { value: 240, label: '4 h' },
  { value: 300, label: '5 h' },
  { value: 360, label: '6 h' },
  { value: 420, label: '7 h' },
]
