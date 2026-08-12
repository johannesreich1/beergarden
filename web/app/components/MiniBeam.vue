<script setup lang="ts">
import type { Route } from '#core'
import { formatClock } from '#core'

/**
 * A suggestion's evening as one sliver of a bar.
 *
 * Travel and stay alternate, the way home closes it, the sun is a tick. It
 * exists so tours can be compared before one is opened: two suggestions with
 * the same headline numbers can still spend the evening very differently —
 * one long sit by the water against three short hops — and that shape is
 * exactly what a list of minutes cannot show.
 *
 * Non-interactive on purpose. The full beam on the chosen tour answers
 * questions; this one only has to make the shape visible.
 */
const props = defineProps<{
  route: Route
  startMinutes: number
  sunsetMinutes: number
}>()

const pieces = computed(() => {
  const raus: Array<{ kind: 'leg' | 'stay', mode?: string, min: number }> = []

  props.route.slugs.forEach((_, index) => {
    const leg = props.route.legs[index]
    raus.push({ kind: 'leg', mode: leg.mode, min: leg.min })
    raus.push({ kind: 'stay', min: props.route.stays[index] })
  })
  raus.push({ kind: 'leg', mode: props.route.back.mode, min: props.route.back.min })

  return raus
})

const total = computed(() => pieces.value.reduce((sum, piece) => sum + piece.min, 0))

/** Where the sun falls inside the bar — or null when the evening ends first. */
const sunShare = computed(() => {
  const share = ((props.sunsetMinutes - props.startMinutes) / total.value) * 100

  return share > 0 && share < 100 ? share : null
})
</script>

<template>
  <span class="mini-beam" aria-hidden="true">
    <i
      v-for="(piece, index) in pieces"
      :key="index"
      :class="[piece.kind, piece.mode]"
      :style="{ flex: piece.min }"
    />
    <u
      v-if="sunShare !== null"
      :style="{ left: `${sunShare}%` }"
      :title="`Sonnenuntergang ${formatClock(sunsetMinutes)}`"
    />
  </span>
  <span class="spanne">
    <span>{{ formatClock(startMinutes) }}</span>
    <span>{{ formatClock(startMinutes + total) }}</span>
  </span>
</template>
