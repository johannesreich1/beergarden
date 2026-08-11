<script setup lang="ts">
import { brewerySlug, isOnWater, planLeg } from '#core'

/**
 * A beer garden's entity view, draft "Aufmacher" from
 * design/entity-b-hero.html.
 *
 * It is the SEO-relevant part of the project: a directory lives on organic
 * traffic, and people search for it by name. That is why it is prerendered and
 * needs no Node process in production.
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

/**
 * Whether this garden has been visited.
 *
 * The toggle lives here rather than in the directory: the list stays a list,
 * with one action per row. The stamp still shows there — it just cannot be
 * set from there any more.
 */
const visited = computed(() => visitedSet.value.has(garden.value!.slug))

const planner = usePlanner()
const { state, hydrated, visitedSet } = planner

onMounted(planner.hydrate)

const today = computed(() => (hydrated.value ? new Date().getDay() || 7 : null))

/**
 * Travel time depends on the stored start point and is therefore only known
 * after hydration. Prerendered it would be the time from Candidplatz for
 * everyone — and thus wrong for almost everyone.
 */
const leg = computed(() =>
  hydrated.value && garden.value
    ? planLeg(state.value.startPoint, garden.value, state.value.mode, state.value.maxLegMinutes)
    : null,
)

useHead({ title: `${garden.value.name} · Biergarten Freunde` })

useSeoMeta({
  description: () =>
    garden.value?.description ??
    `${garden.value?.name} in München — Öffnungszeiten, Ausschank und Anfahrt.`,
})
</script>

<template>
  <section v-if="garden" class="entity">
    <div class="actions entity-top">
      <NuxtLink class="btn" to="/verzeichnis">← Alle Biergärten</NuxtLink>
    </div>

    <!--
      Hero: the image across the full width, the name as a stamp half over it.
      The stamp deliberately sits on the edge — an imprint does not respect
      margins.
    -->
    <div class="hero">
      <GardenPhoto :garden="garden" />
      <div class="hero-plate">
        <h2 class="stamped">{{ garden.name }}</h2>
        <span v-if="visited" class="seen">warst du</span>
      </div>
    </div>

    <div class="entity-body">
      <div class="entity-main">
        <div class="gmeta">
          {{ brewery.label }} · {{ garden.district }} · {{ formatSeats(garden.seats) }}
          <template v-if="leg"> · ≈{{ leg.min }} min ab {{ state.startPoint.name }}</template>
        </div>
        <div v-if="isOnWater(garden)" class="water">Am Wasser</div>

        <p v-if="garden.description" class="desc">{{ garden.description }}</p>
        <div v-if="garden.caveat" class="warnbox">{{ garden.caveat }}</div>

        <div class="section-title"><h2>Ausstattung</h2><div class="rule" /></div>
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

        <div class="actions">
          <NuxtLink class="btn on" to="/">Tour hierhin bauen</NuxtLink>
          <button
            class="btn"
            :class="{ warn: visited }"
            @click="planner.toggleVisited(garden.slug)"
          >{{ visited ? 'Warst du schon' : 'War ich schon' }}</button>
          <a class="btn gold" :href="mapsSearchUrl(garden.name)" target="_blank" rel="noopener">
            Auf Google Maps
          </a>
        </div>
      </div>

      <aside class="entity-side">
        <div class="section-title"><h2>Was die Maß kostet</h2><div class="rule" /></div>
        <BeerPriceList :garden="garden" />

        <div class="section-title"><h2>Öffnungszeiten</h2><div class="rule" /></div>
        <OpeningHoursTable :garden="garden" :today="today" />
      </aside>
    </div>
  </section>
</template>
