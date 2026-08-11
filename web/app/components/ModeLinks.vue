<script setup lang="ts">
import type { Mode, PlanningMode, Waypoint } from '#core'
import { travelTimes } from '#core'

/**
 * Alle drei Fahrzeiten pro Etappe, jede verlinkt auf die echte Verbindung.
 *
 * Das ist keine Spielerei, sondern die Konsequenz aus einem geschätzten
 * Modell: wer die Zahl anzweifelt, kommt mit einem Tipp zur belastbaren
 * Auskunft. Solange kein Valhalla dahintersteht, bleibt das so.
 */
const props = defineProps<{
  from: Waypoint & { name?: string }
  to: Waypoint & { name?: string }
  selected: Mode
  mode: PlanningMode
  maxLegMinutes: number
}>()

const MODES: Mode[] = ['walk', 'bike', 'transit']

const times = computed(() => travelTimes(props.from, props.to))

const overLimit = (mode: Mode) =>
  props.mode !== 'mix' && times.value[mode] > props.maxLegMinutes
</script>

<template>
  <div class="legmodes">
    <a
      v-for="option in MODES"
      :key="option"
      class="lm"
      :class="{ sel: option === selected, over: overLimit(option) }"
      :href="directionsUrl(from, to, option)"
      target="_blank"
      rel="noopener"
    >
      {{ MODE_LABELS[option] }} <b>{{ times[option] }}</b> min
    </a>
  </div>
</template>
