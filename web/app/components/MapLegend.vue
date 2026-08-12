<script setup lang="ts">
import type { Mode } from '#core'

/**
 * Which dash means which mode — the one legend both route maps share.
 *
 * The dashes mirror `legPaint()`: walking is dotted, riding is dashed. The
 * colours come from the same custom properties the layers read, so the legend
 * cannot drift from the map it explains.
 */
const ENTRIES: Array<{ mode: Mode, dash: 'dotted' | 'dashed' }> = [
  { mode: 'walk', dash: 'dotted' },
  { mode: 'bike', dash: 'dashed' },
  { mode: 'transit', dash: 'dashed' },
]
</script>

<template>
  <div class="map-legend">
    <div v-for="entry in ENTRIES" :key="entry.mode">
      <i :style="{ borderColor: `var(--leg-${entry.mode})`, borderTopStyle: entry.dash }" />{{
        $t(`modes.${entry.mode}`) }}
    </div>
  </div>
</template>
