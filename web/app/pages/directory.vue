<script setup lang="ts">
import type { FaqItem } from '~/components/FaqList.vue'
import type { Garden } from '#core'
import { brewerySlug, matchesDirectoryFilters, planLeg } from '#core'

// English file name, German URL: the page lives on organic traffic, and nobody
// searches for it in English.
definePageMeta({ path: '/verzeichnis' })

const { data: gardens } = await useGardens()

usePageSeo(() => ({
  title: 'Alle Biergärten',
  description:
    `Alle ${gardens.value.length} Biergärten in München und Umgebung im Überblick — mit `
    + 'Öffnungszeiten, Ausschank, Selbstbedienung und Fahrzeit ab deinem Startpunkt.',
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
    { '@type': 'ListItem', position: 1, name: 'Startseite', item: absoluteUrl('/') },
    { '@type': 'ListItem', position: 2, name: 'Alle Biergärten', item: absoluteUrl('/verzeichnis') },
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
 */
const FRAGEN: FaqItem[] = [
  {
    question: 'Stimmen die angezeigten Fahrzeiten?',
    answer:
      'Die Minuten kommen aus Luftlinie plus Umwegfaktor, nicht aus dem MVV-Fahrplan. '
      + 'Jede Etappe zeigt alle drei Zeiten — Antippen öffnet die echte Route in Google Maps.',
  },
  {
    question: 'Warum ist das Radl so oft schneller als die Bahn?',
    answer:
      'Flaucher, Hinterbrühl, Aumeister und Insel Mühle haben keine Haltestelle vor der Tür. '
      + 'Mit dem Radl fällt der Fußweg von der Station weg, deshalb sind die Radzeiten dort '
      + 'auffällig kürzer. Wer Radl und U-Bahn mischen will: die Fahrradmitnahme ist werktags '
      + 'von 6 bis 9 und von 16 bis 18 Uhr gesperrt.',
  },
  {
    question: 'Darf ich meine eigene Brotzeit mitbringen?',
    answer:
      'Im Selbstbedienungsbereich ja, das Essen betreffend — Getränke nicht. '
      + 'Der Filter zeigt, wo das geht.',
  },
  {
    question: 'Welches MVV-Ticket brauche ich?',
    answer:
      'Im Stadtgebiet reicht eine Tageskarte für die Zone M. Für Pullach, Baierbrunn und '
      + 'Unterföhring eine Zone mehr.',
  },
  {
    question: 'Wie lange kann ich abends draußen sitzen?',
    answer:
      'Der Planer kennt den Sonnenuntergang des jeweiligen Tages und legt Wasser- und '
      + 'Aussichtsplätze ans Ende der Tour. Brauchbares Tageslicht gibt es danach noch '
      + 'etwa eine halbe Stunde.',
  },
]
</script>

<template>
  <h1 class="page-title stamped">Alle Biergärten in München</h1>

  <section class="stage">
    <div class="controls">
    <input
      v-model="query"
      class="inp"
      type="search"
      placeholder="Suchen: Name, Stadtteil, Brauerei …"
      style="width: 100%; margin-top: 22px"
      autocomplete="off"
    >

    <FilterControls :gardens="gardens" water-label="Am Wasser" />

    </div>

    <div class="results">
    <div class="count">
      {{ list.length }} von {{ gardens.length }}
      <template v-if="hydrated"> · Fahrzeit ab {{ state.startPoint.name }}</template>
    </div>

    <div class="glist">
      <div v-if="!list.length" class="empty">Nichts gefunden. Filter lockern.</div>
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
    <div class="section-title"><h2>Häufige Fragen</h2><div class="rule" /></div>
    <FaqList :items="FRAGEN" />
  </section>
</template>
