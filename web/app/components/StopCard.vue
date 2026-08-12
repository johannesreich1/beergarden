<script setup lang="ts">
import type { Garden, ScheduleRow } from '#core'
import { brewerySlug, formatClock, formatDuration, isOnWater, openingWindow } from '#core'

const props = defineProps<{
  garden: Garden
  /** null means: skipped, but still part of the tour. */
  row: ScheduleRow | null
  weekday: number
  visited: boolean
  /**
   * Hand-picked tours are removed from, proposed ones are skipped.
   *
   * Skipping keeps a stop in the plan and steps over it — that is what you want
   * when a generator put it there and you are trying its variations. A stop you
   * chose yourself has no such story: taking it out means taking it out.
   */
  removable?: boolean
}>()

const emit = defineEmits<{
  remove: []
  skip: []
  seen: []
  finish: []
  longer: []
  shorter: []
}>()

const { t } = useI18n()
const { seats } = useFormats()

const window = computed(() => openingWindow(props.garden, props.weekday))

const hoursLabel = computed(() =>
  window.value
    ? t('stop.open', { from: formatClock(window.value.opensAt), to: formatClock(window.value.closesAt) })
    : t('stop.closedToday'),
)

const brewery = computed(() => breweryName(brewerySlug(props.garden)))
</script>

<template>
  <div class="node" :class="row ? 'stop' : 'skipped'">
    <div :id="`card-${garden.slug}`" class="card" :class="{ off: !row }">
      <div class="card-top">
        <div>
          <h3>
            <NuxtLink :to="gardenPath(garden.slug)">{{ garden.name }}</NuxtLink>
            <span v-if="visited" class="seen">{{ t('common.seen') }}</span>
          </h3>
          <div v-if="isOnWater(garden)" class="water">{{ t('common.onWater') }}</div>
        </div>
        <div class="time" :class="{ gone: !row }">
          {{ row ? `${formatClock(row.arrive)}–${formatClock(row.depart)}` : '—' }}
          <em>{{ row ? formatDuration(row.duration) : t('stop.skipped') }}</em>
        </div>
      </div>

      <p v-if="garden.description" class="desc">{{ garden.description }}</p>

      <div class="facts">
        <span v-if="brewery" class="fact">{{ brewery }}</span>
        <span class="fact">{{ seats(garden.seats) }}</span>
        <span class="fact">{{ garden.selfService ? t('common.selfService') : t('common.servedOnly') }}</span>
        <span class="fact">{{ hoursLabel }}</span>
      </div>

      <div v-if="garden.caveat" class="warnbox">{{ garden.caveat }}</div>

      <div class="actions">
        <NuxtLink class="btn" :to="gardenPath(garden.slug)">{{ t('common.details') }}</NuxtLink>
        <button v-if="removable" class="btn warn" @click="emit('remove')">
          {{ t('stop.remove') }}
        </button>
        <button v-else class="btn" :class="{ warn: !row }" @click="emit('skip')">
          {{ row ? t('stop.skip') : t('stop.unskip') }}
        </button>
        <button class="btn" :class="{ on: visited }" @click="emit('seen')">{{ t('common.markSeen') }}</button>
        <button v-if="row && !row.isLast" class="btn" @click="emit('finish')">{{ t('stop.finish') }}</button>
        <span v-if="row" class="dur">
          <button :aria-label="t('stop.shorterAria')" @click="emit('shorter')">–</button>
          <span>{{ formatDuration(row.duration) }}</span>
          <button :aria-label="t('stop.longerAria')" @click="emit('longer')">+</button>
        </span>
      </div>
    </div>
  </div>
</template>
