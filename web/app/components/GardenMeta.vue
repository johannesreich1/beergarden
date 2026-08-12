<script setup lang="ts">
import type { Garden } from '#core'
import { brewerySlug } from '#core'

/**
 * The one meta line under a garden's name: brewery bold, then place and size.
 *
 * The directory row and the teaser used to build it separately, each
 * hand-rolling the separator that `metaLine` exists to own — which is exactly
 * how a line ends up starting with a stray dot once a field is missing.
 */
const props = defineProps<{ garden: Garden }>()

const { seats } = useFormats()

const name = computed(() => breweryName(brewerySlug(props.garden)))
const rest = computed(() => metaLine(props.garden.district, seats(props.garden.seats)))
</script>

<template>
  <div class="gmeta">
    <b v-if="name">{{ name }}</b><template v-if="name && rest"> · </template>{{ rest }}
  </div>
</template>
