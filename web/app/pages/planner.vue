<script setup lang="ts">
import type { Route, StartPoint } from '#core'
import {
  at,
  buildSchedule,
  candidates,
  distanceKm,
  formatClock,
  formatDuration,
  generateRoutes,
  planFromRoute,
  checkPlan,
  countGardens,
  BACK_LEG,
} from '#core'

// English file name, German URL — as with the directory.
definePageMeta({ path: '/planer' })

/*
 * The head is prerendered, the body is not.
 *
 * The planner needs localStorage and computes per keystroke, so it stays a
 * client-side page — but that used to mean the route shipped an empty document
 * with no title at all, and a link shared into WhatsApp or Slack showed the
 * bare URL. Title, description and Open Graph now come off the shelf like on
 * every other page; only the tool itself waits for the browser.
 *
 * Not indexable, for the same reason it is not in the sitemap: what a crawler
 * gets here is the frame and nothing else, and an empty page under a good
 * title is worse than no result. The landing page is what should be found.
 */
usePageSeo({
  title: 'Tour bauen',
  description:
    'Biergarten-Tour für München planen: Startpunkt, Zeitfenster und Verkehrsmittel '
    + 'wählen — der Planer schlägt Touren vor und rechnet Öffnungszeiten mit.',
  indexable: false,
})

const { data: gardens } = await useGardens()
const { data: startPoints } = await useStartPoints()

const planner = usePlanner()
const { state, started, options, visitedSet, skippedSet, sunset, planEdited, droppedTour } = planner

onMounted(planner.hydrate)

/* ---------- Suggestions ---------- */

const suggestions = computed(() => generateRoutes(gardens.value, options.value))

const poolSize = computed(
  () => candidates(gardens.value, state.value.filters, visitedSet.value, state.value.weekday).length,
)

const planId = computed(() =>
  state.value.plan ? [...state.value.plan.slugs].sort().join('|') : '',
)

const routeId = (route: Route) => [...route.slugs].sort().join('|')

function takeRoute(route: Route): void {
  planner.choosePlan(planFromRoute(route))
  nextTick(() => document.getElementById('tour')?.scrollIntoView({ behavior: 'smooth' }))
}

/* ---------- Validation: does the chosen tour still hold? ---------- */

/*
 * The generator checks opening hours when it creates a tour. Anyone who then
 * turns the start time, the weekday, the mode or a stay can break it — and a
 * tour that is silently wrong is worse than none. So: recompute and drop.
 */
watch(
  [options, () => state.value.durations],
  () => {
    const plan = state.value.plan
    if (!plan || !gardens.value.length) return

    const problem = checkPlan(plan, gardens.value, options.value, state.value.durations)
    if (problem) planner.dropTour()
  },
  { deep: true },
)

const gardenName = (slug: string) =>
  gardens.value.find((garden) => garden.slug === slug)?.name ?? slug

const droppedChain = computed(() =>
  (droppedTour.value?.plan.slugs ?? []).map((slug) => shortName(gardenName(slug))).join(' → '),
)

/**
 * Take it back.
 *
 * Anyone turning the start time back wants their tour back. If it does not
 * work, it drops out again immediately — with whatever reason applies then.
 * So no separate check is needed here.
 */
function retakeDropped(): void {
  if (droppedTour.value) planner.choosePlan(droppedTour.value.plan)
}

/**
 * The reason is recomputed on every change rather than frozen when the tour is
 * dropped. Otherwise a number from back then sits next to a setting from now —
 * and the sentence contradicts itself.
 */
const droppedProblem = computed(() =>
  droppedTour.value
    ? checkPlan(droppedTour.value.plan, gardens.value, options.value, state.value.durations)
    : null,
)

/** Whether the dropped tour would work again under the current settings. */
const droppedWorksAgain = computed(() => !!droppedTour.value && droppedProblem.value === null)

