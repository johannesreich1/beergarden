import { candidates } from './garden'
import { openingWindow } from './hours'
import { buildSchedule } from './schedule'
import type { Plan } from './schedule'
import { MIN_STAY_MINUTES, stayAt } from './stay'
import { planLeg } from './travel'
import type { Garden, Leg, Mode, PlannerOptions, StartPoint } from './types'

/**
 * Planning by hand: the user picks the next stop instead of the generator.
 *
 * This file computes, it does not decide. Every garden the filters allow comes
 * back — with the time you would arrive and, where it does not work, the reason
 * why. Filtering here would be the wrong place for it: with a fixed end time
 * the caller locks everything that does not fit, in the flexible mode it only
 * marks it. One rule, two presentations — so the rule stays out of the
 * computation.
 */

export type CandidateReason = 'ok' | 'closed' | 'too-early' | 'too-late' | 'over-budget'

export interface Candidate {
  garden: Garden
  /** Travel time from the last chosen stop, or from the start point. */
  legMinutes: number
  legMode: Mode
  /** Minutes since midnight, like everything else in the core. */
  arrival: number
  /** Arrival plus the minimum stay: the earliest you could move on. */
  earliestLeave: number
  /** Whether the stop still fits the time window. Informative — see above. */
  fits: boolean
  reason: CandidateReason
}

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]

/**
 * The gardens the filters allow, no matter what today's hours say.
 *
 * `candidates()` tests filters and opening hours in one go; here the two have
 * to come apart. A garden closed today belongs on the map — greyed out, with a
 * reason — while one the filters exclude does not belong there at all. Asking
 * `candidates()` once per weekday keeps the filter rules in the single place
 * they are written down. A garden that is open on no day at all drops out, and
 * rightly so: about that one there is nothing to say.
 */
function allowedByFilters(gardens: Garden[], options: PlannerOptions): Set<string> {
  const allowed = new Set<string>()

  for (const weekday of WEEKDAYS) {
    for (const garden of candidates(gardens, options.filters, options.visited, weekday)) {
      allowed.add(garden.slug)
    }
  }

  return allowed
}

/**
 * Where the next leg starts and when you leave there.
 *
 * The clock is `buildSchedule`'s job. It already adds up legs and stays for a
 * chosen tour, and a second implementation of the same arithmetic would drift
 * away from the first one — the timeline would then show a different departure
 * than the map assumes.
 */
function departure(
  gardens: Garden[],
  chosen: string[],
  options: PlannerOptions,
  stays: Record<string, number>,
): { from: StartPoint | Garden; departAt: number } {
  const bySlug = new Map(gardens.map((garden) => [garden.slug, garden]))

  // A slug without a garden is a stale pick out of localStorage. Skipping it
  // beats refusing to plan the rest of the evening.
  const picked = chosen
    .map((slug) => bySlug.get(slug))
    .filter((garden): garden is Garden => garden !== undefined)

  if (!picked.length) return { from: options.start, departAt: options.startMinutes }

  const last = picked[picked.length - 1]!

  const plan: Plan = {
    slugs: picked.map((garden) => garden.slug),
    legs: picked.map((garden, index) =>
      planLeg(index ? picked[index - 1]! : options.start, garden, options.mode, options.maxLegMinutes),
    ),
    back: planLeg(last, options.start, options.mode, options.maxLegMinutes),
    // The fallback for a stop the user has not set a stay for. Its own minimum,
    // not a flat 45 — a garden may carry tighter bounds.
    stays: picked.map((garden) => stayAt(garden, MIN_STAY_MINUTES)),
  }

  // Non-null: the slugs all resolve, nothing is skipped, so at least one row
  // comes back.
  const schedule = buildSchedule(plan, gardens, {
    start: options.start,
    startMinutes: options.startMinutes,
    mode: options.mode,
    maxLegMinutes: options.maxLegMinutes,
    skipped: new Set<string>(),
    durations: stays,
    lastStop: null,
  })!

  const lastRow = schedule.rows[schedule.rows.length - 1]!

  return { from: lastRow.garden, departAt: lastRow.depart }
}

function reasonFor(
  garden: Garden,
  leg: Leg,
  arrival: number,
  earliestLeave: number,
  options: PlannerOptions,
): CandidateReason {
  const window = openingWindow(garden, options.weekday)

  if (!window) return 'closed'
  if (arrival < window.opensAt) return 'too-early'
  // Same rule as in the generator: arriving is not enough, the minimum stay has
  // to fit before closing time.
  if (earliestLeave > window.closesAt) return 'too-late'
  // Too far for the chosen mode. No reason of its own — for the user it is the
  // same answer: this stop does not fit into the evening.
  if (!leg.feasible) return 'over-budget'

  // The budget covers the way home as well, exactly as it does in the
  // generator. A stop you can reach but not get back from is not a stop.
  const back = planLeg(garden, options.start, options.mode, options.maxLegMinutes)
  if (earliestLeave + back.min > options.startMinutes + options.budgetMinutes) return 'over-budget'

  return 'ok'
}

export function nextStops(
  gardens: Garden[],
  chosen: string[],
  options: PlannerOptions,
  stays: Record<string, number>,
): Candidate[] {
  const allowed = allowedByFilters(gardens, options)
  const taken = new Set(chosen)
  const { from, departAt } = departure(gardens, chosen, options, stays)

  const result: Candidate[] = []

  for (const garden of gardens) {
    if (taken.has(garden.slug) || !allowed.has(garden.slug)) continue

    const leg = planLeg(from, garden, options.mode, options.maxLegMinutes)
    const arrival = departAt + leg.min
    // The minimum, not the stay the user may have set: `earliestLeave` answers
    // "how early could I move on", not "how long do I want to sit".
    const earliestLeave = arrival + stayAt(garden, MIN_STAY_MINUTES)
    const reason = reasonFor(garden, leg, arrival, earliestLeave, options)

    result.push({
      garden,
      legMinutes: leg.min,
      legMode: leg.mode,
      arrival,
      earliestLeave,
      fits: reason === 'ok',
      reason,
    })
  }

  // Nearest first. That is the order the map suggests anyway, and the one the
  // user is asking about when they wonder where to go next.
  return result.sort((a, b) => a.legMinutes - b.legMinutes)
}
