<script setup lang="ts">
import type { Marker } from 'maplibre-gl'
import type { Candidate, Garden, PlannerOptions } from '#core'
import { formatClock, nextStops } from '#core'

/**
 * Picking a tour on the map.
 *
 * Simple on purpose, and the simplification is the design: the map IS the list.
 * The first version had a second list of candidates beside it with a reason on
 * every line — the same gardens twice, once as markers and once as rows, and a
 * column of explanations for places nobody had asked about yet. Everything a
 * marker needs to say fits on the marker: the name and the minutes. Everything
 * else is answered by tapping it.
 *
 * One tap means one thing. On a garden: add it. On a stop already in the tour:
 * take it out. Nothing here sets the start point and nothing opens a detail
 * page — a map where a tap could mean four things is a map nobody taps.
 *
 * What is reachable is shown by strength, not by a circle. An isochrone drawn
 * from straight-line distance times a detour factor would claim an accuracy
 * this project does not have; the minutes stand on the marker, where they can
 * be checked.
 */
const props = defineProps<{
  gardens: Garden[]
  options: PlannerOptions
  chosen: string[]
  /** The legs of the current plan, so the map can draw what was decided. */
  legs?: Array<{ mode: string, min: number }>
  stays: Record<string, number>
  timeMode: 'fixed' | 'flexible'
}>()

const emit = defineEmits<{ add: [slug: string], remove: [slug: string] }>()

const container = ref<HTMLElement>()

const candidates = computed(() =>
  nextStops(props.gardens, props.chosen, props.options, props.stays),
)

/** Under a fixed window, what does not fit cannot be tapped at all. */
const pickable = (candidate: Candidate) =>
  props.timeMode === 'flexible' ? candidate.reason !== 'closed' : candidate.fits

const chosenGardens = computed(() =>
  props.chosen
    .map((slug) => props.gardens.find((garden) => garden.slug === slug))
    .filter((garden) => garden !== undefined),
)

/*
 * Framed once, then left alone.
 *
 * It used to re-frame on every pick, and that was wrong twice over: two stops
 * close together zoom the map right in, and what you lose is exactly the ring
 * of candidates you were about to choose from. Worse, a tap that both adds a
 * stop AND moves the ground under your finger breaks the rule the rest of this
 * surface follows — one tap, one thing. Panning and zooming stay yours.
 */
const { map } = useMap(container, {
  center: point(props.options.start),
  // The city, plus enough of its edge that the Umland gardens are reachable by
  // panning rather than absent. Zoom 11 held every garden at once but made the
  // Altstadt a knot of markers a thumb cannot separate.
  zoom: 11.6,
})

const markers: Marker[] = []

/**
 * A marker's label: the name, and under it the minutes.
 *
 * Both are always in the document. Which of them is visible is a question
 * about the device, not about the data, so the stylesheet answers it: with a
 * pointer the name appears on hover and the map stays legible; without one
 * there is no hover, so the nearest few carry their names outright.
 */
function label(pin: ReturnType<typeof mapPin>, name: string, note: string) {
  // `mapPin` only creates the label element when it is given a text, so asking
  // it for an empty one and filling it afterwards left the marker with nothing
  // to write in — and the map with lozenges and no words.
  let b = pin.element.querySelector('b')
  if (!b) {
    b = document.createElement('b')
    pin.element.appendChild(b)
  }

  b.textContent = ''
  const span = document.createElement('span')
  span.className = 'name'
  span.textContent = name
  const em = document.createElement('em')
  em.textContent = note
  b.append(span, em)

  return pin
}

/**
 * The legs, drawn on this map.
 *
 * There used to be a second map underneath, in the tour column, showing the
 * same route again. Two maps of one evening is one map too many: you pick on
 * the upper one and check on the lower one, and the two never quite agree on
 * what you are looking at. The route belongs where it is made.
 */
