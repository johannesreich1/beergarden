<script setup lang="ts">
import type { Garden } from '#core'
import { brewerySlug, matchesDirectoryFilters, planLeg } from '#core'

// Dateiname englisch, URL deutsch: die Seite lebt von organischem Traffic,
// und danach sucht niemand auf Englisch.
definePageMeta({ path: '/verzeichnis' })

useHead({ title: 'Alle Biergärten · Biergarten Freunde' })

const { data: gardens } = await useGardens()

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
 * Vor der Hydration nach Namen sortiert und ohne Fahrzeiten.
 *
 * Diese Seite wird vorgerendert. Startpunkt und visitedCount Gärten stehen im
 * localStorage — die gibt es zur Build-Zeit nicht. Erst nach `hydrate()`
 * kommen Fahrzeit und Sortierung dazu. Server und erster Client-Render
 * liefern damit dasselbe HTML, es gibt also keinen Hydration-Konflikt.
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

const TIPS = [
  [
    'Fahrzeiten sind Schätzungen',
    'Die Minuten kommen aus Luftlinie plus Umwegfaktor, nicht aus dem MVV-Fahrplan. Jede Etappe zeigt alle drei Zeiten — Antippen öffnet die echte Route in Google Maps.',
  ],
  [
    'Warum Rad oft gewinnt',
    'Flaucher, Hinterbrühl, Aumeister und Insel Mühle haben keine Haltestelle vor der Tür — mit dem Rad fällt der Fußweg von der Station weg, deshalb sind die Radzeiten dort auffällig kürzer. Wenn du Rad und U-Bahn mischen willst: die Fahrradmitnahme ist werktags von 6 bis 9 und von 16 bis 18 Uhr gesperrt.',
  ],
  [
    'Eigene Brotzeit',
    'Im Selbstbedienungsbereich darfst du dein Essen mitbringen, Getränke nicht. Der Filter zeigt dir, wo das geht.',
  ],
  [
    'Ticket',
    'Im Stadtgebiet reicht eine MVV-Tageskarte Zone M. Für Pullach, Baierbrunn und Unterföhring eine Zone mehr.',
  ],
  [
    'Licht',
    'Der Planer kennt den Sonnenuntergang des jeweiligen Tages und legt Wasser- und Aussichtsplätze ans Ende der Tour. Brauchbares Tageslicht gibt es noch etwa eine halbe Stunde danach.',
  ],
]
</script>

<template>
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

    <!-- Die Praxishinweise stehen auf dem Desktop neben der Liste statt
         darunter — dort liest sie jemand, unter 35 Einträgen niemand. -->
    <div class="section-title"><h2>Praxis</h2><div class="rule" /></div>
    <div class="tips">
      <div v-for="tip in TIPS" :key="tip[0]" class="tip">
        <strong>{{ tip[0] }}</strong><span>{{ tip[1] }}</span>
      </div>
    </div>
    </div>

    <div class="results">
    <div class="count">
      {{ list.length }} von {{ gardens.length }}
      <template v-if="hydrated"> · Fahrzeit ab {{ state.startPoint.name }}</template>
    </div>

    <div class="glist">
      <div v-if="!list.length" class="empty">Nichts gefunden. Filter lockern.</div>
      <GardenRow
        v-for="entry in list"
        :key="entry.garden.slug"
        :garden="entry.garden"
        :leg="entry.leg"
        :start="hydrated ? state.startPoint : null"
        :mode="state.mode"
        :max-leg-minutes="state.maxLegMinutes"
        :weekday="state.weekday"
        :visited="visitedSet.has(entry.garden.slug)"
        @seen="planner.toggleVisited(entry.garden.slug)"
      />
    </div>

    </div>
  </section>
</template>
