import { planLeg } from './travel'
import type { Garden, Leg, Mode, PlanningMode, Route, StartPoint } from './types'

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
  durations: Readonly<Record<string, number>>
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

export function buildSchedule(
  plan: Plan,
  gardens: Garden[],
  options: ScheduleOptions,
): Schedule | null {
  const bySlug = new Map(gardens.map((garden) => [garden.slug, garden]))
  const planned = plan.slugs.map((slug) => bySlug.get(slug))

  // Can happen when a stored plan points at a garden that has since been
  // removed. Then the whole plan is void, not just one stop.
  if (planned.some((garden) => garden === undefined)) return null

  const active: { garden: Garden; legMinutes: number; legMode: Mode; stay: number }[] = []
  let carried = 0

  for (const [index, garden] of (planned as Garden[]).entries()) {
    if (options.skipped.has(garden.slug)) {
      carried += plan.legs[index].min
      continue
    }

    active.push({
      garden,
      stay: plan.stays[index],
      legMinutes: plan.legs[index].min + carried,
      // A skipped stop makes the leg longer, and the originally chosen mode no
      // longer fits. Public transport is the conservative assumption: better to
      // overestimate than to leave the user walking in the rain.
      legMode: carried ? 'transit' : plan.legs[index].mode,
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
    const entry = active[i]
    clock += entry.legMinutes
    const arrive = clock

    const duration = options.durations[entry.garden.slug] ?? entry.stay
    clock += duration

    rows.push({
      garden: entry.garden,
      from: i === 0 ? options.start : active[i - 1].garden,
      legMinutes: entry.legMinutes,
      legMode: entry.legMode,
      arrive,
      depart: clock,
      duration,
      isLast: i === cut,
    })
  }

  if (!rows.length) return null

  const back = planLeg(rows[rows.length - 1].garden, options.start, options.mode, options.maxLegMinutes)

  return {
    rows,
    back,
    end: clock + back.min,
    modified: active.length < planned.length || cut < active.length - 1,
  }
}
