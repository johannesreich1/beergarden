import { candidates, isOnWater } from './garden'
import { tourKey } from './schedule'
import { openingWindow, windowProblem } from './hours'
import { LEG_UNCAPPED, planLeg } from './travel'
import { scoreRoute } from './scoring'
import { MIN_STAY_MINUTES, stayAt, suggestStay } from './stay'
import type { Garden, Leg, PlannerOptions, Route } from './types'

/**
 * The route generator.
 *
 * Depth-first search over paths of the requested length, with three shortcuts
 * that turn an exponential problem into an instant one:
 *
 *   - only the nearest neighbours per step instead of every candidate
 *   - only the gardens nearest to the start as a first stop
 *   - abort as soon as the remaining time falls below the minimum stay
 *
 * At 35 gardens none of this would be needed. At a few thousand it is the
 * difference between "runs on every slider drag" and "does not run".
 */

const NEIGHBOURS_PER_STEP = 14
const FIRST_STOP_CANDIDATES = 20
const MAX_SUGGESTIONS = 6

/**
 * Why there are no suggestions — as data, not as a sentence.
 *
 * The core used to build German prose here, complete with its own copy of the
 * mode labels in its own spelling. The words are the UI's job; the core states
 * what happened and hands over the numbers the sentence needs. It also lets
 * the message finally name the right dial: a tour that fails only on the
 * water wish used to blame time and mode instead.
 */
export type GenerateReason =
  /** Fewer matching gardens than requested stops. `count` may be zero. */
  | { kind: 'pool-too-small', count: number, stops: number }
  /** Routes existed, but none had a stop on the water. */
  | { kind: 'none-on-water' }
  /** Nothing fits the window. `maxLegMinutes` is null when no cap is set. */
  | { kind: 'no-route', budgetMinutes: number, mode: PlannerOptions['mode'], maxLegMinutes: number | null }

export interface GenerateResult {
  routes: Route[]
  /** null when there are suggestions. */
  reason: GenerateReason | null
}

export function generateRoutes(gardens: Garden[], options: PlannerOptions): GenerateResult {
  const { start, startMinutes, budgetMinutes, stops, mode, maxLegMinutes, weekday } = options
  const { filters, visited, sunsetMinutes } = options

  const pool = candidates(gardens, filters, visited, weekday)

  if (pool.length < stops) {
    return { routes: [], reason: { kind: 'pool-too-small', count: pool.length, stops } }
  }

  // Precompute the travel matrix once. Without it the depth-first search
  // recomputes the same distance a thousand times over.
  const fromStart = new Map<string, Leg>()
  const between = new Map<string, Leg>()

  for (const garden of pool) {
    fromStart.set(garden.slug, planLeg(start, garden, mode, maxLegMinutes))
  }
  for (const a of pool) {
    for (const b of pool) {
      if (a !== b) between.set(`${a.slug}>${b.slug}`, planLeg(a, b, mode, maxLegMinutes))
    }
  }

  const legFrom = (slug: string) => fromStart.get(slug)!
  const legBetween = (a: Garden, b: Garden) => between.get(`${a.slug}>${b.slug}`)!

  const nearest = (garden: Garden) =>
    pool
      .filter((other) => other !== garden)
      .sort((a, b) => legBetween(garden, a).min - legBetween(garden, b).min)
      .slice(0, NEIGHBOURS_PER_STEP)

  const firstStops = [...pool]
    .sort((a, b) => legFrom(a.slug).min - legFrom(b.slug).min)
    .slice(0, FIRST_STOP_CANDIDATES)

  const found: Route[] = []
  /** Complete tours that failed on nothing but the water wish. */
  let rejectedForWater = 0

  /** A complete path — check it, score it, keep it or drop it. */
  const collect = (path: Garden[], travelled: number): void => {
    const back = legFrom(path[path.length - 1]!.slug)
    if (!back.feasible) return

    const travelMinutes = travelled + back.min
    const sitTotal = budgetMinutes - travelMinutes
    if (sitTotal < stops * MIN_STAY_MINUTES) return

    // Spread evenly first, then clamp per garden into its bounds. Clamping
    // can push the total up — which is why the time budget is checked again
    // afterwards, not before.
    const suggested = suggestStay(sitTotal, stops)
    const stays = path.map((garden) => stayAt(garden, suggested))

    if (travelMinutes + stays.reduce((sum, stay) => sum + stay, 0) > budgetMinutes) return

    // Opening hours: you may not arrive before they unlock, nor so late that
    // the stay would run past closing time.
    let clock = startMinutes
    const legs: Leg[] = []

    // The `!` on each index states the loop's own invariant: `i` never
    // leaves the array, and `stays` was mapped from `path` one line up.
    for (let i = 0; i < path.length; i++) {
      const step = i === 0 ? legFrom(path[0]!.slug) : legBetween(path[i - 1]!, path[i]!)
      clock += step.min

      if (windowProblem(openingWindow(path[i]!, weekday), clock, stays[i]!)) return

      legs.push(step)
      clock += stays[i]!
    }

    if (filters.waterRequired && !path.some(isOnWater)) {
      rejectedForWater++
      return
    }

    found.push({
      slugs: path.map((garden) => garden.slug),
      legs,
      back,
      stays,
      end: clock + back.min,
      travel: travelMinutes,
      score: scoreRoute({
        gardens: path,
        travelMinutes,
        sitMinutesEach: Math.round(stays.reduce((sum, stay) => sum + stay, 0) / stays.length),
        departureFromLast: clock,
        sunsetMinutes,
        visited,
      }),
      walk:
        legs.reduce((sum, step) => sum + (step.mode === 'walk' ? step.min : 0), 0) +
        (back.mode === 'walk' ? back.min : 0),
    })
  }

  const extend = (path: Garden[], travelled: number): void => {
    if (path.length === stops) {
      collect(path, travelled)
      return
    }

    // `extend` is only ever entered with at least the first stop in the path.
    const last = path[path.length - 1]!

    for (const next of nearest(last)) {
      if (path.includes(next)) continue

      const step = legBetween(last, next)
      if (!step.feasible) continue
      // What is already too much travelling will not get shorter by adding
      // more stops.
      if (travelled + step.min > budgetMinutes - stops * MIN_STAY_MINUTES) continue

      path.push(next)
      extend(path, travelled + step.min)
      path.pop()
    }
  }

  for (const garden of firstStops) {
    const first = legFrom(garden.slug)
    if (first.feasible) extend([garden], first.min)
  }

  found.sort((a, b) => b.score - a.score)

  // Deduplicate by the set of stops: the same three gardens in a different
  // order are the same tour to the user.
  const seen = new Set<string>()
  const routes: Route[] = []

  for (const route of found) {
    const id = tourKey(route.slugs)
    if (seen.has(id)) continue

    seen.add(id)
    routes.push(route)
    if (routes.length >= MAX_SUGGESTIONS) break
  }

  if (routes.length) return { routes, reason: null }

  // Blame the dial that actually failed. When complete tours existed and only
  // the water wish struck them all, saying "add time or change mode" sends
  // the user to the wrong control. The cap may only be cited when it is set —
  // a message about a limit nobody has seen reads as a bug, not as an
  // explanation.
  return {
    routes,
    reason: rejectedForWater > 0
      ? { kind: 'none-on-water' }
      : {
          kind: 'no-route',
          budgetMinutes,
          mode,
          maxLegMinutes: maxLegMinutes >= LEG_UNCAPPED ? null : maxLegMinutes,
        },
  }
}
