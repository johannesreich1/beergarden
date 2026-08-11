import { brewerySlug, isOnWater } from './garden'
import type { Garden } from './types'

/**
 * Die Gewichte des Rankings. Bewusst als benannte Konstanten und nicht als
 * Zahlen im Ausdruck — das ist die einzige Stelle, an der jemand die
 * redaktionelle Haltung des Planers ablesen kann.
 */
export const WEIGHTS = {
  /** Redaktionelle Einschätzung 1–5, mal zehn. Der stärkste Einzelfaktor. */
  charm: 10,
  /** Unterwegs sein ist Verlust. */
  travelMinute: -0.75,
  /** Sitzen ist Gewinn, aber schwächer als Fahren wehtut. */
  sitMinute: 0.16,
  /** Drei verschiedene Brauereien sind ein besserer Nachmittag als dreimal Augustiner. */
  distinctBrewery: 5,
  anyWater: 10,
  /** Letzte Station am Wasser oder mit Aussicht, wenn die Sonne untergeht. */
  sunsetFinale: 14,
  /** Kennst du schon. Zieht deutlich, verbietet aber nichts. */
  visited: -22,
  /** Die letzte Station sollte keine Einschränkung haben. */
  caveatOnLast: -6,
} as const

/** Wie früh vor Sonnenuntergang das Finale zählt. */
const SUNSET_WINDOW_MIN = 30

export interface ScoreInput {
  gardens: Garden[]
  travelMinutes: number
  sitMinutesEach: number
  /** Abfahrt von der letzten Station. */
  departureFromLast: number
  sunsetMinutes: number
  visited: ReadonlySet<string>
}

export function scoreRoute(input: ScoreInput): number {
  const { gardens, travelMinutes, sitMinutesEach, departureFromLast, sunsetMinutes, visited } = input
  const last = gardens[gardens.length - 1]

  let score = 0

  for (const garden of gardens) {
    score += (garden.charm ?? 0) * WEIGHTS.charm
    if (visited.has(garden.slug)) score += WEIGHTS.visited
  }

  score += travelMinutes * WEIGHTS.travelMinute
  score += sitMinutesEach * WEIGHTS.sitMinute
  score += new Set(gardens.map(brewerySlug)).size * WEIGHTS.distinctBrewery

  if (gardens.some(isOnWater)) score += WEIGHTS.anyWater

  const endsInGoldenHour =
    departureFromLast > sunsetMinutes - SUNSET_WINDOW_MIN &&
    (isOnWater(last) || last.tags.includes('aussicht'))

  if (endsInGoldenHour) score += WEIGHTS.sunsetFinale
  if (last.caveat) score += WEIGHTS.caveatOnLast

  return score
}
