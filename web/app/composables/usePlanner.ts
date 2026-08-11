import type { Filters, Plan, PlanProblem, PlannerOptions, PlanningMode, StartPoint } from '#core'
import { at, sunsetMinutes } from '#core'

/**
 * Der Zustand des Planers, geteilt zwischen Planer und Verzeichnis.
 *
 * Neuer Schlüssel gegenüber dem Prototyp: die Form hat sich geändert, und ein
 * alter Eintrag würde stumm falsche Touren erzeugen statt zu scheitern.
 */
const STORAGE_KEY = 'bg-planer-v5'

/** Candidplatz, weil dort die Frage aufkam, aus der das Projekt entstand. */
const DEFAULT_START: StartPoint = { name: 'Candidplatz', lat: 48.1148, lon: 11.5687 }

const MUNICH = { lat: 48.1374, lon: 11.5755 }

export interface PlannerState {
  startPoint: StartPoint
  startMinutes: number
  budgetMinutes: number
  stops: number
  mode: PlanningMode
  maxLegMinutes: number
  weekday: number
  filters: Filters
  visited: string[]
  plan: Plan | null
  durations: Record<string, number>
  skipped: string[]
  lastStop: string | null
}

function initialState(): PlannerState {
  return {
    startPoint: DEFAULT_START,
    startMinutes: at(15),
    budgetMinutes: 360,
    stops: 3,
    mode: 'mix',
    maxLegMinutes: 25,
    // Fester Vorgabewert statt `new Date()`: der Zustand wird auch beim
    // Vorrendern angelegt, und ein Build-Datum im HTML wäre ab morgen falsch.
    // Der echte Wochentag kommt in hydrate() dazu.
    weekday: 2,
    filters: {
      tags: [],
      breweries: [],
      selfServiceOnly: false,
      ownFoodOnly: false,
      unvisitedOnly: false,
      cityOnly: false,
      waterRequired: false,
    },
    visited: [],
    plan: null,
    durations: {},
    skipped: [],
    lastStop: null,
  }
}

const isoWeekday = (date: Date): number => date.getDay() || 7

export function usePlanner() {
  const state = useState<PlannerState>('planner', initialState)
  const hydrated = useState<boolean>('planner-hydrated', () => false)

  /** Nur im Browser aufrufen. Vorher gilt der Vorgabewert. */
  function hydrate(): void {
    if (hydrated.value) return
    hydrated.value = true

    const stored = localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      state.value.weekday = isoWeekday(new Date())
      return
    }

    try {
      // Flach zusammenführen statt ersetzen: ein gespeicherter Zustand aus
      // einer Version mit weniger Feldern soll nicht die neuen verschlucken.
      Object.assign(state.value, JSON.parse(stored) as Partial<PlannerState>)
    }
    catch {
      // Kaputter Eintrag ist kein Grund, dem Nutzer eine leere Seite zu zeigen.
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  function persist(): void {
    if (!hydrated.value) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
    }
    catch {
      // Privater Modus, volles Kontingent — kein Grund, den Planer anzuhalten.
    }
  }

  /**
   * Die zuletzt verworfene Tour samt Grund.
   *
   * Nicht gespeichert: sie erklärt eine Änderung, die gerade passiert ist.
   * Beim nächsten Besuch wäre der Hinweis zusammenhanglos.
   */
  const droppedTour = useState<{ plan: Plan, problem: PlanProblem } | null>(
    'planner-verworfen',
    () => null,
  )

  /** Tour fallen lassen, weil sie mit den neuen Einstellungen nicht mehr geht. */
  function dropTour(problem: PlanProblem): void {
    if (!state.value.plan) return

    droppedTour.value = { plan: state.value.plan, problem }
    state.value.plan = null
    state.value.durations = {}
    state.value.skipped = []
    state.value.lastStop = null
    persist()
  }

  const visitedSet = computed(() => new Set(state.value.visited))
  const skippedSet = computed(() => new Set(state.value.skipped))

  /** Sonnenuntergang für heute. Im Prototyp stand hier eine Konstante. */
  const sunset = computed(() =>
    hydrated.value
      ? sunsetMinutes(new Date(), MUNICH.lat, MUNICH.lon)
      : at(20, 34),
  )

  const options = computed<PlannerOptions>(() => ({
    start: state.value.startPoint,
    startMinutes: state.value.startMinutes,
    budgetMinutes: state.value.budgetMinutes,
    stops: state.value.stops,
    mode: state.value.mode,
    maxLegMinutes: state.value.maxLegMinutes,
    weekday: state.value.weekday,
    filters: state.value.filters,
    visited: visitedSet.value,
    sunsetMinutes: sunset.value,
  }))

  function toggle(list: string[], value: string): void {
    const index = list.indexOf(value)
    if (index >= 0) list.splice(index, 1)
    else list.push(value)
    persist()
  }

  function toggleVisited(slug: string): void {
    toggle(state.value.visited, slug)
  }

  function choosePlan(plan: Plan): void {
    droppedTour.value = null
    state.value.plan = plan
    state.value.durations = {}
    state.value.skipped = []
    state.value.lastStop = null
    persist()
  }

  function resetPlanEdits(): void {
    state.value.durations = {}
    state.value.skipped = []
    state.value.lastStop = null
    persist()
  }

  const planEdited = computed(
    () =>
      state.value.skipped.length > 0 ||
      state.value.lastStop !== null ||
      Object.keys(state.value.durations).length > 0,
  )

  return {
    state,
    hydrated,
    hydrate,
    persist,
    visitedSet,
    skippedSet,
    sunset,
    options,
    toggle,
    toggleVisited,
    droppedTour,
    dropTour,
    choosePlan,
    resetPlanEdits,
    planEdited,
  }
}
