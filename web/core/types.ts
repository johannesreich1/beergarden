/**
 * The core's types.
 *
 * Times are always minutes since midnight, without exception. Closing at half
 * past midnight is 1470, not 30 — otherwise every comparison across midnight
 * is wrong. Same convention as the database, where MariaDB holds TIME beyond
 * 24 hours for this.
 */

export type Mode = 'walk' | 'bike' | 'transit'

/** What the user picks. 'mix' leaves the per-leg choice to the model. */
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
  /** ISO-8601: 1 = Monday … 7 = Sunday. */
  weekday: number
  isClosed: boolean
  opensAt: number | null
  closesAt: number | null
  weatherDependent: boolean
  verifiedAt: string | null
}

export interface BeerPrice {
  /** hell, weizen, alkoholfrei, radler, dunkel — the list grows without a migration. */
  kind: string
  /** Serving size in millilitres: 500 for a Halbe, 1000 for a Maß. */
  sizeMl: number
  /** In cents. Money does not belong in a floating point number. */
  cents: number
  sourceUrl: string | null
  verifiedAt: string | null
}

export interface Garden extends Coordinates {
  slug: string
  name: string
  district: string | null
  /** null means "not reliably verified", not "no brewery". */
  brewery: Brewery | null
  seats: number | null
  tags: string[]
  selfService: boolean | null
  ownFoodAllowed: boolean | null
  stationWalkMin: number | null
  charm: number | null
  /** Both optional. null means the global bound from `stay.ts` applies. */
  minStayMinutes: number | null
  maxStayMinutes: number | null
  zone: 'city' | 'umland'
  caveat: string | null
  description: string | null
  /** null means: no licensed image yet. */
  imageUrl: string | null
  /** Required as soon as `imageUrl` is set. */
  imageCredit: string | null
  imageSourceUrl: string | null
  openingHours: OpeningHour[]
  beerPrices: BeerPrice[]
}

export interface StartPoint extends Coordinates {
  name: string
}

/** Anything we compute a journey from or to. */
export type Waypoint = Coordinates & { stationWalkMin?: number | null }

export interface TravelTimes {
  walk: number
  bike: number
  transit: number
  km: number
}

export interface Leg extends TravelTimes {
  mode: Mode
  /** Minutes in the chosen mode. */
  min: number
  /** Whether the leg stays under the limit in the chosen mode. */
  feasible: boolean
}

export interface Filters {
  /** Character tags. All must match, not any one of them. */
  tags: string[]
  breweries: string[]
  selfServiceOnly: boolean
  ownFoodOnly: boolean
  unvisitedOnly: boolean
  cityOnly: boolean
  /**
   * In the directory: only gardens on the water. In the generator: at least
   * one per tour. Deliberately two meanings for the same switch — that is how
   * the prototype behaved and how it makes sense to the user.
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
   * Stay per stop in minutes, same order as `slugs`.
   *
   * Not one number for all of them: gardens can carry their own bounds, and
   * nobody spends two and a half hours in a 250-seat Bräustüberl.
   */
  stays: number[]
  end: number
  travel: number
  score: number
  walk: number
}
