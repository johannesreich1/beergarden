import { planLeg } from './travel'
import type { Garden, Leg, Mode, PlanningMode, Route, StartPoint } from './types'

/**
 * Der Ablauf einer gewählten Tour, nachdem der Nutzer daran gedreht hat.
 *
 * Der Generator liefert einen Vorschlag. Danach darf man Stationen auslassen,
 * die Verweildauer ändern und früher Schluss machen. Diese Funktion rechnet
 * aus, was daraus wird — ohne neu zu generieren, denn die gewählte Tour soll
 * die gewählte Tour bleiben.
 */

export interface Plan {
  slugs: string[]
  legs: Pick<Leg, 'min' | 'mode' | 'km'>[]
  back: Pick<Leg, 'min' | 'mode' | 'km'>
  /** Aufenthalt je Station, gleiche Reihenfolge wie `slugs`. */
  stays: number[]
}

export interface ScheduleOptions {
  start: StartPoint
  startMinutes: number
  mode: PlanningMode
  maxLegMinutes: number
  skipped: ReadonlySet<string>
  /** Abweichende Verweildauer pro Garten. */
  durations: Readonly<Record<string, number>>
  /** Ab hier Schluss, Rest der Tour fällt weg. */
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
  /** Ob der Nutzer die Tour verändert hat. */
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

  // Kann passieren, wenn ein gespeicherter Plan auf einen inzwischen
  // entfernten Garten zeigt. Dann ist der ganze Plan hinfällig, nicht nur
  // eine Station.
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
      // Eine übersprungene Station macht die Etappe länger, und der ursprünglich
      // gewählte Modus passt dann nicht mehr. ÖPNV ist die konservative Annahme:
      // lieber zu lange schätzen als den Nutzer zu Fuß im Regen stehen lassen.
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
