<script setup lang="ts">
/**
 * Questions and answers — once as text, once as schema.org.
 *
 * Both come out of the same array. Written twice they drift, and a FAQPage
 * whose markup promises something the page does not say is exactly the
 * mismatch Google penalises.
 */

export interface FaqItem {
  question: string
  answer: string
}

const props = defineProps<{ items: FaqItem[] }>()

useJsonLd(() => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: props.items.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  })),
}))
</script>

<template>
  <div class="tips">
    <div v-for="item in items" :key="item.question" class="tip">
      <h3>{{ item.question }}</h3>
      <span>{{ item.answer }}</span>
    </div>
  </div>
</template>
