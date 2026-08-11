<script setup lang="ts">
import type { Garden } from '#core'
import { brewerySlug } from '#core'

/**
 * A garden as a link, for prerendered prose pages.
 *
 * Deliberately not `GardenRow`: that row carries travel time, today's opening
 * state and actions — all of which depend on the visitor and on the day. On a
 * page that is built once and then served for weeks, "dienstags zu" would
 * freeze the build day and get indexed as a fact. So this one shows only what
 * stays true: name, place, size, and what the garden is.
 *
 * The look is the directory row's, down to the class names — same thing to
 * look at, so the same styles.
 */
const props = defineProps<{ garden: Garden }>()

const brewery = computed(() => breweryStyle(brewerySlug(props.garden)))
const name = computed(() => breweryName(brewerySlug(props.garden)))
</script>

<template>
  <div class="g" :style="{ '--bc': brewery.color }">
    <div class="gtop">
      <h3>
        <NuxtLink :to="`/biergarten/${garden.slug}`">{{ garden.name }}</NuxtLink>
      </h3>
    </div>

    <div class="gmeta">
      <b v-if="name">{{ name }} · </b>{{ metaLine(garden.district, formatSeats(garden.seats)) }}
    </div>

    <p v-if="garden.description">{{ garden.description }}</p>

    <div class="gtags">
      <span
        v-for="tag in garden.tags"
        :key="tag"
        class="ptag"
        :class="{ w: tag === 'wasser' }"
      >{{ TAG_LABELS[tag] ?? tag }}</span>
      <span v-if="garden.selfService" class="ptag">Selbstbedienung</span>
    </div>
  </div>
</template>
