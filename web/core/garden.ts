import type { BeerPrice, Filters, Garden } from './types'
import { isOpenOn } from './hours'

/**
 * The placeholder for an unverified brewery.
 *
 * In the API `brewery` is simply null. Filtering and grouping need a key
 * though, otherwise the nine unverified gardens drop out of every selection
 * instead of being findable as a group of their own.
 */
export const UNKNOWN_BREWERY = 'ka'

export const brewerySlug = (garden: Garden): string => garden.brewery?.slug ?? UNKNOWN_BREWERY

/** The Maß. That is what people mean when they ask for "the beer price". */
export const MASS_ML = 1000
/** Helles is the reference price. The other kinds live in the detail view. */
export const REFERENCE_KIND = 'hell'

export const priceFor = (garden: Garden, kind: string, sizeMl: number): BeerPrice | undefined =>
  garden.beerPrices.find((price) => price.kind === kind && price.sizeMl === sizeMl)

/** The single price that fits in a list. Everything else belongs in the detail view. */
export const massPrice = (garden: Garden): BeerPrice | undefined =>
  priceFor(garden, REFERENCE_KIND, MASS_ML)

/**
 * The tag vocabulary of the dataset.
 *
 * Tags are data, and the data speaks German — that stays. What must not
 * happen is code comparing against a loose 'wasser' in five places: which
 * slug means what is stated here, once, and everything else refers to it.
 */
export const TAGS = {
  water: 'wasser',
  forest: 'wald',
  city: 'stadt',
  view: 'aussicht',
  cellar: 'keller',
  playground: 'spielplatz',
  music: 'musik',
} as const

export const isOnWater = (garden: Garden): boolean => garden.tags.includes(TAGS.water)

/**
 * "ein Biergarten" or "17 Biergärten".
 *
 * Lives here because both callers need the same rule: the generator for its
 * refusal and the UI for its counter. Two phrasings for the same number would
 * be two opportunities to write "1 Biergärten".
 */
export const countGardens = (count: number): string =>
  count === 1 ? 'ein Biergarten' : `${count} Biergärten`

function matchesFilters(
  garden: Garden,
  filters: Filters,
  visited: ReadonlySet<string>,
): boolean {
  // Character tags are an AND: someone picking "Wald" and "Wasser" wants both
  // in one place, not one or the other.
  if (filters.tags.length && !filters.tags.every((tag) => garden.tags.includes(tag))) return false

  if (filters.breweries.length && !filters.breweries.includes(brewerySlug(garden))) return false
  if (filters.selfServiceOnly && !garden.selfService) return false
  if (filters.ownFoodOnly && !garden.ownFoodAllowed) return false
  if (filters.unvisitedOnly && visited.has(garden.slug)) return false
  if (filters.cityOnly && garden.zone === 'umland') return false

  return true
}

/**
 * For the directory: here "on the water" really means this one garden.
 * In the generator the same switch means "any one on the tour".
 */
export function matchesDirectoryFilters(
  garden: Garden,
  filters: Filters,
  visited: ReadonlySet<string>,
): boolean {
  if (!matchesFilters(garden, filters, visited)) return false
  if (filters.waterRequired && !isOnWater(garden)) return false

  return true
}

/** The gardens the generator is allowed to choose from at all. */
export function candidates(
  gardens: Garden[],
  filters: Filters,
  visited: ReadonlySet<string>,
  weekday: number,
): Garden[] {
  return gardens.filter(
    (garden) => isOpenOn(garden, weekday) && matchesFilters(garden, filters, visited),
  )
}
