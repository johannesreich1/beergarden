<script setup lang="ts">
import type { Garden, Schedule, ScheduleRow } from '#core'
import { BACK_LEG, formatClock, formatDuration } from '#core'

/**
 * The chosen tour, start to way home: beams, map, the timeline of stops and
 * the totals underneath.
 *
 * Everything that edits the tour in place lives here — skipping, stay
 * lengths, per-leg modes, "Hier Schluss". Choosing a tour stays with the
 * page: this component assumes a schedule exists and only ever changes it.
 */
const props = defineProps<{ gardens: Garden[], schedule: Schedule }>()

const { t } = useI18n()

const planner = usePlanner()
const { state, visitedSet, sunset, planEdited } = planner

const plannedGardens = computed(() => gardensFor(state.value.plan?.slugs ?? [], props.gardens))

const rowFor = (slug: string) =>
  props.schedule.rows.find((row) => row.garden.slug === slug) ?? null

/** Where a leg starts. The guard is for waypoints that carry no name at all. */
const fromName = (row: ScheduleRow) => ('name' in row.from ? String(row.from.name) : '')

const overBudget = computed(
  () => props.schedule.end - state.value.startMinutes > state.value.budgetMinutes,
)

const walkMinutes = computed(() => {
  const legs = props.schedule.rows.reduce(
    (sum, row) => sum + (row.legMode === 'walk' ? row.legMinutes : 0),
    0,
  )

  return legs + (props.schedule.back.mode === 'walk' ? props.schedule.back.min : 0)
})

const currentDuration = (slug: string) => {
  const planned = state.value.plan
  const index = planned?.slugs.indexOf(slug) ?? -1

  return state.value.durations[slug] ?? (index >= 0 ? planned!.stays[index]! : 90)
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

/** A tap on a map pin lands on the stop's card, not somewhere near it. */
function scrollToCard(slug: string): void {
  document.getElementById(`card-${slug}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
</script>

<template>
  <div id="tour" class="tour-column">
    <SectionTitle :title="t('timeline.title')" />

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
      @select="scrollToCard"
    />

    <div class="tl">
      <div class="node">
        <div class="leg">
          <span class="mode">{{ t('timeline.start') }}</span>
          <b style="color: var(--foam)">{{ formatClock(state.startMinutes) }}</b> ·
          {{ state.startPoint.name }}
        </div>
      </div>

      <template v-for="garden in plannedGardens" :key="garden.slug">
        <div v-if="rowFor(garden.slug)" class="node">
          <div class="leg" :class="rowFor(garden.slug)!.legMode">
            <span class="mode">
              {{ t(`modes.${rowFor(garden.slug)!.legMode}`) }} · ≈{{ rowFor(garden.slug)!.legMinutes }} min
            </span>
            {{ t('timeline.from', { name: fromName(rowFor(garden.slug)!) }) }}
            <template v-if="rowFor(garden.slug)!.legMode === 'transit'">{{ t('timeline.transfers') }}</template>
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
            {{ t(`modes.${schedule.back.mode}`) }} · ≈{{ schedule.back.min }} min
          </span>
          {{ t('timeline.back', { name: state.startPoint.name }) }}
          <ModeLinks
            :from="schedule.rows[schedule.rows.length - 1]!.garden"
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
          <span class="mode">{{ t('timeline.target') }}</span>
          <b style="color: var(--foam)">{{ formatClock(schedule.end) }}</b> ·
          {{ state.startPoint.name }}
        </div>
      </div>
    </div>

    <div class="total">
      <div class="row">
        <div class="eyebrow">{{ t('timeline.doorToDoor') }}</div>
        <strong>{{ formatDuration(schedule.end - state.startMinutes) }}</strong>
      </div>
      <div class="hint" :class="{ over: overBudget }">
        <template v-if="overBudget">
          {{ t('timeline.overBudget', { budget: formatDuration(state.budgetMinutes) }) }}
        </template>
        {{ t('timeline.totals', {
          stations: t('timeline.stations', { count: schedule.rows.length }, schedule.rows.length),
          walk: walkMinutes,
          end: formatClock(schedule.end),
        }) }}
        <template v-if="schedule.rows[schedule.rows.length - 1]!.depart > sunset">
          {{ t('timeline.sunsetFinale') }}
        </template>
      </div>
      <div v-if="planEdited" style="margin-top: 11px">
        <button class="btn" @click="planner.resetPlanEdits">{{ t('timeline.resetEdits') }}</button>
      </div>
    </div>
  </div>
</template>
