import type { Garden, OpeningHour } from './types'

/**
 * The self-service beer garden. A restaurant and the self-service area on the
 * same premises keep different hours — which is why `area` is part of the key
 * and not optional.
 */
const GARDEN_AREA = 'garden'

export interface OpeningWindow {
  opensAt: number
  closesAt: number
}

export function hoursFor(
  garden: Garden,
  weekday: number,
  area: string = GARDEN_AREA,
): OpeningHour | undefined {
  return garden.openingHours.find((h) => h.weekday === weekday && h.area === area)
}

/**
 * The window for a weekday, or null when closed.
 *
 * null is the honest answer to three different cases here: closing day, no
 * entry, entry without times. The caller need not tell them apart — it only
 * wants to know whether it can plan.
 */
export function openingWindow(
  garden: Garden,
  weekday: number,
  area: string = GARDEN_AREA,
): OpeningWindow | null {
  const hours = hoursFor(garden, weekday, area)

  if (!hours || hours.isClosed || hours.opensAt === null || hours.closesAt === null) {
    return null
  }

  return { opensAt: hours.opensAt, closesAt: hours.closesAt }
}

export function isOpenOn(garden: Garden, weekday: number, area: string = GARDEN_AREA): boolean {
  return openingWindow(garden, weekday, area) !== null
}

/** The ways a stay can fail against a window. Shared by everything that asks. */
export type WindowProblem = 'closed' | 'too-early' | 'too-late'

/**
 * Does a stay of this length, arriving then, fit the window?
 *
 * The one predicate behind three decisions: the generator prunes on it, the
 * validator reports it, the manual planner explains candidates with it. It
 * used to be written out three times — and a rule corrected in one place and
 * not the other two is how a tour passes validation the generator would have
 * refused.
 */
export function windowProblem(
  window: OpeningWindow | null,
  arrival: number,
  stay: number,
): WindowProblem | null {
  if (!window) return 'closed'
  if (arrival < window.opensAt) return 'too-early'
  if (arrival + stay > window.closesAt) return 'too-late'

  return null
}

/**
 * Whether a verified source is on file for this day at all.
 * As long as this is true nowhere, the UI owes the reader a ≈.
 */
export function isVerified(garden: Garden, weekday: number, area: string = GARDEN_AREA): boolean {
  // The ?? matters: with no row at all, `undefined !== null` would report a
  // day we know nothing about as verified — the exact opposite of the truth.
  return (hoursFor(garden, weekday, area)?.verifiedAt ?? null) !== null
}
