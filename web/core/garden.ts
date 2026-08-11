import type { Filters, Garden } from './types'
import { isOpenOn } from './hours'

/**
 * Der Platzhalter für eine nicht verifizierte Brauerei.
 *
 * In der API ist `brewery` schlicht null. Fürs Filtern und Gruppieren braucht
 * es aber einen Schlüssel, sonst fallen die neun unverifizierten Gärten aus
 * jeder Auswahl heraus, statt als eigene Gruppe auffindbar zu sein.
 */
export const UNKNOWN_BREWERY = 'ka'

export const brewerySlug = (garden: Garden): string => garden.brewery?.slug ?? UNKNOWN_BREWERY

export const isOnWater = (garden: Garden): boolean => garden.tags.includes('wasser')

export function matchesFilters(
  garden: Garden,
  filters: Filters,
  visited: ReadonlySet<string>,
): boolean {
  // Charakter-Tags sind eine Und-Verknüpfung: wer "Wald" und "Wasser" wählt,
  // will beides an einem Ort, nicht das eine oder das andere.
  if (filters.tags.length && !filters.tags.every((tag) => garden.tags.includes(tag))) return false

  if (filters.breweries.length && !filters.breweries.includes(brewerySlug(garden))) return false
  if (filters.selfServiceOnly && !garden.selfService) return false
  if (filters.ownFoodOnly && !garden.ownFoodAllowed) return false
  if (filters.unvisitedOnly && visited.has(garden.slug)) return false
  if (filters.cityOnly && garden.zone === 'umland') return false

  return true
}

/**
 * Fürs Verzeichnis: hier heißt "am Wasser" wirklich dieser eine Garten.
 * Im Generator heißt derselbe Schalter "irgendeiner auf der Tour".
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

/** Die Gärten, aus denen der Generator überhaupt wählen darf. */
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
