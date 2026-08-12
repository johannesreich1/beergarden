<script setup lang="ts">
import type { Garden } from '#core'

/**
 * A garden's image — or the honest space for it.
 *
 * As long as no licensed photo exists, a stamp stands here rather than a grey
 * box: it is not the file that is missing, it is the licence. The credit is not
 * ornament but a condition — Places and Commons both require it. So an image
 * without a credit counts as no image here.
 */
const props = defineProps<{ garden: Garden }>()

const usable = computed(() => !!props.garden.imageUrl && !!props.garden.imageCredit)
</script>

<template>
  <div class="photo">
    <img
      v-if="usable"
      :src="garden.imageUrl!"
      :alt="$t('photo.alt', { name: garden.name })"
      loading="lazy"
    >
    <span v-else class="placeholder stamped">
      {{ $t('photo.placeholderLine1') }}<br>{{ $t('photo.placeholderLine2') }}<br>{{ $t('photo.placeholderLine3') }}
    </span>

    <a
      v-if="usable && garden.imageSourceUrl"
      class="credit"
      :href="garden.imageSourceUrl"
      target="_blank"
      rel="noopener"
    >{{ garden.imageCredit }}</a>
    <span v-else-if="usable" class="credit">{{ garden.imageCredit }}</span>
  </div>
</template>
