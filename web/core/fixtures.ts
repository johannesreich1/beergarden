import { at } from './time'
import type { Filters, Garden, PlannerOptions, StartPoint } from './types'

/**
 * Sieben echte Gärten aus `data/gardens.json`, hier abgeschrieben statt zur
 * Testlaufzeit eingelesen.
 *
 * Der Kern soll ohne Repo-Layout, ohne Dateisystem und ohne Netz testbar sein —
 * genau das ist die Eigenschaft, wegen der er außerhalb von app/ liegt. Ein
 * `readFileSync('../../data/...')` im Test würde sie stillschweigend aufgeben.
 *
 * Die Auswahl deckt ab, worauf es ankommt: zwei Gärten derselben Brauerei,
 * einer am Wasser, einer mit Ruhetag am Dienstag, unterschiedliche
 * Öffnungszeiten und ein Umland-Fall über `zone`.
 */

interface RawGarden {
  slug: string
  name: string
  district: string
  brewery: string | null
  breweryLabel: string | null
  seats: number
  tags: string[]
  opensAt: number
  closesAt: number
  stationWalkMin: number
  charm: number
  lat: number
  lon: number
  zone?: 'city' | 'umland'
  closedOnTuesday?: boolean
  caveat?: string
  minStay?: number
  maxStay?: number
}

const RAW: RawGarden[] = [
  {
    slug: 'augustinerkeller', name: 'Augustiner-Keller', district: 'Maxvorstadt',
    brewery: 'augustiner', breweryLabel: 'Augustiner', seats: 5000,
    tags: ['stadt', 'keller', 'spielplatz'],
    opensAt: at(10), closesAt: at(23, 30), stationWalkMin: 4, charm: 5,
    lat: 48.1436, lon: 11.5527,
  },
  {
    slug: 'hirschgarten', name: 'Königlicher Hirschgarten', district: 'Neuhausen',
    brewery: 'augustiner', breweryLabel: 'Augustiner', seats: 8000,
    tags: ['wald', 'spielplatz'],
    opensAt: at(11), closesAt: at(22), stationWalkMin: 6, charm: 5,
    lat: 48.1497, lon: 11.5178,
  },
  {
    slug: 'chinaturm', name: 'Chinesischer Turm', district: 'Englischer Garten',
    brewery: 'hofbraeu', breweryLabel: 'Hofbräu', seats: 7000,
    tags: ['wald', 'musik'],
    opensAt: at(11), closesAt: at(22, 30), stationWalkMin: 10, charm: 4,
    lat: 48.1524, lon: 11.592,
  },
  {
    slug: 'seehaus', name: 'Seehaus im Englischen Garten', district: 'Englischer Garten',
    brewery: 'paulaner', breweryLabel: 'Paulaner', seats: 2500,
    tags: ['wasser', 'spielplatz'],
    opensAt: at(11, 30), closesAt: at(23), stationWalkMin: 12, charm: 5,
    lat: 48.1601, lon: 11.5936,
  },
  {
    slug: 'hirschau', name: 'Hirschau', district: 'Englischer Garten Nord',
    brewery: 'paulaner', breweryLabel: 'Paulaner', seats: 1800,
    tags: ['wald', 'spielplatz', 'musik'],
    opensAt: at(11), closesAt: at(22), stationWalkMin: 14, charm: 4,
    lat: 48.1613, lon: 11.5993,
    closedOnTuesday: true,
    caveat: 'Öffnet aktuell nur Samstag, Sonntag und an Feiertagen.',
  },
  {
    slug: 'flaucher', name: 'Zum Flaucher', district: 'Isarauen / Sendling',
    brewery: 'loewen', breweryLabel: 'Löwenbräu', seats: 1700,
    tags: ['wasser', 'wald', 'spielplatz', 'musik'],
    opensAt: at(12), closesAt: at(22, 30), stationWalkMin: 13, charm: 4,
    lat: 48.1097, lon: 11.5503,
  },
  {
    slug: 'hofbraeukeller', name: 'Hofbräukeller am Wiener Platz', district: 'Haidhausen',
    brewery: 'hofbraeu', breweryLabel: 'Hofbräu', seats: 1500,
    tags: ['stadt', 'keller'],
    opensAt: at(11), closesAt: at(23), stationWalkMin: 3, charm: 4,
    lat: 48.1338, lon: 11.5928,
    // Ein kleines Haus: hier sitzt niemand zweieinhalb Stunden.
    maxStay: 75,
  },
]

const TUESDAY = 2

function toGarden(raw: RawGarden): Garden {
  return {
    slug: raw.slug,
    name: raw.name,
    district: raw.district,
    brewery: raw.brewery ? { slug: raw.brewery, label: raw.breweryLabel! } : null,
    seats: raw.seats,
    tags: raw.tags,
    selfService: true,
    ownFoodAllowed: true,
    stationWalkMin: raw.stationWalkMin,
    charm: raw.charm,
    minStayMinutes: raw.minStay ?? null,
    maxStayMinutes: raw.maxStay ?? null,
    lat: raw.lat,
    lon: raw.lon,
    zone: raw.zone ?? 'city',
    caveat: raw.caveat ?? null,
    description: null,
    beerPrices: [],
    openingHours: [1, 2, 3, 4, 5, 6, 7].map((weekday) => {
      const closed = weekday === TUESDAY && raw.closedOnTuesday === true

      return {
        area: 'garden',
        weekday,
        isClosed: closed,
        opensAt: closed ? null : raw.opensAt,
        closesAt: closed ? null : raw.closesAt,
        weatherDependent: false,
        verifiedAt: null,
      }
    }),
  }
}

export const GARDENS: Garden[] = RAW.map(toGarden)

export const gardenBySlug = (slug: string): Garden =>
  GARDENS.find((garden) => garden.slug === slug)!

/** Candidplatz — der Startpunkt, mit dem das ganze Projekt angefangen hat. */
export const CANDIDPLATZ: StartPoint = { name: 'Candidplatz', lat: 48.1148, lon: 11.5687 }

export const NO_FILTERS: Filters = {
  tags: [],
  breweries: [],
  selfServiceOnly: false,
  ownFoodOnly: false,
  unvisitedOnly: false,
  cityOnly: false,
  waterRequired: false,
}

/** Der Ausgangsfall aus PROJECT.md: Dienstagnachmittag ab Candidplatz. */
export function defaultOptions(overrides: Partial<PlannerOptions> = {}): PlannerOptions {
  return {
    start: CANDIDPLATZ,
    startMinutes: at(15),
    budgetMinutes: 360,
    stops: 3,
    mode: 'mix',
    maxLegMinutes: 25,
    weekday: TUESDAY,
    filters: NO_FILTERS,
    visited: new Set<string>(),
    sunsetMinutes: at(20, 34),
    ...overrides,
  }
}
