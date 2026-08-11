<script setup lang="ts">
import type { Garden, Leg, PlanningMode, StartPoint } from '#core'
import { brewerySlug, formatClock, isOpenOn, openingWindow } from '#core'

const props = defineProps<{
  garden: Garden
  /** Absent while prerendering — there is no start point yet. */
  leg: Leg | null
  start: StartPoint | null
  mode: PlanningMode
  maxLegMinutes: number
  /**
   * Absent while prerendering, for the same reason the leg is.
   *
   * The directory is built once and served for weeks. Before hydration the
   * weekday is the planner's default, so "dienstags zu" in the delivered HTML
   * is not a fact about the garden but about the day the build ran — and that
   * is what a crawler would index. Everything that depends on the day
   * therefore waits for the browser, exactly as `GardenTeaser` does on the
   * landing page.
   */
  weekday: number | null
  visited: boolean
}>()

const brewery = computed(() => breweryStyle(brewerySlug(props.garden)))
const name = computed(() => breweryName(brewerySlug(props.garden)))
const window = computed(() =>
  props.weekday === null ? null : openingWindow(props.garden, props.weekday),
)
/** "dienstags zu", or null when the garden is open or the day is not known yet. */
const closedLabel = computed(() =>
  props.weekday !== null && !isOpenOn(props.garden, props.weekday)
    ? `${WEEKDAY_NAMES[props.weekday]} zu`
    : null,
)
</script>

<template>
  <div class="g" :class="{ seenrow: visited }" :style="{ '--bc': brewery.color }">
    <div class="gtop">
      <!-- h3 under the page's h1: the level follows the outline, not the size.
           `.g h4,.g h3` in the stylesheet already covers both, so nothing about
           the look changes. -->
      <h3>
        <NuxtLink :to="`/biergarten/${garden.slug}`">{{ garden.name }}</NuxtLink>
        <span v-if="visited" class="seen">warst du</span>
      </h3>
      <span v-if="leg" class="away">≈{{ leg.min }} min</span>
    </div>

    <div class="gmeta">
      <b v-if="name">{{ name }} · </b>{{ metaLine(garden.district, formatSeats(garden.seats)) }}
    </div>

    <ModeLinks
      v-if="leg && start"
      :from="start"
      :to="garden"
      :selected="leg.mode"
      :mode="mode"
      :max-leg-minutes="maxLegMinutes"
    />

    <p v-if="garden.description">{{ garden.description }}</p>
    <p v-if="garden.caveat" class="gnote">{{ garden.caveat }}</p>

    <div class="gtags">
      <span
        v-for="tag in garden.tags"
        :key="tag"
        class="ptag"
        :class="{ w: tag === 'wasser' }"
      >{{ TAG_LABELS[tag] ?? tag }}</span>
      <span v-if="garden.selfService" class="ptag">Selbstbedienung</span>
      <span v-if="window" class="ptag">
        {{ formatClock(window.opensAt) }}–{{ formatClock(window.closesAt) }}
      </span>
      <span v-if="closedLabel" class="ptag" style="color: #E09A55">{{ closedLabel }}</span>
    </div>

    <div class="gact">
      <NuxtLink class="btn" :to="`/biergarten/${garden.slug}`">Details</NuxtLink>
    </div>
  </div>
</template>
