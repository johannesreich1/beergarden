<script setup lang="ts">
import type { FaqItem } from '~/components/FaqList.vue'
import type { Garden } from '#core'
import { brewerySlug, matchesDirectoryFilters, planLeg } from '#core'

// English file name, German URL: the page lives on organic traffic, and nobody
// searches for it in English.
definePageMeta({ path: '/verzeichnis' })

const { data: gardens } = await useGardens()

const { t, tm, rt } = useI18n()

usePageSeo(() => ({
  title: t('directory.seoTitle'),
  description: t('directory.seoDescription', { count: gardens.value.length }),
}))

const absoluteUrl = useAbsoluteUrl()

/*
 * Where this page sits in the site. Two steps, because that is how deep it is —
 * the detail pages below it carry the third.
 */
useJsonLd(() => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: t('nav.home'), item: absoluteUrl('/') },
    { '@type': 'ListItem', position: 2, name: t('nav.directory'), item: absoluteUrl('/verzeichnis') },
  ],
}))

const planner = usePlanner()
const { state, visitedSet, hydrated } = planner

onMounted(planner.hydrate)

const query = ref('')

const matchesQuery = (garden: Garden): boolean => {
  const term = query.value.trim().toLowerCase()
  if (!term) return true

  const haystack = [
    garden.name,
    garden.district ?? '',
    breweryStyle(brewerySlug(garden)).label,
  ].join(' ').toLowerCase()

  return haystack.includes(term)
}

/**
 * Sorted by name and without travel times before hydration.
 *
 * This page is prerendered. Start point and visited gardens live in
 * localStorage — which does not exist at build time. Travel time and sorting
 * only arrive after `hydrate()`. Server and first client render therefore
 * produce the same HTML, so there is no hydration mismatch.
 */
const list = computed(() => {
  const filtered = gardens.value.filter(
    (garden) => matchesDirectoryFilters(garden, state.value.filters, visitedSet.value) && matchesQuery(garden),
  )

  if (!hydrated.value) {
    return [...filtered]
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
      .map((garden) => ({ garden, leg: null }))
  }

  return filtered
    .map((garden) => ({
      garden,
      leg: planLeg(state.value.startPoint, garden, state.value.mode, state.value.maxLegMinutes),
    }))
    .sort((a, b) => a.leg.min - b.leg.min)
})

/**
 * The practical notes, phrased as questions.
 *
 * They used to sit beside the filters as statements. Two things were wrong
 * with that: nobody reads a column of prose while filtering, and a statement
 * cannot be a FAQ entry — search engines index questions. They now stand at
 * the foot of the page, where a long list ends and someone is actually
 * looking for the caveats, and they carry their own schema.org markup.
 *
 * An array in the locale file: the page no longer knows how many questions
 * there are, so editing the FAQ is a data change, not a code change.
 */
const faq = computed((): FaqItem[] =>
  (tm('directory.faq') as Array<{ q: unknown, a: unknown }>).map((item) => ({
    question: rt(item.q as string),
    answer: rt(item.a as string),
  })),
)
</script>

<template>
  <h1 class="page-title stamped">{{ t('directory.title') }}</h1>

  <section class="stage">
    <div class="controls">
    <input
      v-model="query"
      class="inp"
      type="search"
      :aria-label="t('directory.searchAria')"
      :placeholder="t('directory.searchPlaceholder')"
      style="width: 100%; margin-top: 22px"
      autocomplete="off"
    >

    <FilterControls :gardens="gardens" />

    </div>

    <div class="results">
    <div class="count">
      {{ t('directory.countLine', { shown: list.length, total: gardens.length }) }}
      <template v-if="hydrated"> {{ t('directory.travelFrom', { start: state.startPoint.name }) }}</template>
    </div>

    <div class="glist">
      <div v-if="!list.length" class="empty">{{ t('directory.empty') }}</div>
      <!--
        The weekday waits for the browser, like the start point does.

        This page is prerendered, so `state.weekday` is the planner's default
        until `hydrate()` runs. A closing-day chip in the delivered HTML would
        therefore name the day the build ran, and a crawler reads that as a
        fact about the garden. The landing page solved the same problem by
        giving `GardenTeaser` no day-dependent fields at all. Here the row
        keeps them, because in the browser they are what the list is read for —
        it only holds them back until it knows what day it is.
      -->
      <GardenRow
        v-for="entry in list"
        :key="entry.garden.slug"
        :garden="entry.garden"
        :leg="entry.leg"
        :start="hydrated ? state.startPoint : null"
        :mode="state.mode"
        :max-leg-minutes="state.maxLegMinutes"
        :weekday="hydrated ? state.weekday : null"
        :visited="visitedSet.has(entry.garden.slug)"
      />
    </div>

    </div>
  </section>

  <!-- At the foot, where the list ends and the caveats are what someone is
       still looking for. Full width: this is reading, not filtering. -->
  <section class="faq">
    <SectionTitle :title="t('directory.faqTitle')" />
    <FaqList :items="faq" />
  </section>
</template>