/** Why the tour no longer works — in plain words, not as an error code. */
const droppedReason = computed(() => {
  const problem = droppedProblem.value
  if (!problem) return ''

  const name = gardenName(problem.slug)

  switch (problem.kind) {
    case 'closed':
      return `${name} hat ${WEEKDAY_NAMES[state.value.weekday]} geschlossen.`
    case 'too-early':
      return `${name}: Du wärst um ${formatClock(problem.arrival)} da, aufgesperrt wird erst um ${formatClock(problem.opensAt!)}.`
    case 'too-late':
      return `${name}: Sperrstunde ${formatClock(problem.closesAt!)}, du kämst erst um ${formatClock(problem.arrival)} an. Für den Aufenthalt bliebe nichts übrig.`
    case 'over-budget':
      return `Die Tour dauert jetzt ${formatDuration(problem.totalMinutes!)} und passt nicht mehr in dein Zeitfenster von ${formatDuration(state.value.budgetMinutes)}.`
    case 'missing':
      return `${name} steht nicht mehr im Bestand.`
  }
})

/* ---------- The chosen tour ---------- */

const schedule = computed(() => {
  if (!state.value.plan) return null

  return buildSchedule(state.value.plan, gardens.value, {
    start: state.value.startPoint,
    startMinutes: state.value.startMinutes,
    mode: state.value.mode,
    maxLegMinutes: state.value.maxLegMinutes,
    skipped: skippedSet.value,
    durations: state.value.durations,
    lastStop: state.value.lastStop,
  })
})

const plannedGardens = computed(() =>
  (state.value.plan?.slugs ?? [])
    .map((slug) => gardens.value.find((garden) => garden.slug === slug))
    .filter((garden) => garden !== undefined),
)

const rowFor = (slug: string) =>
  schedule.value?.rows.find((row) => row.garden.slug === slug) ?? null

const overBudget = computed(
  () => !!schedule.value && schedule.value.end - state.value.startMinutes > state.value.budgetMinutes,
)

const walkMinutes = computed(() => {
  if (!schedule.value) return 0

  const legs = schedule.value.rows.reduce(
    (sum, row) => sum + (row.legMode === 'walk' ? row.legMinutes : 0),
    0,
  )

  return legs + (schedule.value.back.mode === 'walk' ? schedule.value.back.min : 0)
})

/* ---------- Controls ---------- */

const currentDuration = (slug: string) => {
  const planned = state.value.plan
  const index = planned?.slugs.indexOf(slug) ?? -1

  return state.value.durations[slug] ?? (index >= 0 ? planned!.stays[index] : 90)
}

function changeDuration(slug: string, delta: number): void {
  const next = currentDuration(slug) + delta
  state.value.durations[slug] = Math.max(30, Math.min(240, next))
  planner.persist()
}

function toggleSkip(slug: string): void {
  planner.toggle(state.value.skipped, slug)
  if (state.value.lastStop === slug) state.value.lastStop = null
  planner.persist()
}

function shiftStart(delta: number): void {
  state.value.startMinutes = Math.max(at(11), Math.min(at(20), state.value.startMinutes + delta))
  planner.persist()
}

const startQuery = ref('')
const startNote = ref('')

watch(
  () => state.value.startPoint.name,
  (name) => {
    startQuery.value = name
    startNote.value = ''
  },
  { immediate: true },
)

function applyStartQuery(): void {
  const query = startQuery.value.trim().toLowerCase()

  const hit =
    startPoints.value.find((point) => point.name.toLowerCase() === query) ??
    startPoints.value.find((point) => point.name.toLowerCase().includes(query))

  if (!hit) {
    startNote.value = 'kenne-ich-nicht'
    return
  }

  state.value.startPoint = hit
  planner.persist()
}

