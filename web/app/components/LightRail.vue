<script setup lang="ts">
import { at, formatClock } from '#core'

/**
 * The light rail: when the tour runs, measured against daylight.
 *
 * The gradient is not decoration — it is the reason the ranking puts places on
 * the water and with a view at the end.
 */
const props = defineProps<{
  arrivals: number[]
  /** Do not call this `sunsetMinutes` — that is the core function's name. */
  sunset: number
}>()

const START = at(14)
const END = at(22)

const percent = (minutes: number) =>
  Math.max(0, Math.min(100, ((minutes - START) / (END - START)) * 100))

const sunsetLabel = computed(() => formatClock(props.sunset))
</script>

<template>
  <!-- Arrivals and sunset both stand as text elsewhere on the page; the
       gradient is the visual telling of it, so assistive tech skips it. -->
  <div aria-hidden="true">
    <div class="rail-track">
      <div class="rail-sunset" :style="{ left: `${percent(sunset)}%` }">
        <em>{{ sunsetLabel }}</em>
      </div>
      <div
        v-for="(arrival, index) in arrivals"
        :key="index"
        class="pip"
        :style="{ left: `${percent(arrival)}%` }"
      />
    </div>
    <div class="rail-scale">
      <span>14</span><span>16</span><span>18</span><span>20</span><span>22</span>
    </div>
  </div>
</template>
