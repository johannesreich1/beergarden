import { brewerySlug, isOnWater } from './garden'
import type { Garden } from './types'

/**
 * The ranking weights. Named constants rather than numbers inside the
 * expression on purpose — this is the one place where anyone can read off the
 * planner's editorial stance.
 */
const WEIGHTS = {
  /** Editorial judgement 1–5, times ten. The strongest single factor. */
  charm: 10,
  /** Being under way is a loss. */
  travelMinute: -0.75,
  /** Sitting is a gain, but weaker than travelling hurts. */
  sitMinute: 0.16,
  /** Three different breweries make a better afternoon than Augustiner three times. */
  distinctBrewery: 5,
  anyWater: 10,
  /** Last stop on the water or with a view, as the sun goes down. */
  sunsetFinale: 14,
  /** You have been there. Pulls hard, but forbids nothing. */
  visited: -22,
  /** The last stop should not carry a caveat. */
  caveatOnLast: -6,
} as const

/** How long before sunset the finale still counts. */
const SUNSET_WINDOW_MIN = 30

export interface ScoreInput {
  gardens: Garden[]
  travelMinutes: number
  sitMinutesEach: number
  /** Departure from the last stop. */
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
