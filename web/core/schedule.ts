import { gardensBySlug, gardensFor } from './garden'
import { planLeg, travelTimes } from './travel'
import { stayAt } from './stay'
import type { Garden, Leg, Mode, PlannerOptions, PlanningMode, Route, StartPoint, Waypoint } from './types'

/**
 * The schedule of a chosen tour, after the user has adjusted it.
 *
 * The generator delivers a suggestion. After that you may skip stops, change
 * how long you stay and finish early. This function works out what comes of
 * that — without regenerating, because the chosen tour should stay the chosen
 * tour.
 */

export interface Plan {
  slugs: string[]
  legs: Pick<Leg, 'min' | 'mode' | 'km'>[]
  back: Pick<Leg, 'min' | 'mode' | 'km'>
  /** Stay per stop, same order as `slugs`. */
  stays: number[]
}

export interface ScheduleOptions {
  start: StartPoint
  startMinutes: number
  mode: PlanningMode
  maxLegMinutes: number
  skipped: ReadonlySet<string>
  /** Overridden stay per garden. */
  stayOverrides: Readonly<Record<string, number>>
  /** Finish here; the rest of the tour is dropped. */
  lastStop: string | null
}

export interface ScheduleRow {
  garden: Garden
  from: StartPoint | Garden
  legMinutes: number
  legMode: Mode
  arrive: number
  depart: number
  duration: number
  isLast: boolean
}

export interface Schedule {
  rows: ScheduleRow[]
  back: Leg
  end: number
  /** Whether the user has changed the tour. */
  modified: boolean
}

export function planFromRoute(route: Route): Plan {
  return {
    slugs: [...route.slugs],
    legs: route.legs.map(({ min, mode, km }) => ({ min, mode, km })),
    back: { min: route.back.min, mode: route.back.mode, km: route.back.km },
    stays: [...route.stays],
  }
}

/**
 * A mode chosen by hand for a single leg.
 *
 * Keyed by where the leg goes — the destination's slug, or `back` for the way
 * home. Not by index: a stop removed in the middle would silently hand its
 * choice to whoever took its place.
 */
export const BACK_LEG = 'back'

/**
 * One identity for a tour: its set of stops, regardless of order. The same
 * three gardens in reverse are the same evening to the user — this used to be
 * computed in three places under three names.
 */
export const tourKey = (slugs: readonly string[]): string => [...slugs].sort().join('|')

/**
 * A plan from a hand-picked list of stops.
 *
 * The counterpart to `planFromRoute`: the generator already knows the legs it
 * chose, a person picking on a map does not. Everything else about the plan is
 * identical, and it has to be — a hand-picked tour runs through the same
 * schedule, the same validation and the same controls as a proposed one. Two
 * shapes of plan would mean two of each.
 */
export function planFromSlugs(
  slugs: string[],
  gardens: Garden[],
  options: Pick<PlannerOptions, 'start' | 'mode' | 'maxLegMinutes'>,
  stays: Record<string, number>,
  legModes: Record<string, Mode> = {},
): Plan | null {
  // A stale slug is dropped, not fatal. This differs from `buildSchedule`
  // (whole plan void) and `checkPlan` ('missing') on purpose: those judge a
  // finished plan, where one ghost stop falsifies the times of every other.
  // Here somebody is mid-picking, and a pick that vanished from the data must
  // not veto the stops that still exist.
  const stops = gardensFor(slugs, gardens)

  if (!stops.length) return null

  /**
   * A hand-picked mode wins over the model's choice.
   *
   * The times come from the same table either way — overriding only decides
   * which of the three counts. That keeps one source for the numbers: nothing
   * here computes a duration of its own.
   */
  const legFor = (a: Waypoint, b: Waypoint, key: string): Leg => {
    const chosen = legModes[key]
    const leg = planLeg(a, b, options.mode, options.maxLegMinutes)
    if (!chosen) return leg

    // Same table, different pick: only which of the three counts changes.
    return { ...leg, min: travelTimes(a, b)[chosen], mode: chosen }
  }

  let previous: Waypoint = options.start
  const legs = stops.map((garden) => {
    const leg = legFor(previous, garden, garden.slug)
    previous = garden

    return { min: leg.min, mode: leg.mode, km: leg.km }
  })

  const back = legFor(previous, options.start, BACK_LEG)

  return {
    slugs: stops.map((garden) => garden.slug),
    legs,
    back: { min: back.min, mode: back.mode, km: back.km },
    stays: stops.map((garden) => stayAt(garden, stays[garden.slug] ?? DEFAULT_MANUAL_STAY)),
  }
}

/**
 * What a hand-picked stop starts with. Ninety minutes is a Maß and a Brotzeit
 * without hurrying; the generator divides a budget, picking by hand has none to
 * divide. `stayAt` still clamps it to the garden's own bounds.
 *
 * Exported because the timeline's fallback must be this number, not a copy of
 * it — a hardcoded 90 in the UI is how the two drift apart.
 */
export const DEFAULT_MANUAL_STAY = 90

export function buildSchedule(
  plan: Plan,
  gardens: Garden[],
  options: ScheduleOptions,
): Schedule | null {
  const bySlug = gardensBySlug(gardens)
  const planned = plan.slugs.map((slug) => bySlug.get(slug))

  // Can happen when a stored plan points at a garden that has since been
  // removed. Then the whole plan is void, not just one stop.
  if (planned.some((garden) => garden === undefined)) return null

  const active: { garden: Garden; legMinutes: number; legMode: Mode; stay: number }[] = []
  let carried = 0

  // The `!` on each index is the plan's own shape: slugs, legs and stays are
  // three views of the same list, so an index valid for one holds for all.
  for (const [index, garden] of (planned as Garden[]).entries()) {
    if (options.skipped.has(garden.slug)) {
      carried += plan.legs[index]!.min
      continue
    }

    active.push({
      garden,
      stay: plan.stays[index]!,
      legMinutes: plan.legs[index]!.min + carried,
      // A skipped stop makes the leg longer, and the originally chosen mode no
      // longer fits. Public transport is the conservative assumption: better to
      // overestimate than to leave the user walking in the rain.
      legMode: carried ? 'transit' : plan.legs[index]!.mode,
    })

    carried = 0
  }

  let cut = active.length - 1

  if (options.lastStop) {
    const index = active.findIndex((entry) => entry.garden.slug === options.lastStop)
    if (index >= 0) cut = index
  }

  let clock = options.startMinutes
  const rows: ScheduleRow[] = []

  for (let i = 0; i <= cut; i++) {
    const entry = active[i]!
    clock += entry.legMinutes
    const arrive = clock

    const duration = options.stayOverrides[entry.garden.slug] ?? entry.stay
    clock += duration

    rows.push({
      garden: entry.garden,
      from: i === 0 ? options.start : active[i - 1]!.garden,
      legMinutes: entry.legMinutes,
      legMode: entry.legMode,
      arrive,
      depart: clock,
      duration,
      isLast: i === cut,
    })
  }

  if (!rows.length) return null

  const back = planLeg(rows[rows.length - 1]!.garden, options.start, options.mode, options.maxLegMinutes)

  return {
    rows,
    back,
    end: clock + back.min,
    modified: active.length < planned.length || cut < active.length - 1,
  }
}
