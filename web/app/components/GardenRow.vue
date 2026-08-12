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
   * weekday is the planner's default, so a closing-day chip in the delivered
   * HTML would state the build day rather than anything about the garden — and
   * that is what a crawler indexes. Everything that depends on the day
   * therefore waits for the browser, exactly as `GardenTeaser` does on the
   * landing page.
   */
  weekday: number | null
  visited: boolean
}>()

const { t } = useI18n()

const brewery = computed(() => breweryStyle(brewerySlug(props.garden)))
const window = computed(() =>
  props.weekday === null ? null : openingWindow(props.garden, props.weekday),
)
/** "dienstags zu", or null when the garden is open or the day is not known yet. */
const closedLabel = computed(() =>
  props.weekday !== null && !isOpenOn(props.garden, props.weekday)
    ? t('directoryPage.closedOn', { weekday: t(`weekdays.adverb.${props.weekday}`) })
    : null,
)
</script>

<template>
  <div class="g" :class="{ seenrow: visited }" :style="{ '--bc': brewery.color }">
    <div class="gtop">
      <!-- h3, not h4: the level follows the page's outline, not the size on
           screen. The row's heading is styled through `.g`, so the look does
           not depend on which tag it is. -->
      <h3>
        <NuxtLink :to="gardenPath(garden.slug)">{{ garden.name }}</NuxtLink>
        <span v-if="visited" class="seen">{{ t('common.seen') }}</span>
      </h3>
      <span v-if="leg" class="away">≈{{ leg.min }} min</span>
    </div>

    <GardenMeta :garden="garden" />

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

    <GardenTags :garden="garden">
      <span v-if="window" class="ptag">
        {{ formatClock(window.opensAt) }}–{{ formatClock(window.closesAt) }}
      </span>
      <span v-if="closedLabel" class="ptag zu">{{ closedLabel }}</span>
    </GardenTags>

    <div class="gact">
      <NuxtLink class="btn" :to="gardenPath(garden.slug)">{{ t('common.details') }}</NuxtLink>
    </div>
  </div>
</template>
