<script setup lang="ts">
import type { Garden, Leg, PlanningMode, StartPoint } from '#core'
import { brewerySlug, formatClock, isOpenOn, openingWindow } from '#core'

const props = defineProps<{
  garden: Garden
  /** Fehlt beim Vorrendern — dort gibt es noch keinen Startpunkt. */
  leg: Leg | null
  start: StartPoint | null
  mode: PlanningMode
  maxLegMinutes: number
  weekday: number
  visited: boolean
}>()

defineEmits<{ seen: [] }>()

const brewery = computed(() => breweryStyle(brewerySlug(props.garden)))
const window = computed(() => openingWindow(props.garden, props.weekday))
const closedToday = computed(() => !isOpenOn(props.garden, props.weekday))
</script>

<template>
  <div class="g" :class="{ seenrow: visited }" :style="{ '--bc': brewery.color }">
    <div class="gtop">
      <h4>
        <NuxtLink :to="`/biergarten/${garden.slug}`">{{ garden.name }}</NuxtLink>
        <span v-if="visited" class="seen">warst du</span>
      </h4>
      <span v-if="leg" class="away">≈{{ leg.min }} min</span>
    </div>

    <div class="gmeta">
      <b>{{ brewery.label }}</b> · {{ garden.district }} · {{ formatSeats(garden.seats) }}
    </div>

    <ModeLinks
      v-if="leg && start"
      :from="start"
      :to="garden"
      :selected="leg.mode"
      :mode="mode"
      :max-leg-minutes="maxLegMinutes"
    />

    <p v-if="garden.description">{{ garden.description }}</p>
    <p v-if="garden.caveat" class="gnote">{{ garden.caveat }}</p>

    <div class="gtags">
      <span
        v-for="tag in garden.tags"
        :key="tag"
        class="ptag"
        :class="{ w: tag === 'wasser' }"
      >{{ TAG_LABELS[tag] ?? tag }}</span>
      <span v-if="garden.selfService" class="ptag">Selbstbedienung</span>
      <span v-if="window" class="ptag">
        {{ formatClock(window.opensAt) }}–{{ formatClock(window.closesAt) }}
      </span>
      <span v-if="closedToday" class="ptag" style="color: #E09A55">
        {{ WEEKDAY_NAMES[weekday] }} zu
      </span>
    </div>

    <div class="gact">
      <a class="btn gold" :href="mapsSearchUrl(garden.name)" target="_blank" rel="noopener">Karte</a>
      <button class="btn" :class="{ on: visited }" @click="$emit('seen')">
        {{ visited ? 'Kennst du' : 'War ich schon' }}
      </button>
    </div>
  </div>
</template>