function useGeolocation(): void {
  if (!navigator.geolocation) {
    startNote.value = 'kein-standort'
    return
  }

  startNote.value = 'suche'

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const here = { lat: position.coords.latitude, lon: position.coords.longitude }

      const nearest = [...startPoints.value]
        .map((point) => ({ point, distance: distanceKm(here, point) }))
        .sort((a, b) => a.distance - b.distance)[0]

      // Under 1.2 km, adopt the stop's name — it says more than "my location"
      // and is recognisable on the timeline.
      const near = nearest && nearest.distance < 1.2

      state.value.startPoint = near
        ? nearest.point
        : { name: 'Mein Standort', lat: here.lat, lon: here.lon }

      startNote.value = 'standort'
      planner.persist()
    },
    () => {
      startNote.value = 'abgelehnt'
    },
    { timeout: 8000 },
  )
}

const BUDGETS = [
  { value: 240, label: '4 h' },
  { value: 300, label: '5 h' },
  { value: 360, label: '6 h' },
  { value: 420, label: '7 h' },
]

const legLabel = computed(() =>
  state.value.mode === 'bike'
    ? 'Max. Radzeit pro Etappe'
    : state.value.mode === 'transit'
      ? 'Max. Fahrzeit pro Etappe'
      : 'Max. Fußweg pro Etappe',
)

function setMode(mode: typeof state.value.mode): void {
  state.value.mode = mode
  // Five minutes of cycling is not a filter but an empty result list.
  if (mode === 'bike' && state.value.maxLegMinutes < 20) state.value.maxLegMinutes = 25
  planner.persist()
}
</script>

