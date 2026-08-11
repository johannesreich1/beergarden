import { candidates, isOnWater } from './garden'
import { openingWindow } from './hours'
import { planLeg } from './travel'
import { scoreRoute } from './scoring'
import { MIN_STAY_MINUTES, stayAt, suggestStay } from './stay'
import { formatDuration } from './time'
import type { Garden, Leg, PlannerOptions, Route } from './types'

/**
 * Der Routengenerator.
 *
 * Tiefensuche über Pfade der gewünschten Länge, mit drei Abkürzungen, die aus
 * einem exponentiellen Problem ein sofortiges machen:
 *
 *   - pro Schritt nur die nächsten Nachbarn statt aller Kandidaten
 *   - nur die vom Start aus nächsten Gärten als erste Station
 *   - Abbruch, sobald die verbleibende Zeit die Mindestsitzzeit unterschreitet
 *
 * Bei 35 Gärten wäre das alles unnötig. Bei ein paar tausend ist es der
 * Unterschied zwischen "läuft bei jedem Slider-Zug" und "läuft nicht".
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
  /** Leer, wenn es Vorschläge gibt. Sonst der Grund im Klartext. */
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
        ? `Nur ${pool.length} Biergärten passen zu deinen Wünschen — für ${stops} Stationen zu wenig.`
        : 'Kein Biergarten passt zu dieser Kombination.',
    }
  }

  // Die Fahrzeitmatrix einmal vorberechnen. Ohne sie ruft die Tiefensuche
  // dieselbe Strecke tausendfach neu aus.
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

  /** Ein vollständiger Pfad — prüfen, bewerten, behalten oder verwerfen. */
  const collect = (path: Garden[], travelled: number): void => {
    const back = legFrom(path[path.length - 1].slug)
    if (!back.feasible) return

    const travelMinutes = travelled + back.min
    const sitTotal = budgetMinutes - travelMinutes
    if (sitTotal < stops * MIN_STAY_MINUTES) return

    // Erst gleichmäßig verteilen, dann pro Garten in seine Grenzen klemmen.
    // Das Klemmen kann die Summe nach oben treiben — deshalb wird danach
    // noch einmal gegen das Zeitfenster geprüft, und nicht davor.
    const suggested = suggestStay(sitTotal, stops)
    const stays = path.map((garden) => stayAt(garden, suggested))

    if (travelMinutes + stays.reduce((sum, stay) => sum + stay, 0) > budgetMinutes) return

    // Öffnungszeiten: ankommen darf man nicht vor dem Aufsperren und nicht
    // so spät, dass die Sitzzeit über die Sperrstunde hinausragt.
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
      // Was jetzt schon zu lange gefahren ist, wird durch weitere Stationen
      // nicht kürzer.
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

  // Nach Stopp-Menge entduplizieren: dieselben drei Gärten in anderer
  // Reihenfolge sind für den Nutzer dieselbe Tour.
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
