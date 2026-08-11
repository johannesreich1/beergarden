/**
 * Die Typen des Kerns.
 *
 * Zeiten sind ausnahmslos Minuten seit Mitternacht. Eine Sperrstunde um halb
 * eins nachts ist 1470, nicht 30 — sonst rechnet jeder Vergleich über den
 * Tageswechsel falsch. Dieselbe Konvention wie in der Datenbank, wo MariaDB
 * dafür TIME über 24 Stunden hält.
 */

export type Mode = 'walk' | 'bike' | 'transit'

/** Was der Nutzer wählt. 'mix' überlässt die Wahl pro Etappe dem Modell. */
export type PlanningMode = Mode | 'mix'

export interface Coordinates {
  lat: number
  lon: number
}

export interface Brewery {
  slug: string
  label: string
}

export interface OpeningHour {
  area: string
  /** ISO-8601: 1 = Montag … 7 = Sonntag. */
  weekday: number
  isClosed: boolean
  opensAt: number | null
  closesAt: number | null
  weatherDependent: boolean
  verifiedAt: string | null
}

export interface BeerPrice {
  /** hell, weizen, alkoholfrei, radler, dunkel — die Liste wächst ohne Migration. */
  kind: string
  /** Ausschankgröße in Millilitern: 500 für die Halbe, 1000 für die Maß. */
  sizeMl: number
  /** In Cent. Geld gehört nicht in eine Gleitkommazahl. */
  cents: number
  sourceUrl: string | null
  verifiedAt: string | null
}

export interface Garden extends Coordinates {
  slug: string
  name: string
  district: string | null
  /** null heißt "nicht sicher verifiziert", nicht "keine Brauerei". */
  brewery: Brewery | null
  seats: number | null
  tags: string[]
  selfService: boolean | null
  ownFoodAllowed: boolean | null
  stationWalkMin: number | null
  charm: number | null
  /** Beide optional. null heißt: es gilt die globale Grenze aus `stay.ts`. */
  minStayMinutes: number | null
  maxStayMinutes: number | null
  zone: 'city' | 'umland'
  caveat: string | null
  description: string | null
  openingHours: OpeningHour[]
  beerPrices: BeerPrice[]
}

export interface StartPoint extends Coordinates {
  name: string
}

/** Etwas, von dem aus oder zu dem hin gerechnet wird. */
export type Waypoint = Coordinates & { stationWalkMin?: number | null }

export interface TravelTimes {
  walk: number
  bike: number
  transit: number
  km: number
}

export interface Leg extends TravelTimes {
  mode: Mode
  /** Die Minuten im gewählten Modus. */
  min: number
  /** Ob die Etappe im gewählten Modus unter dem Limit bleibt. */
  feasible: boolean
}

export interface Filters {
  /** Charakter-Tags. Alle müssen zutreffen, nicht irgendeiner. */
  tags: string[]
  breweries: string[]
  selfServiceOnly: boolean
  ownFoodOnly: boolean
  unvisitedOnly: boolean
  cityOnly: boolean
  /**
   * Im Verzeichnis: nur Gärten am Wasser. Im Generator: mindestens einer
   * pro Tour. Bewusst zwei verschiedene Bedeutungen für denselben Schalter —
   * so war es im Prototyp und so ergibt es für den Nutzer Sinn.
   */
  waterRequired: boolean
}

export interface PlannerOptions {
  start: StartPoint
  startMinutes: number
  budgetMinutes: number
  stops: number
  mode: PlanningMode
  maxLegMinutes: number
  weekday: number
  filters: Filters
  visited: ReadonlySet<string>
  sunsetMinutes: number
}

export interface Route {
  slugs: string[]
  legs: Leg[]
  back: Leg
  /**
   * Aufenthalt je Station in Minuten, gleiche Reihenfolge wie `slugs`.
   *
   * Nicht eine Zahl für alle: Gärten können eigene Grenzen haben, und in
   * einem 250-Plätze-Bräustüberl sitzt niemand zweieinhalb Stunden.
   */
  stays: number[]
  end: number
  travel: number
  score: number
  walk: number
}
