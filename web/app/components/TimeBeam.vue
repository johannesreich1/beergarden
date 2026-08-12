<script setup lang="ts">
import type { Schedule } from '#core'
import { formatClock, formatDuration } from '#core'

/**
 * The evening as one bar.
 *
 * Every stop adds two pieces to it: the way there and the time spent. Reading
 * that as a bar rather than as a list answers the question a list cannot —
 * how much of the evening is left, and whether the last stop still lands
 * before the sun goes.
 *
 * Widths are shares of the whole, not minutes, so the bar always fills its
 * column. The scale underneath carries the actual clock, because a bar without
 * numbers invites people to measure it with their eyes.
 */
const props = defineProps<{
  schedule: Schedule
  startMinutes: number
  budgetMinutes: number
  sunsetMinutes: number
  /** Under `fixed` the budget is a wall; under `flexible` it is a mark. */
  timeMode: 'fixed' | 'flexible'
}>()

/** Everything the bar has to hold, including the part that runs over. */
const span = computed(() => {
  const budgetEnd = props.startMinutes + props.budgetMinutes
  const end = Math.max(props.schedule.end, budgetEnd, props.sunsetMinutes)

  return { from: props.startMinutes, to: end, length: Math.max(1, end - props.startMinutes) }
})

const share = (minutes: number) => `${(minutes / span.value.length) * 100}%`
const at = (minute: number) => `${((minute - span.value.from) / span.value.length) * 100}%`

/** Travel and stay, in the order they happen. */
const pieces = computed(() => {
  const out: Array<{ kind: 'leg' | 'stay', mode?: string, minutes: number, label: string }> = []

  for (const row of props.schedule.rows) {
    out.push({ kind: 'leg', mode: row.legMode, minutes: row.legMinutes, label: `${row.legMinutes} min` })
    out.push({ kind: 'stay', minutes: row.depart - row.arrive, label: shortName(row.garden.name) })
  }

  return out
})

const overBudget = computed(() => props.schedule.end - props.startMinutes - props.budgetMinutes)

/** Whole hours inside the span — enough to read by, not so many they collide. */
const ticks = computed(() => {
  const out: number[] = []
  for (let m = Math.ceil(span.value.from / 60) * 60; m <= span.value.to; m += 60) out.push(m)

  return out.length > 8 ? out.filter((_, i) => i % 2 === 0) : out
})
</script>

<template>
  <div class="beam">
    <!-- The bar repeats what the stop cards below state as text, so assistive
         tech skips it; the over-budget note stays, it exists nowhere else. -->
    <div class="beam-bar" aria-hidden="true">
      <span
        v-for="(piece, index) in pieces"
        :key="index"
        class="beam-piece"
        :class="[piece.kind, piece.mode]"
        :style="{ width: share(piece.minutes) }"
        :title="piece.label"
      ><b v-if="piece.kind === 'stay'">{{ piece.label }}</b></span>

      <!-- The sun is a fact about the day, the budget a decision by the user —
           so they look different and never merge into one line. -->
      <span class="beam-sun" :style="{ left: at(sunsetMinutes) }" :title="$t('common.sunsetAt', { time: formatClock(sunsetMinutes) })">
        <i /><em>{{ formatClock(sunsetMinutes) }}</em>
      </span>
      <span
        v-if="timeMode === 'flexible' || overBudget > 0"
        class="beam-budget"
        :style="{ left: at(startMinutes + budgetMinutes) }"
      ><i /></span>
    </div>

    <div class="beam-scale" aria-hidden="true">
      <span v-for="tick in ticks" :key="tick" :style="{ left: at(tick) }">{{ formatClock(tick) }}</span>
    </div>

    <p v-if="overBudget > 0" class="beam-note">
      <i18n-t keypath="beam.over">
        <template #over>{{ formatDuration(overBudget) }}</template>
        <template #end><b>{{ formatClock(schedule.end) }}</b></template>
      </i18n-t>
    </p>
  </div>
</template>
