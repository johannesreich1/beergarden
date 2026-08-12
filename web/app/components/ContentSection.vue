<script setup lang="ts">
/**
 * A titled block of prose.
 *
 * The heading strip is the same one the planner and the directory use, so a
 * text page does not invent a second look for the same thing. The `id` is what
 * a table of contents and a `#`-link hang on.
 */
defineProps<{ title: string, id?: string }>()
</script>

<template>
  <section :id="id">
    <SectionTitle :title="title" />
    <slot />
  </section>
</template>
