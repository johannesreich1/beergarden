import { openingWindow } from './hours'
import type { Plan } from './schedule'
import { planLeg } from './travel'
import type { Garden, PlannerOptions, StartPoint } from './types'

/**
 * Hält eine gewählte Tour noch?
 *
 * Der Generator prüft die Öffnungszeiten beim Erzeugen. Danach dreht der
 * Nutzer weiter: andere Startzeit, anderer Wochentag, längere Verweildauer,
 * eine Station ausgelassen. Jede dieser Änderungen kann die Tour kippen,
 * ohne dass sie neu erzeugt wird — und eine Tour, die stillschweigend falsch
 * dasteht, ist schlimmer als gar keine.
 *
 * Diese Funktion rechnet die gewählte Tour mit den *aktuellen* Einstellungen
 * noch einmal durch und meldet die erste Stelle, an der es scheitert. Die
 * Etappen werden dabei neu berechnet und nicht aus dem Plan übernommen: wer
 * den Fortbewegungsmodus wechselt, hat andere Fahrzeiten.
 */

export type PlanProblemKind =
  /** Der Garten steht nicht mehr im Bestand. */
  | 'missing'
  /** An diesem Wochentag geschlossen. */
  | 'closed'
  /** Man wäre vor dem Aufsperren da. */
  | 'too-early'
  /** Die Sitzzeit ragt über die Sperrstunde hinaus. */
  | 'too-late'
  /** Die Tour passt nicht mehr ins Zeitfenster. */
  | 'over-budget'

export interface PlanProblem {
  kind: PlanProblemKind
  /** Der Garten, an dem es scheitert. Bei 'over-budget' der letzte. */
  slug: string
  /** Ankunft dort nach aktueller Planung. */
  arrival: number
  /** Bei 'too-early' und 'too-late': das Fenster, das nicht passt. */
  opensAt?: number
  closesAt?: number
  /** Bei 'over-budget': wie lange die Tour tatsächlich dauert. */
  totalMinutes?: number
}

export function checkPlan(
  plan: Plan,
  gardens: Garden[],
  options: PlannerOptions,
  /** Abweichende Verweildauern. Auch die können eine Tour kippen. */
  durations: Readonly<Record<string, number>> = {},
): PlanProblem | null {
  const bySlug = new Map(gardens.map((garden) => [garden.slug, garden]))
  const stops = plan.slugs.map((slug) => bySlug.get(slug))

  const missing = stops.findIndex((garden) => garden === undefined)
  if (missing >= 0) {
    return { kind: 'missing', slug: plan.slugs[missing], arrival: options.startMinutes }
  }

  let clock = options.startMinutes
  let previous: StartPoint | Garden = options.start

  for (const [index, garden] of (stops as Garden[]).entries()) {
    clock += planLeg(previous, garden, options.mode, options.maxLegMinutes).min
    const arrival = clock

    const window = openingWindow(garden, options.weekday)
    if (!window) {
      return { kind: 'closed', slug: garden.slug, arrival }
    }

    const stay = durations[garden.slug] ?? plan.stays[index]

    if (arrival < window.opensAt) {
      return { kind: 'too-early', slug: garden.slug, arrival, ...window }
    }
    if (arrival + stay > window.closesAt) {
      return { kind: 'too-late', slug: garden.slug, arrival, ...window }
    }

    clock += stay
    previous = garden
  }

  const back = planLeg(previous, options.start, options.mode, options.maxLegMinutes)
  const totalMinutes = clock + back.min - options.startMinutes

  if (totalMinutes > options.budgetMinutes) {
    return {
      kind: 'over-budget',
      slug: plan.slugs[plan.slugs.length - 1],
      arrival: clock,
      totalMinutes,
    }
  }

  return null
}
