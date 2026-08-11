import type { BeerPrice, Garden, OpeningHour, StartPoint } from '#core'
import { parseClock } from '#core'

/**
 * Die Antwortform der Laravel-API — snake_case, Uhrzeiten als Text.
 *
 * Die Umrechnung in den Kern-Typ passiert genau hier und sonst nirgends. Damit
 * kennt der Kern weder die API noch ihre Schreibweise, und ein Feldwechsel im
 * Backend ist eine Änderung an einer Stelle.
 */

interface ApiOpeningHour {
  area: string
  weekday: number
  is_closed: boolean
  opens_at: string | null
  closes_at: string | null
  weather_dependent: boolean
  verified_at: string | null
}

interface ApiBeerPrice {
  kind: string
  size_ml: number
  cents: number
  source_url: string | null
  verified_at: string | null
}

interface ApiGarden {
  slug: string
  name: string
  district: string | null
  brewery: { slug: string, label: string } | null
  seats: number | null
  tags: string[]
  self_service: boolean | null
  own_food_allowed: boolean | null
  station_walk_min: number | null
  charm: number | null
  min_stay_minutes: number | null
  max_stay_minutes: number | null
  lat: number
  lon: number
  zone: 'city' | 'umland'
  caveat: string | null
  description: string | null
  opening_hours: ApiOpeningHour[]
  beer_prices: ApiBeerPrice[]
}

interface ApiStartPoint {
  name: string
  lat: number
  lon: number
}

const toOpeningHour = (raw: ApiOpeningHour): OpeningHour => ({
  area: raw.area,
  weekday: raw.weekday,
  isClosed: raw.is_closed,
  // "24:30" bleibt 1470. Der Kern rechnet in Minuten seit Mitternacht, damit
  // eine Sperrstunde nach Mitternacht größer bleibt als die Öffnungszeit.
  opensAt: raw.opens_at === null ? null : parseClock(raw.opens_at),
  closesAt: raw.closes_at === null ? null : parseClock(raw.closes_at),
  weatherDependent: raw.weather_dependent,
  verifiedAt: raw.verified_at,
})

const toBeerPrice = (raw: ApiBeerPrice): BeerPrice => ({
  kind: raw.kind,
  sizeMl: raw.size_ml,
  cents: raw.cents,
  sourceUrl: raw.source_url,
  verifiedAt: raw.verified_at,
})

const toGarden = (raw: ApiGarden): Garden => ({
  slug: raw.slug,
  name: raw.name,
  district: raw.district,
  brewery: raw.brewery,
  seats: raw.seats,
  tags: raw.tags,
  selfService: raw.self_service,
  ownFoodAllowed: raw.own_food_allowed,
  stationWalkMin: raw.station_walk_min,
  charm: raw.charm,
  minStayMinutes: raw.min_stay_minutes,
  maxStayMinutes: raw.max_stay_minutes,
  lat: raw.lat,
  lon: raw.lon,
  zone: raw.zone,
  caveat: raw.caveat,
  description: raw.description,
  openingHours: raw.opening_hours.map(toOpeningHour),
  beerPrices: (raw.beer_prices ?? []).map(toBeerPrice),
})

export function useGardens() {
  return useFetch('/api/gardens', {
    key: 'gardens',
    transform: (payload: { data: ApiGarden[] }) => payload.data.map(toGarden),
    default: (): Garden[] => [],
  })
}

export function useStartPoints() {
  return useFetch('/api/start-points', {
    key: 'start-points',
    transform: (payload: { data: ApiStartPoint[] }) =>
      payload.data.map((raw): StartPoint => ({ name: raw.name, lat: raw.lat, lon: raw.lon })),
    default: (): StartPoint[] => [],
  })
}
