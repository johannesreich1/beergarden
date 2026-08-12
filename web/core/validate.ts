import { gardensBySlug } from './garden'
import { openingWindow, windowProblem } from './hours'
import type { WindowProblem } from './hours'
import type { Plan } from './schedule'
import { planLeg } from './travel'
import type { Garden, PlannerOptions, StartPoint } from './types'

/**
 * Does a chosen tour still hold?
 *
 * The generator checks opening hours when it creates a tour. After that the
 * user keeps turning dials: a different start time, a different weekday, a
 * longer stay, a skipped stop. Any of these can break the tour without it
 * being regenerated — and a tour that is silently wrong is worse than none.
 *
 * This function reruns the chosen tour against the *current* settings and
 * reports the first place where it fails. Legs are recomputed rather than
 * taken from the plan: changing the mode of travel changes the times.
 */

/**
 * The window failures come from the shared predicate; this union only adds
 * what the validator can see that a single window cannot.
 */
export type PlanProblemKind =
  | WindowProblem
  /** The garden is no longer in the data set. */
  | 'missing'
  /** The tour no longer fits the time budget. */
  | 'over-budget'

export interface PlanProblem {
  kind: PlanProblemKind
  /** The garden it fails at. For 'over-budget', the last one. */
  slug: string
  /** Arrival there under the current plan. */
  arrival: number
  /** For 'too-early' and 'too-late': the window that does not fit. */
  opensAt?: number
  closesAt?: number
  /** For 'over-budget': how long the tour actually takes. */
  totalMinutes?: number
}

export function checkPlan(
  plan: Plan,
  gardens: Garden[],
  options: PlannerOptions,
  /** Overridden stays. Those can break a tour too. */
  stayOverrides: Readonly<Record<string, number>> = {},
): PlanProblem | null {
  const bySlug = gardensBySlug(gardens)
  const stops = plan.slugs.map((slug) => bySlug.get(slug))

  const missing = stops.findIndex((garden) => garden === undefined)
  if (missing >= 0) {
    return { kind: 'missing', slug: plan.slugs[missing]!, arrival: options.startMinutes }
  }

  let clock = options.startMinutes
  let previous: StartPoint | Garden = options.start

  for (const [index, garden] of (stops as Garden[]).entries()) {
    clock += planLeg(previous, garden, options.mode, options.maxLegMinutes).min
    const arrival = clock

    // Stays mirror slugs index for index — the plan's own shape.
    const stay = stayOverrides[garden.slug] ?? plan.stays[index]!

    const window = openingWindow(garden, options.weekday)
    const problem = windowProblem(window, arrival, stay)
    if (problem) {
      return { kind: problem, slug: garden.slug, arrival, ...window }
    }

    clock += stay
    previous = garden
  }

  const back = planLeg(previous, options.start, options.mode, options.maxLegMinutes)
  const totalMinutes = clock + back.min - options.startMinutes

  if (totalMinutes > options.budgetMinutes) {
    return {
      kind: 'over-budget',
      slug: plan.slugs[plan.slugs.length - 1]!,
      arrival: clock,
      totalMinutes,
    }
  }

  return null
}
