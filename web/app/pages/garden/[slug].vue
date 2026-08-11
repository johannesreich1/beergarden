<script setup lang="ts">
import { brewerySlug, isOnWater } from '#core'

/**
 * Die Detailseite ist der SEO-relevante Teil des Projekts: ein Verzeichnis
 * lebt von organischem Traffic, und danach sucht man mit Namen. Deshalb wird
 * sie vorgerendert und braucht in Produktion keinen Node-Prozess.
 */
definePageMeta({ path: '/biergarten/:slug()' })

const route = useRoute()
const { data: gardens } = await useGardens()

const garden = computed(() => gardens.value.find((entry) => entry.slug === route.params.slug))

if (!garden.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Diesen Biergarten kenne ich nicht.',
    fatal: true,
  })
}

const brewery = computed(() => breweryStyle(brewerySlug(garden.value!)))

const today = ref<number | null>(null)

onMounted(() => {
  today.value = new Date().getDay() || 7
})

useHead({ title: `${garden.value.name} · Biergarten Freunde` })

useSeoMeta({
  description: () =>
    garden.value?.description ??
    `${garden.value?.name} in München — Öffnungszeiten, Ausschank und Anfahrt.`,
})
</script>

<template>
  <section v-if="garden">
    <NuxtLink to="/verzeichnis" class="back">← Alle Biergärten</NuxtLink>

    <div class="detailseite">
    <div class="haupt">
    <div class="detail-head">
      <h2>{{ garden.name }}</h2>
      <div class="gmeta">
        {{ brewery.label }} · {{ garden.district }} · {{ formatSeats(garden.seats) }}
      </div>
      <div v-if="isOnWater(garden)" class="water">Am Wasser</div>
    </div>

    <p v-if="garden.description" class="desc">{{ garden.description }}</p>
    <div v-if="garden.caveat" class="warnbox">{{ garden.caveat }}</div>

    <div class="facts">
      <span
        v-for="tag in garden.tags"
        :key="tag"
        class="fact"
      >{{ TAG_LABELS[tag] ?? tag }}</span>
      <span class="fact">{{ garden.selfService ? 'Selbstbedienung' : 'nur Bedienung' }}</span>
      <span v-if="garden.ownFoodAllowed" class="fact">Eigene Brotzeit erlaubt</span>
      <span v-if="garden.stationWalkMin !== null" class="fact">
        {{ garden.stationWalkMin }} min von der Haltestelle
      </span>
      <span class="fact">{{ garden.zone === 'umland' ? 'Umland' : 'Stadtgebiet' }}</span>
    </div>

    </div>

    <aside class="neben">
    <div class="section-title"><h2>Öffnungszeiten</h2><div class="rule" /></div>
    <OpeningHoursTable :garden="garden" :today="today" />

    <div class="actions">
      <a class="btn gold" :href="mapsSearchUrl(garden.name)" target="_blank" rel="noopener">
        Auf Google Maps
      </a>
      <NuxtLink class="btn" to="/">Tour hierhin bauen</NuxtLink>
    </div>
    </aside>
    </div>
  </section>
</template>
