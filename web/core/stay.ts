import type { Garden } from './types'

/**
 * How long you stay.
 *
 * The rule lives here and only here — generator, schedule and validation all
 * ask the same function. Otherwise the three drift apart and the planner
 * promises a sitting time the timeline does not keep.
 */

/** Under three quarters of an hour it is not a beer garden visit. */
export const MIN_STAY_MINUTES = 45
/** Beyond that a tour turns into staying put. */
const MAX_STAY_MINUTES = 150
/** Round stays to five minutes. Anything finer fakes precision. */
const STAY_ROUNDING = 5

/**
 * The stay at this garden: the suggestion, clamped into its bounds.
 *
 * Both bounds are optional. Where none is recorded the global one applies — a
 * guessed value would be worse than none, and a garden without surveyed
 * bounds should behave exactly as before.
 */
export function stayAt(garden: Garden, suggested: number): number {
  const min = garden.minStayMinutes ?? MIN_STAY_MINUTES
  const max = garden.maxStayMinutes ?? MAX_STAY_MINUTES

  return Math.min(Math.max(suggested, min), max)
}

/** The suggestion before clamping: available sitting time spread across the stops. */
export const suggestStay = (sitTotal: number, stops: number): number =>
  Math.floor(sitTotal / stops / STAY_ROUNDING) * STAY_ROUNDING