<template>
  <!--
    Two screens, not two pages.

    First the questions on their own: a wall of suggestions next to a form
    nobody has filled in yet answers a question that was never asked. Once the
    planner is started it stays live — turning a dial and watching the tour
    change is the reason the wide view exists, and a confirm step on every
    change would take exactly that away.
  -->
  <!--
    Everything below waits for the browser. The planner reads localStorage and
    recomputes on every turn of a dial, so there is nothing here a server could
    render that the client would not immediately replace. What the server does
    render is the document around it — head, navigation, foot — which is why a
    shared link now shows a title instead of the bare URL.

    Not indented a level further, like the columns below: the wrapper says when
    this renders, not where it sits.
  -->
  <ClientOnly>
  <section
    class="stage"
    :class="{
      setup: !started,
      'self-mode': started && state.planMode === 'self',
      'three-column': started && !!schedule && state.planMode !== 'self',
    }"
  >
    <div class="controls">
    <div class="panel">
      <span class="eyebrow">Start und Ziel</span>
      <div class="startrow">
        <input
          v-model="startQuery"
          class="inp"
          list="places"
          placeholder="Haltestelle oder Viertel"
          autocomplete="off"
          @change="applyStartQuery"
        >
        <button class="btn" @click="useGeolocation">Standort</button>
      </div>
      <datalist id="places">
        <option v-for="point in startPoints" :key="point.name" :value="point.name" />
      </datalist>
      <div class="startmeta">
        <template v-if="startNote === 'kenne-ich-nicht'">
          Kenne ich nicht — nimm eine Haltestelle aus der Liste. Weiter ab
          <b>{{ state.startPoint.name }}</b>.
        </template>
        <template v-else-if="startNote === 'suche'">Suche Position …</template>
        <template v-else-if="startNote === 'abgelehnt'">
          Standort nicht freigegeben — Haltestelle eintippen.
        </template>
        <template v-else-if="startNote === 'kein-standort'">
          Standort ist hier nicht verfügbar — Haltestelle eintippen.
        </template>
        <template v-else-if="startNote === 'standort'">
          Position übernommen · <b>{{ state.startPoint.name }}</b>
        </template>
        <template v-else>
          Alles rechnet ab <b>{{ state.startPoint.name }}</b> und wieder zurück.
        </template>
      </div>
    </div>

    <div class="panel">
      <span class="eyebrow">Rahmen</span>

      <div class="stepper">
        <button class="step" @click="shiftStart(-15)">–</button>
        <div class="lbl">
          <small>Losgehen</small>
          <strong>{{ formatClock(state.startMinutes) }}</strong>
        </div>
        <button class="step" @click="shiftStart(15)">+</button>
      </div>

      <div v-if="state.allControls" style="margin-top: 15px">
        <div class="sub"><span class="eyebrow">Wochentag</span></div>
        <div class="grid">
          <button
            v-for="day in WEEKDAYS"
            :key="day.value"
            class="chip gold"
            :aria-pressed="state.weekday === day.value"
            @click="state.weekday = day.value; planner.persist()"
          >{{ day.label }}</button>
        </div>
      </div>

      <div style="margin-top: 15px">
        <div class="sub"><span class="eyebrow">Zeitfenster</span></div>
        <div class="grid">
          <button
            v-for="budget in BUDGETS"
            :key="budget.value"
            class="chip gold"
            :aria-pressed="state.budgetMinutes === budget.value"
            @click="state.budgetMinutes = budget.value; planner.persist()"
          >{{ budget.label }}</button>
        </div>
      </div>

      <div v-if="state.allControls" style="margin-top: 15px">
        <div class="sub"><span class="eyebrow">Stationen</span></div>
        <div class="grid">
          <button
            v-for="count in [2, 3, 4]"
            :key="count"
            class="chip gold"
            :aria-pressed="state.stops === count"
            @click="state.stops = count; planner.persist()"
          >{{ count }} Stationen</button>
        </div>
      </div>

      <div v-if="state.allControls" style="margin-top: 15px">
        <div class="sub"><span class="eyebrow">Unterwegs</span></div>
        <div class="grid">
          <button
            v-for="(label, key) in MODE_OPTIONS"
            :key="key"
            class="chip gold"
            :aria-pressed="state.mode === key"
            @click="setMode(key)"
          >{{ label }}</button>
        </div>
      </div>

      <div style="margin-top: 16px">
        <div v-if="state.allControls" class="sub">
          <span class="eyebrow">{{ legLabel }}</span>
          <span class="v">{{ state.maxLegMinutes }} min</span>
        </div>
        <input
          v-model.number="state.maxLegMinutes"
          type="range"
          min="5"
          max="50"
          step="5"
          @change="planner.persist()"
        >
      </div>
    </div>

    <!--
      Three questions carry the tour; the rest are refinements. The switch sits
      with the controls it opens, not in the head — a control and its effect
      belong within one glance of each other.
    -->
    <button
      class="alle-regler"
      type="button"
      :aria-pressed="state.allControls"
      @click="state.allControls = !state.allControls; planner.persist()"
    >
      <span class="gleis"><i /></span>
      <span>Alle Regler</span>
    </button>

    <FilterControls v-if="state.allControls" :gardens="gardens" />

    <button class="btn warn zuruecksetzen" @click="planner.resetAll()">
      Alles zurücksetzen
    </button>

    <div v-if="!started" class="setup-go">
      <button class="btn on big" @click="planner.start">
        Tour bauen
      </button>
      <p class="note">
        {{ countGardens(poolSize) }} passen dazu. Ändern kannst du alles danach
        weiter — die Vorschläge rechnen dann live mit.
      </p>
    </div>
    </div>

    <div v-if="started" class="results">
    <!--
      Two ways to a tour, one tour. The switch stands above the column it
      changes, not in the settings — it decides what you are looking at, and a
      control that changes the view belongs to the view.
    -->
    <div class="modes" role="group" aria-label="Wie die Tour entsteht">
      <button
        :aria-pressed="state.planMode === 'suggest'"
        @click="planner.setPlanMode('suggest')"
      >Vorschlagen lassen</button>
      <button
        :aria-pressed="state.planMode === 'self'"
        @click="planner.setPlanMode('self')"
      >Selbst planen</button>
    </div>

    <template v-if="state.planMode === 'self'">
      <RouteBuilder
        :gardens="gardens"
        :options="options"
        :chosen="state.plan?.slugs ?? []"
        :legs="state.plan?.legs"
        :stays="state.durations"
        :time-mode="state.timeMode"
        @add="(slug) => planner.addStop(slug, gardens)"
        @remove="(slug) => planner.removeStop(slug, gardens)"
      />

      <!-- One line, not a block: it is a setting, and it only changes what a
           tap on the map is allowed to do. -->
      <p class="timemode">
        {{ formatDuration(state.budgetMinutes) }} Zeit —
        <button
          :aria-pressed="state.timeMode === 'fixed'"
          @click="planner.setTimeMode('fixed')"
        >fest</button>
        <button
          :aria-pressed="state.timeMode === 'flexible'"
          @click="planner.setTimeMode('flexible')"
        >flexibel</button>
      </p>
    </template>

    <template v-else>
    <!--
      The cap counts what stands under it: how many suggestions there are. It
      sits directly before the word "Vorschläge", so that is how it reads — and
      a number that reads as something other than what it counts is worse than
      no number. It used to show the number of stops, which is a setting and
      already has its own control on the left.
    -->
    <div class="section-title">
      <!-- Hidden from assistive tech: the list below it is the count, and a
           screen reader announcing "4" before "Vorschläge" says it twice. -->
      <span class="cap" aria-hidden="true"><i /><b>{{ suggestions.routes.length }}</b></span>
      <h2>Vorschläge</h2>
      <div class="rule" />
    </div>
    <p class="note">
      Aus {{ countGardens(poolSize) }}, {{ WEEKDAY_NAMES[state.weekday] }} geöffnet,
      Öffnungszeiten berücksichtigt.
    </p>

    <div style="margin-top: 14px">
      <div v-if="droppedTour" class="dropped" role="status">
        <template v-if="droppedWorksAgain">
          <strong>Tour geht wieder</strong>
          <p>
            Mit diesen Einstellungen passt sie erneut. Unten bei den Alternativen
            kannst du sie zurückholen.
          </p>
        </template>
        <template v-else>
          <strong>Tour verworfen</strong>
          <p>{{ droppedReason }} Sie steht unten bei den Alternativen.</p>
        </template>
      </div>

      <div v-if="!suggestions.routes.length" class="empty">{{ suggestions.reason }}</div>
      <PlanSuggestion
        v-for="(route, index) in suggestions.routes"
        :key="routeId(route)"
        :route="route"
        :rank="index"
        :gardens="gardens"
        :start="state.startPoint"
        :start-minutes="state.startMinutes"
        :mode="state.mode"
        :visited="visitedSet"
        :active="routeId(route) === planId"
        @take="takeRoute(route)"
      />

      <div v-if="droppedTour" class="plan stale" :class="{ 'works-again': droppedWorksAgain }">
        <div class="ptop">
          <span class="rank">{{ droppedWorksAgain ? 'Geht wieder' : 'Geht nicht mehr' }}</span>
        </div>
        <div class="chain">{{ droppedChain }}</div>
        <p v-if="!droppedWorksAgain" class="reason">{{ droppedReason }}</p>
        <div class="pact">
          <button class="btn" :class="{ on: droppedWorksAgain }" @click="retakeDropped">
            Wieder aufnehmen
          </button>
        </div>
      </div>
    </div>

    </template>
    </div>

    <div v-if="started && schedule" id="tour" class="tour-column">
      <div class="section-title"><h2>Deine Tour</h2><div class="rule" /></div>

      <!-- Only while picking by hand. With a proposed tour the generator has
           already fitted it into the window; here the evening grows under your
           thumb, and the beam is what shows how much of it is left. -->
      <TimeBeam
        v-if="state.planMode === 'self'"
        :schedule="schedule"
        :start-minutes="state.startMinutes"
        :budget-minutes="state.budgetMinutes"
        :sunset-minutes="sunset"
        :time-mode="state.timeMode"
      />

      <LightRail
        :arrivals="schedule.rows.map((row) => row.arrive)"
        :sunset="sunset"
      />

      <!-- Not in self mode: the route is already drawn on the map you picked it
           on, and two maps of one evening never quite agree with each other. -->
      <TourMap
        v-if="state.planMode !== 'self'"
        :start="state.startPoint"
        :planned="plannedGardens"
        :rows="schedule.rows"
        @select="(slug) => document.getElementById(`card-${slug}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })"
      />

      <div class="tl">
        <div class="node">
          <div class="leg">
            <span class="mode">Start</span>
            <b style="color: var(--foam)">{{ formatClock(state.startMinutes) }}</b> ·
            {{ state.startPoint.name }}
          </div>
        </div>

        <template v-for="garden in plannedGardens" :key="garden.slug">
          <div v-if="rowFor(garden.slug)" class="node">
            <div class="leg" :class="rowFor(garden.slug)!.legMode">
              <span class="mode">
                {{ MODE_LABELS[rowFor(garden.slug)!.legMode] }} · ≈{{ rowFor(garden.slug)!.legMinutes }} min
              </span>
              ab {{ 'name' in rowFor(garden.slug)!.from ? (rowFor(garden.slug)!.from as StartPoint).name : '' }}
              <template v-if="rowFor(garden.slug)!.legMode === 'transit'">· Umstiege nicht gerechnet</template>
              <ModeLinks
                :from="rowFor(garden.slug)!.from"
                :to="garden"
                :selected="rowFor(garden.slug)!.legMode"
                :mode="state.mode"
                :max-leg-minutes="state.maxLegMinutes"
                :choosable="state.planMode === 'self'"
                @choose="(m) => planner.setLegMode(garden.slug, m, gardens)"
              />
            </div>
          </div>

          <StopCard
            :garden="garden"
            :row="rowFor(garden.slug)"
            :weekday="state.weekday"
            :visited="visitedSet.has(garden.slug)"
            :removable="state.planMode === 'self'"
            @remove="planner.removeStop(garden.slug, gardens)"
            @skip="toggleSkip(garden.slug)"
            @seen="planner.toggleVisited(garden.slug)"
            @finish="state.lastStop = garden.slug; planner.persist()"
            @longer="changeDuration(garden.slug, 15)"
            @shorter="changeDuration(garden.slug, -15)"
          />
        </template>

        <div class="node term">
          <div class="leg" :class="schedule.back.mode">
            <span class="mode">
              {{ MODE_LABELS[schedule.back.mode] }} · ≈{{ schedule.back.min }} min
            </span>
            Zurück nach {{ state.startPoint.name }}
            <ModeLinks
              :from="schedule.rows[schedule.rows.length - 1].garden"
              :to="state.startPoint"
              :selected="schedule.back.mode"
              :mode="state.mode"
              :max-leg-minutes="state.maxLegMinutes"
              :choosable="state.planMode === 'self'"
              @choose="(m) => planner.setLegMode(BACK_LEG, m, gardens)"
            />
          </div>
        </div>

        <div class="node term">
          <div class="leg">
            <span class="mode">Ziel</span>
            <b style="color: var(--foam)">{{ formatClock(schedule.end) }}</b> ·
            {{ state.startPoint.name }}
          </div>
        </div>
      </div>

      <div class="total">
        <div class="row">
          <div class="eyebrow">Von Tür zu Tür</div>
          <strong>{{ formatDuration(schedule.end - state.startMinutes) }}</strong>
        </div>
        <div class="hint" :class="{ over: overBudget }">
          <template v-if="overBudget">
            Über deinem Zeitfenster von {{ formatDuration(state.budgetMinutes) }}.
          </template>
          {{ schedule.rows.length }} Station{{ schedule.rows.length > 1 ? 'en' : '' }},
          {{ walkMinutes }} Minuten zu Fuß, zurück um {{ formatClock(schedule.end) }}.
          <template v-if="schedule.rows[schedule.rows.length - 1].depart > sunset">
            Letzte Station geht in den Sonnenuntergang.
          </template>
        </div>
        <div v-if="planEdited" style="margin-top: 11px">
          <button class="btn" @click="planner.resetPlanEdits">Änderungen zurücksetzen</button>
        </div>
      </div>
    </div>
  </section>
  </ClientOnly>
</template>
