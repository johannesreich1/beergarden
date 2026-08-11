<script setup lang="ts">
import type { Garden, ScheduleRow } from '#core'
import { brewerySlug, formatClock, formatDuration, isOnWater, openingWindow } from '#core'

const props = defineProps<{
  garden: Garden
  /** null means: skipped, but still part of the tour. */
  row: ScheduleRow | null
  weekday: number
  visited: boolean
}>()

const emit = defineEmits<{
  skip: []
  seen: []
  finish: []
  longer: []
  shorter: []
}>()

const window = computed(() => openingWindow(props.garden, props.weekday))

const hoursLabel = computed(() =>
  window.value
    ? `offen ${formatClock(window.value.opensAt)}–${formatClock(window.value.closesAt)}`
    : 'heute geschlossen',
)

const brewery = computed(() => breweryStyle(brewerySlug(props.garden)))
</script>

<template>
  <div class="node" :class="row ? 'stop' : 'skipped'">
    <div :id="`card-${garden.slug}`" class="card" :class="{ off: !row }">
      <div class="card-top">
        <div>
          <h3>
            <NuxtLink :to="`/biergarten/${garden.slug}`">{{ garden.name }}</NuxtLink>
            <span v-if="visited" class="seen">warst du</span>
          </h3>
          <div v-if="isOnWater(garden)" class="water">Am Wasser</div>
        </div>
        <div class="time" :class="{ gone: !row }">
          {{ row ? `${formatClock(row.arrive)}–${formatClock(row.depart)}` : '—' }}
          <em>{{ row ? formatDuration(row.duration) : 'ausgelassen' }}</em>
        </div>
      </div>

      <p v-if="garden.description" class="desc">{{ garden.description }}</p>

      <div class="facts">
        <span class="fact">{{ brewery.label }}</span>
        <span class="fact">{{ formatSeats(garden.seats) }}</span>
        <span class="fact">{{ garden.selfService ? 'Selbstbedienung' : 'nur Bedienung' }}</span>
        <span class="fact">{{ hoursLabel }}</span>
      </div>

      <div v-if="garden.caveat" class="warnbox">{{ garden.caveat }}</div>

      <div class="actions">
        <NuxtLink class="btn" :to="`/biergarten/${garden.slug}`">Details</NuxtLink>
        <button class="btn" :class="{ warn: !row }" @click="emit('skip')">
          {{ row ? 'Auslassen' : 'Wieder rein' }}
        </button>
        <button class="btn" :class="{ on: visited }" @click="emit('seen')">War ich schon</button>
        <button v-if="row && !row.isLast" class="btn" @click="emit('finish')">Hier Schluss</button>
        <span v-if="row" class="dur">
          <button @click="emit('shorter')">–</button>
          <span>{{ formatDuration(row.duration) }}</span>
          <button @click="emit('longer')">+</button>
        </span>
      </div>
    </div>
  </div>
</template>
