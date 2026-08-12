import type { Filters, Garden, Mode, Plan, PlannerOptions, PlanningMode, StartPoint } from '#core'
import { LEG_UNCAPPED, at, planFromSlugs, sunsetMinutes } from '#core'

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
   * How the tour comes about: proposed or picked by hand.
   *
   * Two modes, not two pages — the tour underneath is the same object either
   * way, and so are the controls on it. Only the way to it differs, and the
   * suggestion list steps aside while somebody is picking for themselves.
   */
  planMode: 'suggest' | 'self'

  /**
   * Modes chosen by hand, per leg.
   *
   * Keyed by where the leg goes, so removing a stop in the middle does not
   * hand its choice to the next one. Empty means: let the travel model decide,
   * which is what it does for every leg nobody has touched.
   */
  legModes: Record<string, string>

  /**
   * Whether the time window is a limit or a note.
   *
   * Asked once, before the first pick, because it changes what a tap on the
   * map means: under `fixed` a garden that would blow the window cannot be
   * chosen at all, under `flexible` it can and the beam simply grows past the
   * mark. Both are legitimate — an evening is planned around a last train for
   * some people and around nothing for others.
   */
  timeMode: 'fixed' | 'flexible'

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
    maxLegMinutes: LEG_UNCAPPED,
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
    planMode: 'suggest',
    legModes: {},
    allControls: false,
    timeMode: 'flexible',
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

      // 25 was the silent default of the leg-cap dial, and nobody ever chose
      // it — the dial lives behind "Alle Regler". Stored states carry it
      // anyway, so it is migrated to the new default rather than kept as a
      // constraint the user never saw. A deliberate 25 is lost with it;
      // deliberate values were impossible to set apart from the default.
      if (state.value.maxLegMinutes === 25) state.value.maxLegMinutes = LEG_UNCAPPED

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

  /**
   * Switch between proposing and picking.
   *
   * A chosen tour survives the switch. The two modes are separate surfaces,
   * but a setting that silently throws away work is a bug even when the
   * surfaces are separate — the tour becomes what you carry on building from.
   */
  function setPlanMode(next: PlannerState['planMode']): void {
    state.value.planMode = next
    persist()
  }

  function setTimeMode(next: PlannerState['timeMode']): void {
    state.value.timeMode = next
    persist()
  }

  /**
   * Rebuild the plan from a list of stops.
   *
   * Not patched in place: a plan carries its legs and the way home, and those
   * change with every stop that is added or dropped. Assembling one by hand
   * from `slugs` and `stays` alone produces an object that looks like a plan
   * and schedules to nothing — which is exactly what it did before this.
   */
  function setStops(slugs: string[], gardens: Garden[]): void {
    droppedTour.value = null
    state.value.plan = planFromSlugs(slugs, gardens, {
      start: state.value.startPoint,
      mode: state.value.mode,
      maxLegMinutes: state.value.maxLegMinutes,
    }, state.value.durations, state.value.legModes as Record<string, Mode>)

    if (!state.value.plan) {
      state.value.durations = {}
      state.value.skipped = []
      state.value.lastStop = null
    }
    persist()
  }

  /**
   * Choose the mode for one leg, or hand it back to the model.
   *
   * Tapping the mode a leg already has clears the override rather than setting
   * it again — otherwise there is no way back to "let it decide", and the only
   * escape would be a fourth button nobody would recognise.
   */
  function setLegMode(key: string, mode: string, gardens: Garden[]): void {
    if (state.value.legModes[key] === mode) delete state.value.legModes[key]
    else state.value.legModes[key] = mode

    setStops(state.value.plan?.slugs ?? [], gardens)
  }

  const addStop = (slug: string, gardens: Garden[]) =>
    setStops([...(state.value.plan?.slugs ?? []), slug], gardens)

  const removeStop = (slug: string, gardens: Garden[]) =>
    setStops((state.value.plan?.slugs ?? []).filter((s) => s !== slug), gardens)

  /**
   * Show or hide the dense dials — and forget them when they go.
   *
   * A dial that is not on screen must not constrain what is: a weekday, a
   * stop count or a leg cap set twenty minutes ago behind a switch is exactly
   * what makes the planner look broken. Closing the switch returns those
   * dials to their defaults. The rail's own answers — start, time, mode,
   * wishes — stay, because they remain visible.
   */
  function setAllControls(next: boolean): void {
    state.value.allControls = next

    if (!next) {
      const fresh = initialState()
      state.value.weekday = isoWeekday(new Date())
      state.value.stops = fresh.stops
      state.value.maxLegMinutes = fresh.maxLegMinutes
      state.value.filters.breweries = []
    }
    persist()
  }

  /**
   * Only the wishes, nothing else.
   *
   * "Alle aufheben" on the rail's stamp row clears what the stamps show —
   * tags and toggles. Start, time and mode are answers, not wishes, and a
   * row about wishes must not reach into them.
   */
  function clearFilters(): void {
    state.value.filters = initialState().filters
    persist()
  }

  /**
   * Clamped to the afternoon and evening: the model has no opening data for
   * breakfast hours, and a tour starting at 23:00 outlives every Sperrstunde.
   */
  function shiftStart(delta: number): void {
    state.value.startMinutes = Math.max(at(11), Math.min(at(20), state.value.startMinutes + delta))
    persist()
  }

  /**
   * Everything back to the beginning.
   *
   * Filters included, and that is the point: a filter set twenty minutes ago
   * two columns away is exactly what makes a planner feel broken — nothing
   * matches and nothing says why. Visits are the one thing that survives.
   * Those are a record of where somebody has been, not a setting they made,
   * and losing them to a button meant for a fresh start would be a small
   * betrayal.
   */
  function resetAll(): void {
    const visited = state.value.visited
    const started = state.value.started
    const planMode = state.value.planMode

    state.value = { ...initialState(), visited, started, planMode }
    state.value.weekday = isoWeekday(new Date())
    droppedTour.value = null
    persist()
  }

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
    setPlanMode,
    setTimeMode,
    setLegMode,
    setAllControls,
    resetAll,
    clearFilters,
    shiftStart,
    addStop,
    removeStop,
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
