<script setup lang="ts">
import type { Filters, Garden } from '#core'
import { brewerySlug } from '#core'

const props = defineProps<{
  gardens: Garden[]
  /** The water switch is worded differently in the planner than in the directory. */
  waterLabel?: string
}>()

const { state, toggle, persist } = usePlanner()

type BooleanFilter = Extract<
  keyof Filters,
  'waterRequired' | 'selfServiceOnly' | 'ownFoodOnly' | 'unvisitedOnly' | 'cityOnly'
>

const breweryCounts = computed(() => {
  const counts: Record<string, number> = {}

  for (const garden of props.gardens) {
    const slug = brewerySlug(garden)
    counts[slug] = (counts[slug] ?? 0) + 1
  }

  return counts
})

// Only show breweries that occur in the data. A tile with a zero on it is not
// a filter but a dead end.
const breweries = computed(() =>
  Object.keys(BREWERY_STYLES).filter((slug) => breweryCounts.value[slug] > 0),
)

// "Nur neue" used to sit among the other switches and was also named
// differently from what it does. It gets its own place now.
const extras = computed<{ key: BooleanFilter, label: string }[]>(() => [
  { key: 'waterRequired', label: props.waterLabel ?? 'Mind. einer am Wasser' },
  { key: 'selfServiceOnly', label: 'Selbstbedienung' },
  { key: 'ownFoodOnly', label: 'Eigene Brotzeit' },
  { key: 'cityOnly', label: 'Nur Stadtgebiet' },
])

const visitedCount = computed(() => state.value.visited.length)

/** Include visited gardens (the default) or exclude them. */
function setVisitedFilter(exclude: boolean): void {
  state.value.filters.unvisitedOnly = exclude
  persist()
}

function toggleExtra(key: BooleanFilter): void {
  state.value.filters[key] = !state.value.filters[key]
  persist()
}
</script>

<template>
  <div class="panel">
    <span class="eyebrow">Was du willst</span>

    <div class="frow">
      <button
        v-for="(label, tag) in TAG_LABELS"
        :key="tag"
        class="chip"
        :aria-pressed="state.filters.tags.includes(tag)"
        @click="toggle(state.filters.tags, tag)"
      >
        {{ label }}
      </button>
    </div>

    <div class="mats" style="margin-top: 13px">
      <button
        v-for="slug in breweries"
        :key="slug"
        class="mat"
        :style="{ '--bc': breweryStyle(slug).color }"
        :aria-pressed="state.filters.breweries.includes(slug)"
        @click="toggle(state.filters.breweries, slug)"
      >
        <span>
          <template v-for="(line, index) in breweryStyle(slug).short" :key="index">
            {{ line }}<br v-if="index < breweryStyle(slug).short.length - 1">
          </template>
          <small>{{ breweryCounts[slug] }}</small>
        </span>
      </button>
    </div>

    <div class="frow" style="margin-top: 13px">
      <button
        v-for="extra in extras"
        :key="extra.key"
        class="chip"
        :aria-pressed="state.filters[extra.key]"
        @click="toggleExtra(extra.key)"
      >
        {{ extra.label }}
      </button>
    </div>

    <div class="visited-filter">
      <span class="eyebrow">Wo ich schon war</span>
      <div class="pair">
        <button
          class="chip gold"
          :aria-pressed="!state.filters.unvisitedOnly"
          @click="setVisitedFilter(false)"
        >Dabei</button>
        <button
          class="chip gold"
          :aria-pressed="state.filters.unvisitedOnly"
          @click="setVisitedFilter(true)"
        >Raus</button>
      </div>
      <div class="tally">
        {{ visitedCount }} abgestempelt
        <template v-if="visitedCount === 0"> · noch nichts</template>
      </div>
    </div>
  </div>
</template>
