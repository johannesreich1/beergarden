<script setup lang="ts">
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import type { Garden, ScheduleRow, StartPoint } from '#core'

/**
 * The tour on a real map.
 *
 * The legs are style layers, because they belong to the map and have to be
 * redrawn whenever the palette changes. The stops are DOM markers, because they
 * carry a name and a click — and a label inside a style layer would need a glyph
 * file from somebody else's server, which is the one thing self-hosted tiles are
 * there to avoid.
 */
const props = defineProps<{
  start: StartPoint
  /** Every stop of the plan, including the skipped ones. */
  planned: Garden[]
  rows: ScheduleRow[]
}>()

const emit = defineEmits<{ select: [slug: string] }>()

const container = ref<HTMLElement>()

const activeSlugs = computed(() => new Set(props.rows.map((row) => row.garden.slug)))

/** The legs actually travelled, one line each, tagged with their mode. */
const legs = computed<GeoJSON.FeatureCollection>(() => {
  let previous: StartPoint | Garden = props.start

  return {
    type: 'FeatureCollection',
    features: props.rows.map((row) => {
      const feature: GeoJSON.Feature = {
        type: 'Feature',
        properties: { mode: row.legMode },
        geometry: { type: 'LineString', coordinates: [point(previous), point(row.garden)] },
      }
      previous = row.garden

      return feature
    }),
  }
})

function drawLegs(map: MapLibreMap): void {
  ensureSource(map, 'legs', legs.value)

  for (const [mode, paint] of Object.entries(legPaint())) {
    ensureLayer(map, {
      id: `leg-${mode}`,
      type: 'line',
      source: 'legs',
      filter: ['==', ['get', 'mode'], mode],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': paint.color,
        'line-width': 3,
        'line-dasharray': paint.dash,
      },
    })
  }
}

/** Everything the map has to show: the start and every stop drawn on it. */
const framed = computed(() => [props.start, ...props.planned].map(point))

const { map, fit } = useMap(
  container,
  {
    center: point(props.start),
    zoom: 11.6,
    fit: framed.value,
  },
  drawLegs,
)

/*
 * Reframe when the tour changes.
 *
 * The initial `fit` only knows the tour that existed at construction. Pick a
 * different tour, drop a stop or move the start point, and the new shape can
 * sit half outside the visible section — the lines redraw correctly and nobody
 * sees them. Animated, so it stays obvious that this is the same map.
 */
watch(framed, (points) => fit(points))

// An edit to the plan moves the legs, not their styling: updating the source
// keeps the map from flickering on every turn of a dial.
watch(legs, (value) => {
  const source = map.value?.getSource('legs')
  if (source && 'setData' in source) source.setData(value)
})

/** One marker per stop, rebuilt whenever the plan changes. */
const markers: Marker[] = []

async function placeMarkers(): Promise<void> {
  if (!map.value) return

  const { Marker } = await import('maplibre-gl')

  for (const marker of markers.splice(0)) marker.remove()

  markers.push(
    new Marker(mapPin('start', props.start.name))
      .setLngLat(point(props.start))
      .addTo(map.value),
  )

  for (const garden of props.planned) {
    const options = mapPin(activeSlugs.value.has(garden.slug) ? 'on' : 'off', shortName(garden.name))
    options.element.addEventListener('click', () => emit('select', garden.slug))

    markers.push(new Marker(options).setLngLat(point(garden)).addTo(map.value))
  }
}

// Markers are DOM, not layers: they can go on the moment the map object
// exists, without waiting for a style or a rendered frame.
watch([map, () => props.planned, activeSlugs, () => props.start], () => {
  if (map.value) placeMarkers()
}, { immediate: true })

onBeforeUnmount(() => {
  for (const marker of markers.splice(0)) marker.remove()
})
</script>

<template>
  <div class="map-shell">
    <div ref="container" class="map-canvas" />

    <div class="map-legend">
      <div><i style="border-color: var(--leg-walk); border-top-style: dotted" />zu Fuß</div>
      <div><i style="border-color: var(--leg-bike); border-top-style: dashed" />Rad</div>
      <div><i style="border-color: var(--leg-transit); border-top-style: dashed" />ÖPNV</div>
    </div>
  </div>
</template>