function drawLegs(instance: NonNullable<typeof map.value>): void {
  // Sources and layers can only be added once the style is there. Called too
  // early this throws — and because it ran first, it took every marker with it.
  if (!instance.isStyleLoaded()) return

  const stops = chosenGardens.value
  let previous: { lat: number, lon: number } = props.options.start

  const features: GeoJSON.Feature[] = stops.map((garden, index) => {
    const leg = props.legs?.[index]
    const feature: GeoJSON.Feature = {
      type: 'Feature',
      properties: { mode: leg?.mode ?? 'walk' },
      geometry: { type: 'LineString', coordinates: [point(previous), point(garden)] },
    }
    previous = garden

    return feature
  })

  ensureSource(instance, 'legs', { type: 'FeatureCollection', features })

  for (const [mode, paint] of Object.entries(legPaint())) {
    ensureLayer(instance, {
      id: `leg-${mode}`,
      type: 'line',
      source: 'legs',
      filter: ['==', ['get', 'mode'], mode],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': paint.color, 'line-width': 3, 'line-dasharray': paint.dash },
    })
  }
}

async function draw(): Promise<void> {
  const instance = map.value
  if (!instance) return

  // Markers first: they need nothing from the style, and a failure further
  // down must not be able to take them with it again.

  const { Marker } = await import('maplibre-gl')
  for (const marker of markers.splice(0)) marker.remove()

  markers.push(
    new Marker(mapPin('start', props.options.start.name))
      .setLngLat(point(props.options.start))
      .addTo(instance),
  )

  chosenGardens.value.forEach((garden, index) => {
    // The number is what fits on a marker; what a tap does belongs in the
    // tooltip. A marker that explains itself is a marker that runs off the map.
    const pin = label(mapPin('on', ''), shortName(garden.name), `Station ${index + 1}`)
    pin.element.classList.add('pick')
    pin.element.title = 'Aus der Tour nehmen'
    pin.element.addEventListener('click', () => emit('remove', garden.slug))
    markers.push(new Marker(pin).setLngLat(point(garden)).addTo(instance))
  })

  /* Without a pointer there is no hover, so the nearest few keep their names
     outright — `nah` is what the stylesheet reaches for on a touch screen. */
  const NAH = 8

  candidates.value.forEach((candidate, index) => {
    const offen = pickable(candidate)
    const pin = label(mapPin('off', ''), shortName(candidate.garden.name), `${candidate.legMinutes} min`)
    pin.element.classList.add('cand', offen ? 'reachable' : 'faded')
    if (index < NAH) pin.element.classList.add('nah')

    if (offen) {
      pin.element.addEventListener('click', () => emit('add', candidate.garden.slug))
      // The unnamed ones say who they are here instead.
      pin.element.title = `${candidate.garden.name} · Ankunft ${formatClock(candidate.arrival)}`
    }
    markers.push(new Marker(pin).setLngLat(point(candidate.garden)).addTo(instance))
  })

  drawLegs(instance)
}

watch([map, candidates], () => { if (map.value) draw() }, { immediate: true })

/* The style arrives after the map object does; the legs need it, so ask again. */
watch(map, (instance) => {
  instance?.on('load', () => draw())
})


onBeforeUnmount(() => {
  for (const marker of markers.splice(0)) marker.remove()
})
</script>

<template>
  <div class="map-shell builder-map">
    <div ref="container" class="map-canvas" />

    <div v-if="chosen.length" class="map-legend">
      <div><i style="border-color: var(--leg-walk); border-top-style: dotted" />zu Fuß</div>
      <div><i style="border-color: var(--leg-bike); border-top-style: dashed" />Rad</div>
      <div><i style="border-color: var(--leg-transit); border-top-style: dashed" />ÖPNV</div>
    </div>

    <!-- An empty map has to say why it is empty. Filters are set on the left,
         two columns away, and nothing on the map itself hints at them. -->
    <p v-if="!candidates.length && !chosen.length" class="builder-hint">
      <b>Keiner passt zu deinen Filtern.</b> Nimm links eine Bedingung raus.
    </p>
    <p v-else-if="!chosen.length" class="builder-hint">
      <b>Tipp einen Biergarten an.</b> Danach zeigt dir die Karte, was von dort aus noch geht.
    </p>
  </div>
</template>
