<script setup lang="ts">
import type { Garden, Mode, PlanningMode, Route, StartPoint } from '#core'
import { brewerySlug, formatClock, formatDuration, isOnWater, travelTimes } from '#core'

const props = defineProps<{
  route: Route
  rank: number
  gardens: Garden[]
  start: StartPoint
  startMinutes: number
  mode: PlanningMode
  visited: ReadonlySet<string>
  active: boolean
}>()

defineEmits<{ take: [] }>()

const stops = computed(() => props.route.slugs.map(
  (slug) => props.gardens.find((garden) => garden.slug === slug)!,
))

// Not just "you know some of these" but which ones. Otherwise you have to
// pick the tour first to see what the hint refers to.
const chain = computed(() => stops.value.map((garden) => ({
  name: shortName(garden.name),
  visited: props.visited.has(garden.slug),
})))

/** What the whole round would cost in each mode, return leg included. */
const totals = computed(() => {
  const points = [props.start, ...stops.value, props.start]
  const sums: Record<Mode, number> = { walk: 0, bike: 0, transit: 0 }

  for (let i = 0; i < points.length - 1; i++) {
    const times = travelTimes(points[i], points[i + 1])
    sums.walk += times.walk
    sums.bike += times.bike
    sums.transit += times.transit
  }

  return sums
})

const MODES: Mode[] = ['walk', 'bike', 'transit']

const isSelectedMode = (candidate: Mode) =>
  props.mode === candidate ||
  // With 'mix', walking counts as chosen when the tour is walked end to end
  // anyway.
  (props.mode === 'mix' && candidate === 'walk' && props.route.walk === props.route.travel)

const tags = computed(() => {
  const labels: { text: string, water: boolean }[] = []

  if (stops.value.some(isOnWater)) labels.push({ text: 'am Wasser', water: true })
  if (stops.value.some((g) => g.tags.includes('wald'))) labels.push({ text: 'Grün', water: false })
  if (stops.value.some((g) => g.tags.includes('stadt'))) labels.push({ text: 'Stadt', water: false })
  if (stops.value.some((g) => g.tags.includes('aussicht'))) labels.push({ text: 'Aussicht', water: false })
  if (stops.value.some((g) => props.visited.has(g.slug))) {
    labels.push({ text: 'kennst du teilweise', water: false })
  }

  return labels
})

const breweries = computed(() =>
  [...new Set(stops.value.map((garden) => breweryStyle(brewerySlug(garden)).label))].join(' · '),
)
</script>

<template>
  <div class="plan" :class="{ active }">
    <div class="ptop">
      <span class="rank">{{ rank === 0 ? 'Bester Treffer' : `Alternative ${rank}` }}</span>
      <span class="tot">
        {{ formatClock(startMinutes) }}–{{ formatClock(route.end) }} ·
        {{ formatDuration(route.end - startMinutes) }}
      </span>
    </div>

    <div class="chain">
      <template v-for="(stop, index) in chain" :key="stop.name">
        <span v-if="index > 0"> → </span>{{ stop.name
        }}<span v-if="stop.visited" class="seen small">warst du</span>
      </template>
    </div>

    <div class="pmeta">{{ formatStays(route.stays) }} pro Station · {{ route.travel }} min unterwegs</div>

    <div class="legmodes">
      <span
        v-for="option in MODES"
        :key="option"
        class="lm"
        :class="{ sel: isSelectedMode(option) }"
      >{{ MODE_LABELS[option] }} <b>{{ totals[option] }}</b> min</span>
    </div>

    <div class="ptags">
      <span v-for="tag in tags" :key="tag.text" class="ptag" :class="{ w: tag.water }">
        {{ tag.text }}
      </span>
      <span class="ptag">{{ breweries }}</span>
    </div>

    <div class="pact">
      <button class="btn big" :class="{ on: active }" @click="$emit('take')">
        {{ active ? 'Ausgewählt' : 'Diese Tour nehmen' }}
      </button>
    </div>
  </div>
</template>
