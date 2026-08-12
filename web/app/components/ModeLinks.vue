<script setup lang="ts">
import type { Mode, PlanningMode, Waypoint } from '#core'
import { travelTimes } from '#core'

/**
 * All three travel times for a leg — and the choice between them.
 *
 * They used to be three links to Google Maps. That was the wrong verb: the
 * times sit inside the plan, so the obvious thing to do with them is to pick
 * one, and every tap left the site instead. Now a tap switches the leg and the
 * whole evening recalculates behind it — arrival, stay, way home, the beam.
 *
 * Showing all three rather than only the chosen one stays for the reason it
 * always did: the numbers are estimates from straight-line distance times a
 * detour factor, and seeing 65 / 22 / 29 side by side says more about their
 * reliability than any single one of them could. Checking against the real
 * connection is still one tap away — as the small map icon beside them, where
 * leaving the page is its own decision instead of a side effect.
 */
const props = defineProps<{
  from: Waypoint & { name?: string }
  to: Waypoint & { name?: string }
  selected: Mode
  mode: PlanningMode
  maxLegMinutes: number
  /** Without this the times are read-only — a proposed tour is not edited here. */
  choosable?: boolean
}>()

const emit = defineEmits<{ choose: [mode: Mode] }>()

const { t } = useI18n()

const times = computed(() => travelTimes(props.from, props.to))

const overLimit = (mode: Mode) =>
  props.mode !== 'mix' && times.value[mode] > props.maxLegMinutes
</script>

<template>
  <div class="legmodes">
    <template v-if="choosable">
      <button
        v-for="option in MODES"
        :key="option"
        class="lm"
        :class="{ sel: option === selected, over: overLimit(option) }"
        :aria-pressed="option === selected"
        :title="option === selected ? t('modeLinks.auto') : t('modeLinks.choose', { mode: t(`modes.${option}`) })"
        @click="emit('choose', option)"
      >
        {{ $t(`modes.${option}`) }} <b>{{ times[option] }}</b> min
      </button>
    </template>

    <template v-else>
      <a
        v-for="option in MODES"
        :key="option"
        class="lm"
        :class="{ sel: option === selected, over: overLimit(option) }"
        :href="directionsUrl(from, to, option)"
        target="_blank"
        rel="noopener"
      >
        {{ $t(`modes.${option}`) }} <b>{{ times[option] }}</b> min
      </a>
    </template>

    <!-- The way out, once instead of three times: which mode it opens follows
         the leg, so the link never contradicts what the plan says. -->
    <a
      v-if="choosable"
      class="lm-maps"
      :href="directionsUrl(from, to, selected)"
      target="_blank"
      rel="noopener"
      :title="t('modeLinks.maps')"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" />
        <circle cx="12" cy="9" r="2.6" />
      </svg>
      <span class="sr-only">{{ t('modeLinks.maps') }}</span>
    </a>
  </div>
</template>
