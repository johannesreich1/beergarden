<script setup lang="ts">
/**
 * The heading strip: an h2 with its rule, optionally a bottle cap in front.
 *
 * It stands wherever a page changes subject — the planner's columns, the
 * directory's foot, the detail page's sidebar — and it was inlined at every
 * one of those places. One component, so the strip cannot drift into three
 * slightly different shapes.
 *
 * The cap is hidden from assistive tech on purpose: it counts what the list
 * below it shows, and a screen reader announcing "4" before "Vorschläge"
 * says it twice.
 */
defineProps<{ title: string, count?: number }>()
</script>

<template>
  <div class="section-title">
    <span v-if="count !== undefined" class="cap" aria-hidden="true"><i /><b>{{ count }}</b></span>
    <h2>{{ title }}</h2>
    <div class="rule" />
  </div>
</template>
