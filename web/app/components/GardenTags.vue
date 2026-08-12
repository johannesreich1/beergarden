<script setup lang="ts">
import type { Garden } from '#core'
import { TAGS } from '#core'

/**
 * A garden's character as chips: the tags, then self-service.
 *
 * What stays true about the garden renders here; what depends on the visitor
 * or the day — today's window, a closing-day note — comes through the slot,
 * because only the surface that knows the day may print it.
 */
defineProps<{ garden: Garden }>()

const { tagLabel } = useFormats()
</script>

<template>
  <div class="gtags">
    <span
      v-for="tag in garden.tags"
      :key="tag"
      class="ptag"
      :class="{ w: tag === TAGS.water }"
    >{{ tagLabel(tag) }}</span>
    <span v-if="garden.selfService" class="ptag">{{ $t('common.selfService') }}</span>
    <slot />
  </div>
</template>
