<script setup lang="ts">
import type { Garden } from '#core'

const props = defineProps<{ gardens: Garden[] }>()

const { state, toggle, persist } = usePlanner()

const { t } = useI18n()
const { tagLabel } = useFormats()

const counts = computed(() => breweryCounts(props.gardens))
const breweries = computed(() => presentBreweries(props.gardens))

/*
 * The shared list, minus `unvisitedOnly` — that one has its own place below.
 * Only the water label bends: in this list the switch means THIS garden is on
 * the water, so it wears the tag's name; in the planner the same key wishes
 * for a stop and says so. Different meanings, different sentences.
 */
const extras = computed<{ key: ExtraFilter, label: string }[]>(() =>
  EXTRA_FILTERS.filter((key) => key !== 'unvisitedOnly').map((key) => ({
    key,
    label: key === 'waterRequired' ? t('tags.wasser') : t(`extras.${key}`),
  })),
)

const visitedCount = computed(() => state.value.visited.length)

/** Include visited gardens (the default) or exclude them. */
function setVisitedFilter(exclude: boolean): void {
  state.value.filters.unvisitedOnly = exclude
  persist()
}

function toggleExtra(key: ExtraFilter): void {
  state.value.filters[key] = !state.value.filters[key]
  persist()
}
</script>

<template>
  <div class="panel">
    <span class="eyebrow">{{ t('filterControls.whatYouWant') }}</span>

    <div class="frow">
      <button
        v-for="tag in TAG_KEYS"
        :key="tag"
        class="chip"
        :aria-pressed="state.filters.tags.includes(tag)"
        @click="toggle(state.filters.tags, tag)"
      >
        {{ tagLabel(tag) }}
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
          <small>{{ counts[slug] }}</small>
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
      <span class="eyebrow">{{ t('filterControls.whereIWas') }}</span>
      <div class="pair">
        <button
          class="chip gold"
          :aria-pressed="!state.filters.unvisitedOnly"
          @click="setVisitedFilter(false)"
        >{{ t('filterControls.includeVisited') }}</button>
        <button
          class="chip gold"
          :aria-pressed="state.filters.unvisitedOnly"
          @click="setVisitedFilter(true)"
        >{{ t('filterControls.excludeVisited') }}</button>
      </div>
      <div class="tally">
        {{ t('filterControls.stamped', { n: visitedCount }) }}
        <template v-if="visitedCount === 0"> {{ t('filterControls.nothingYet') }}</template>
      </div>
    </div>
  </div>
</template>
