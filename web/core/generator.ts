import { candidates, countGardens, isOnWater } from './garden'
import { openingWindow } from './hours'
import { planLeg } from './travel'
import { scoreRoute } from './scoring'
import { MIN_STAY_MINUTES, stayAt, suggestStay } from './stay'
import { formatDuration } from './time'
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

const MODE_LABELS: Record<string, string> = {
  mix: 'gemischt',
  walk: 'zu fuß',
  bike: 'rad',
  transit: 'öpnv',
}

export interface GenerateResult {
  routes: Route[]
  /** Empty when there are suggestions. Otherwise the reason in plain words. */
  reason: string
}

export function generateRoutes(gardens: Garden[], options: PlannerOptions): GenerateResult {
  const { start, startMinutes, budgetMinutes, stops, mode, maxLegMinutes, weekday } = options
  const { filters, visited, sunsetMinutes } = options

  const pool = candidates(gardens, filters, visited, weekday)

  if (pool.length < stops) {
    return {
      routes: [],
      reason: pool.length
        ? `Nur ${countGardens(pool.length)} ${pool.length === 1 ? 'passt' : 'passen'} zu deinen Wünschen — für ${stops} Stationen zu wenig.`
        : 'Kein Biergarten passt zu dieser Kombination.',
    }
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

  /** A complete path — check it, score it, keep it or drop it. */
  const collect = (path: Garden[], travelled: number): void => {
    const back = legFrom(path[path.length - 1].slug)
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

    for (let i = 0; i < path.length; i++) {
      const step = i === 0 ? legFrom(path[0].slug) : legBetween(path[i - 1], path[i])
      clock += step.min

      const window = openingWindow(path[i], weekday)
      if (!window || clock < window.opensAt || clock + stays[i] > window.closesAt) return

      legs.push(step)
      clock += stays[i]
    }

    if (filters.waterRequired && !path.some(isOnWater)) return

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

    const last = path[path.length - 1]

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
    const id = [...route.slugs].sort().join('|')
    if (seen.has(id)) continue

    seen.add(id)
    routes.push(route)
    if (routes.length >= MAX_SUGGESTIONS) break
  }

  return {
    routes,
    reason: routes.length
      ? ''
      : `Mit ${formatDuration(budgetMinutes)}, ${MODE_LABELS[mode]} und maximal ${maxLegMinutes} Minuten pro Etappe geht sich das nicht aus. Mehr Zeit, weniger Stationen, längere Etappen — oder auf Rad umstellen.`,
  }
}
