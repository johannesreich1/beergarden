<script setup lang="ts">
import type { Route } from '#core'
import {
  buildSchedule,
  candidates,
  formatClock,
  formatDuration,
  generateRoutes,
  planFromRoute,
  checkPlan,
  countGardens,
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
const { t } = useI18n()

usePageSeo({
  title: t('planner.seoTitle'),
  description: t('planner.seoDescription'),
  indexable: false,
})

const { data: gardens } = await useGardens()

const planner = usePlanner()
const { state, started, options, visitedSet, skippedSet, sunset } = planner
const {
  droppedTour,
  chain: droppedChain,
  reason: droppedReason,
  worksAgain: droppedWorksAgain,
  retake: retakeDropped,
} = useDroppedTour(gardens)

onMounted(planner.hydrate)

/* ---------- Suggestions ---------- */

const suggestions = computed(() => generateRoutes(gardens.value, options.value))

const poolSize = computed(
  () => candidates(gardens.value, state.value.filters, visitedSet.value, state.value.weekday).length,
)

/*
 * Before any tour is taken, the right column previews the best hit.
 *
 * It used to be blank until a choice was made — a page whose right half is
 * empty looks unfinished, and the map is exactly what distinguishes the
 * suggestions. Once a card is clicked the real tour replaces the preview, so
 * this only ever shows the first answer to "what would I get".
 */
const previewRoute = computed(() => suggestions.value.routes[0] ?? null)

const previewSchedule = computed(() => {
  if (!previewRoute.value) return null

  return buildSchedule(planFromRoute(previewRoute.value), gardens.value, {
    start: state.value.startPoint,
    startMinutes: state.value.startMinutes,
    mode: state.value.mode,
    maxLegMinutes: state.value.maxLegMinutes,
    skipped: new Set(),
    durations: {},
    lastStop: null,
  })
})

const previewGardens = computed(() => gardensFor(previewRoute.value?.slugs ?? [], gardens.value))

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
  <!-- Every page carries its own h1; this one's job is done by the tool, so
       the heading serves the outline without repeating on screen. -->
  <h1 class="sr-only">{{ t('planner.title') }}</h1>

  <FilterRail :gardens="gardens" />

  <section
    class="stage"
    :class="{
      setup: !started,
      'rail-only': started,
      'self-mode': started && state.planMode === 'self',
    }"
  >
    <div v-if="!started" class="setup-go">
      <button class="btn on big" @click="planner.start">
        {{ t('planner.start') }}
      </button>
      <p class="note">{{ t('planner.startNote', { count: countGardens(poolSize) }) }}</p>
    </div>

    <div v-if="started" class="results">
    <!--
      Two ways to a tour, one tour. The switch stands above the column it
      changes, not in the settings — it decides what you are looking at, and a
      control that changes the view belongs to the view.
    -->
    <div class="modes" role="group" :aria-label="t('planner.modeGroupAria')">
      <button
        :aria-pressed="state.planMode === 'suggest'"
        @click="planner.setPlanMode('suggest')"
      >{{ t('planner.suggestMode') }}</button>
      <button
        :aria-pressed="state.planMode === 'self'"
        @click="planner.setPlanMode('self')"
      >{{ t('planner.selfMode') }}</button>
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
        {{ t('planner.timeModeLine', { budget: formatDuration(state.budgetMinutes) }) }}
        <button
          :aria-label="t('planner.timeFixedAria')"
          :aria-pressed="state.timeMode === 'fixed'"
          @click="planner.setTimeMode('fixed')"
        >{{ t('planner.timeFixed') }}</button>
        <button
          :aria-label="t('planner.timeFlexibleAria')"
          :aria-pressed="state.timeMode === 'flexible'"
          @click="planner.setTimeMode('flexible')"
        >{{ t('planner.timeFlexible') }}</button>
      </p>
    </template>

    <template v-else>
    <!--
      The cap counts what stands under it: how many suggestions there are. It
      sits directly before the word "Vorschläge", so that is how it reads — and
      a number that reads as something other than what it counts is worse than
      no number.
    -->
    <SectionTitle :title="t('planner.suggestionsTitle')" :count="suggestions.routes.length" />
    <p class="note" aria-live="polite">
      {{ t('planner.suggestionsNote', {
        count: countGardens(poolSize),
        weekday: t(`weekdays.adverb.${state.weekday}`),
      }) }}
    </p>

    <div style="margin-top: 14px">
      <div v-if="droppedTour" class="dropped" role="status">
        <template v-if="droppedWorksAgain">
          <strong>{{ t('dropped.worksAgainTitle') }}</strong>
          <p>{{ t('dropped.worksAgainBody') }}</p>
        </template>
        <template v-else>
          <strong>{{ t('dropped.droppedTitle') }}</strong>
          <p>{{ t('dropped.droppedBody', { reason: droppedReason }) }}</p>
        </template>
      </div>

      <div v-if="!suggestions.routes.length" class="empty" role="status">{{ suggestions.reason }}</div>
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
        :sunset-minutes="sunset"
        @take="takeRoute(route)"
      />

      <div v-if="droppedTour" class="plan stale" :class="{ 'works-again': droppedWorksAgain }">
        <div class="ptop">
          <span class="rank">{{ droppedWorksAgain ? t('dropped.worksAgainRank') : t('dropped.goneRank') }}</span>
        </div>
        <div class="chain">{{ droppedChain }}</div>
        <p v-if="!droppedWorksAgain" class="reason">{{ droppedReason }}</p>
        <div class="pact">
          <button class="btn" :class="{ on: droppedWorksAgain }" @click="retakeDropped">
            {{ t('dropped.retake') }}
          </button>
        </div>
      </div>
    </div>

    </template>
    </div>

    <div
      v-if="started && !schedule && state.planMode !== 'self' && previewSchedule"
      class="tour-column vorschau"
    >
      <SectionTitle :title="t('planner.previewTitle')" />
      <TourMap
        :start="state.startPoint"
        :planned="previewGardens"
        :rows="previewSchedule.rows"
      />
      <p class="vorschau-meta">
        {{ previewGardens.map((garden) => shortName(garden.name)).join(' → ') }} ·
        {{ t('planner.previewBack') }} <b>{{ formatClock(previewSchedule.end) }}</b>
      </p>
    </div>

    <TourTimeline v-if="started && schedule" :gardens="gardens" :schedule="schedule" />
  </section>
  </ClientOnly>
</template>
