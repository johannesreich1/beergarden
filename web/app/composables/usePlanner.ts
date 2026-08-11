import type { Filters, Plan, PlannerOptions, PlanningMode, StartPoint } from '#core'
import { at, sunsetMinutes } from '#core'

/**
 * The planner's state, shared between the planner and the directory.
 *
 * A new key compared to the prototype: the shape changed, and an old entry
 * would silently produce wrong tours instead of failing.
 */
const STORAGE_KEY = 'bg-planer-v5'

/** Candidplatz, because that is where the question behind this project came up. */
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

  /**
   * Whether the planner has been started once.
   *
   * The first screen asks the three questions and nothing else; the suggestions
   * only appear once somebody has answered them. Afterwards the planner is live
   * again — turning a dial and watching the tour change is the point of the wide
   * view, and a confirm step on every change would take exactly that away.
   */
  started: boolean
}

function initialState(): PlannerState {
  return {
    startPoint: DEFAULT_START,
    startMinutes: at(15),
    budgetMinutes: 360,
    stops: 3,
    mode: 'mix',
    maxLegMinutes: 25,
    // A fixed default rather than `new Date()`: the state is also created
    // during prerendering, and a build date baked into the HTML would be wrong
    // from tomorrow on. The real weekday arrives in hydrate().
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
    started: false,
  }
}

const isoWeekday = (date: Date): number => date.getDay() || 7

export function usePlanner() {
  const state = useState<PlannerState>('planner', initialState)
  const hydrated = useState<boolean>('planner-hydrated', () => false)

  /** Call in the browser only. Before that the default applies. */
  function hydrate(): void {
    if (hydrated.value) return
    hydrated.value = true

    const stored = localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      state.value.weekday = isoWeekday(new Date())
      return
    }

    try {
      // Merge shallowly rather than replace: a state stored by a version with
      // fewer fields must not swallow the new ones.
      Object.assign(state.value, JSON.parse(stored) as Partial<PlannerState>)

      // Older plans only knew one stay for every stop. That cannot be
      // translated sensibly into per-garden bounds — so it goes. But only the
      // plan: visits, filters and start point stay, otherwise a format change
      // would mean data loss for the user.
      if (state.value.plan && !Array.isArray(state.value.plan.stays)) {
        state.value.plan = null
        state.value.durations = {}
        state.value.skipped = []
        state.value.lastStop = null
      }
    }
    catch {
      // A corrupt entry is no reason to show the user a blank page.
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  function persist(): void {
    if (!hydrated.value) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
    }
    catch {
      // Private mode, quota exhausted — no reason to stop the planner.
    }
  }

  /**
   * The most recently dropped tour.
   *
   * Not persisted: it explains a change that just happened. On the next visit
   * the notice would be without context.
   */
  const droppedTour = useState<{ plan: Plan } | null>(
    'planner-dropped',
    () => null,
  )

  /**
   * Drop the tour because it no longer works under the new settings.
   *
   * Only the plan is kept, not the reason: that is recomputed on every change.
   * A frozen reason goes stale the moment the user turns another dial — and
   * then contradicts what is on screen.
   */
  function dropTour(): void {
    if (!state.value.plan) return

    droppedTour.value = { plan: state.value.plan }
    state.value.plan = null
    state.value.durations = {}
    state.value.skipped = []
    state.value.lastStop = null
    persist()
  }

  const visitedSet = computed(() => new Set(state.value.visited))
  const skippedSet = computed(() => new Set(state.value.skipped))

  /** Today's sunset. The prototype had a constant here. */
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

  /**
   * Whether the start screen is behind us.
   *
   * Derived rather than migrated: a state stored before the flag existed still
   * carries a tour, and a tour is proof enough that its questions were answered.
   * Reading it this way means no stored plan can ever end up hidden behind a
   * screen its owner has never seen.
   */
  const started = computed(() => state.value.started || state.value.plan !== null)

  /** Leave the start screen. One way only — nothing there is lost by leaving. */
  function start(): void {
    state.value.started = true
    persist()
  }

  return {
    state,
    hydrated,
    started,
    start,
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
