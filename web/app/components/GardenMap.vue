<script setup lang="ts">
import type { Garden } from '#core'

/**
 * Where the garden is — the locator map on the detail page.
 *
 * One marker, no route, no other gardens. Whoever opens this page is asking
 * about this one place, and every further pin would answer a question nobody
 * asked. The marker is a DOM element rather than a map icon: it costs no sprite
 * sheet and it is the same lozenge the tour map uses, from the same stylesheet.
 */
const props = defineProps<{ garden: Garden }>()

const container = ref<HTMLElement>()

const { map } = useMap(container, {
  center: point(props.garden),
  // Close enough for the streets around the entrance, wide enough to tell which
  // part of town it is. Below 14 the garden loses its surroundings.
  zoom: 14.4,
})

// The marker goes on as soon as the map object exists — it is a DOM element,
// not a layer, and does not need a rendered frame or a loaded style.
watch(map, async (instance) => {
  if (!instance) return

  const { Marker } = await import('maplibre-gl')

  new Marker(mapPin('on')).setLngLat(point(props.garden)).addTo(instance)
})
</script>

<template>
  <div class="map-shell">
    <div ref="container" class="map-canvas" />
  </div>
</template>
