<script setup lang="ts">
import { at, formatClock } from '#core'

/**
 * Die Lichtleiste: wann die Tour läuft, gemessen am Tageslicht.
 *
 * Der Farbverlauf ist kein Schmuck — er ist der Grund, warum das Ranking
 * Wasser- und Aussichtsplätze ans Ende legt.
 */
const props = defineProps<{
  arrivals: number[]
  /** Nicht `sunsetMinutes` nennen — so heißt die gleichnamige Kern-Funktion. */
  sunset: number
}>()

const START = at(14)
const END = at(22)

const percent = (minutes: number) =>
  Math.max(0, Math.min(100, ((minutes - START) / (END - START)) * 100))

const sunsetLabel = computed(() => formatClock(props.sunset))
</script>

<template>
  <div>
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
