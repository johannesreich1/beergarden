<script setup lang="ts">
import type { Garden } from '#core'
import {
  brewerySlug,
  distanceKm,
  formatClock,
  isOnWater,
  openingWindow,
  planLeg,
} from '#core'

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

const { t, te } = useI18n()
const { seats: formatSeatCount, tagLabel, beerKind, beerSize } = useFormats()

const garden = computed(() => gardens.value.find((entry) => entry.slug === route.params.slug))

if (!garden.value) {
  throw createError({
    statusCode: 404,
    statusMessage: t('garden.notFound'),
    fatal: true,
  })
}

const brewery = computed(() => breweryName(brewerySlug(garden.value!)))

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

/* ---------- Names that both the page and its markup use ---------- */

/*
 * One name per fact. The chip prints it and the schema.org block states it —
 * a feature the markup names differently from the page is exactly the
 * contradiction this kind of markup gets penalised for. Both read from the
 * same locale key so they cannot drift.
 */
const SELF_SERVICE = t('garden.selfServiceFact')
const OWN_FOOD = t('garden.ownFoodFact')

/** "A", "A und B", "A, B und C" — German enumerations, one rule for all of them. */
function joinList(parts: string[]): string {
  if (parts.length < 2) return parts[0] ?? ''

  return `${parts.slice(0, -1).join(', ')} und ${parts[parts.length - 1]}`
}

/** 1.234 → "1,2 km", 0.42 → "420 m". Below a kilometre the metre is the honest unit. */
function formatKm(km: number): string {
  if (km < 1) return `${Math.round((km * 1000) / 10) * 10} m`

  return `${km.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`
}

/* ---------- Cross-references, all of them start-point independent ---------- */

/**
 * Every other garden, nearest first.
 *
 * Straight-line distance, like everything else here until Valhalla sits behind
 * it — for "which one is next door" that is accurate enough, and unlike a
 * travel time it does not depend on where the reader starts. That is what makes
 * it safe to prerender.
 */
const others = computed(() => {
  const self = garden.value
  if (!self) return []

  return gardens.value
    .filter((entry) => entry.slug !== self.slug)
    .map((entry) => ({ garden: entry, km: distanceKm(self, entry) }))
    .sort((a, b) => a.km - b.km)
})

const nearby = computed(() => others.value.slice(0, 3))
const nearest = computed(() => nearby.value[0] ?? null)

const sameDistrict = computed(() =>
  others.value
    .filter((entry) => entry.garden.district === garden.value!.district)
    .map((entry) => entry.garden),
)

/*
 * The nine gardens without a verified brewery are not a group that shares one.
 * Reading `brewery` rather than `brewerySlug()` is what keeps them apart: the
 * placeholder slug exists so they stay findable as a group in the filters, not
 * so a sentence can claim they all pour the same beer.
 */
const sameBrewery = computed(() => {
  const slug = garden.value?.brewery?.slug
  if (!slug) return []

  return others.value
    .filter((entry) => entry.garden.brewery?.slug === slug)
    .map((entry) => entry.garden)
})

/* ---------- Prose, assembled from the fields and from nothing else ---------- */

/** Where this garden stands by size. Both numbers are counted from the list itself. */
const size = computed(() => {
  const seats = garden.value?.seats
  if (seats === null || seats === undefined) return null

  const known = gardens.value.map((entry) => entry.seats).filter((value) => value !== null)
  if (!known.length) return null

  return {
    seats,
    average: Math.round(known.reduce((sum, value) => sum + value, 0) / known.length),
    rank: known.filter((value) => value > seats).length + 1,
    counted: known.length,
  }
})

/**
 * The week in one sentence — but only when the week really is one sentence.
 *
 * Where the days differ, the table in the sidebar is the better answer; a
 * summary would have to either simplify or list all seven. Naming the closing
 * days is safe on a page that is built once — a fixed closing day holds every
 * week, unlike anything derived from what day it happens to be at build time.
 */
const openingSummary = computed(() => {
  const entry = garden.value
  if (!entry) return null

  const windows = WEEKDAY_VALUES.map((day) => openingWindow(entry, day))
  const open = windows.filter((window) => window !== null)
  const first = open[0]

  if (!first) return null
  if (open.some((window) => window.opensAt !== first.opensAt || window.closesAt !== first.closesAt)) {
    return null
  }

  const closed = WEEKDAY_VALUES.filter((_, index) => windows[index] === null).map(
    (day) => t(`weekdays.adverb.${day}`),
  )

  const hours = t('garden.prose.hours', {
    from: formatClock(first.opensAt),
    to: formatClock(first.closesAt),
  })

  return closed.length
    ? t('garden.prose.hoursClosed', { hours, days: joinList(closed) })
    : t('garden.prose.hoursPlain', { hours })
})

/**
 * The town this garden is in.
 *
 * City gardens are in München by definition of `zone`. For the three in the
 * Umland the district field carries the town's name ahead of the separator,
 * which is the only place it is recorded. Prose and postal address both need
 * it, and neither may invent it: with no district there is no town either.
 */
const locality = computed(() => {
  const entry = garden.value!

  return entry.zone === 'city' ? 'München' : (entry.district?.split('·')[0]?.trim() ?? null)
})

/*
 * The sentences below are built here rather than in the template because German
 * needs the right case and the right spacing, and a template that stitches
 * fragments together with `v-if` gets both wrong the moment the compiler drops
 * a whitespace node.
 */

/** Where it is and how big it is. */
const placement = computed(() => {
  const entry = garden.value!
  const measure = size.value
  const zone = entry.zone === 'umland' ? t('garden.prose.zoneUmland') : t('garden.prose.zoneCity')

  // In the Umland the district field reads "Baierbrunn · Umland" — a list
  // entry, not a sentence. There the town goes in and the zone follows in
  // words; in the city the district is already a name a sentence can use.
  const place = entry.zone === 'umland' ? locality.value : entry.district

  return [
    place
      ? t('garden.prose.placementPlace', { name: entry.name, place, zone })
      : t('garden.prose.placementBare', { name: entry.name, zone }),
    measure ? t('garden.prose.seats', { seats: formatSeatCount(measure.seats) }) : null,
    measure && measure.rank === 1
      ? t('garden.prose.largest', { counted: measure.counted })
      : null,
    measure && measure.rank > 1
      ? t('garden.prose.vsAverage', {
          relation: measure.seats >= measure.average ? t('garden.prose.more') : t('garden.prose.less'),
          counted: measure.counted,
          average: formatSeatCount(measure.average),
        })
      : null,
    // A colon rather than "Ausgeschenkt wird X": one of the labels is
    // "wechselnd", which is not a brewery's name but the statement that there
    // is no fixed one — and that has to fit in the same sentence.
    brewery.value ? t('garden.prose.pour', { brewery: brewery.value }) : null,
  ]
    .filter((part) => part !== null)
    .join(' ')
})

/** How you are served, and when. */
const service = computed(() => {
  const entry = garden.value!

  // `=== true` and `=== false`, not a truthiness test: `null` means the field
  // was not verified, and "not verified" must not come out as "wird bedient".
  return [
    entry.selfService === true ? t('garden.prose.selfService') : null,
    entry.selfService === true && entry.ownFoodAllowed ? t('garden.prose.ownFood') : null,
    entry.selfService === false ? t('garden.prose.served') : null,
    openingSummary.value,
  ]
    .filter((part) => part !== null)
    .join(' ')
})

/** What the character tags say the garden is good for. */
const character = computed(() => {
  const tags = garden.value?.tags ?? []
  if (!tags.length) return null

  const labels = joinList(tags.map(tagLabel))
  const purposes = joinList(
    tags.filter((tag) => te(`garden.purpose.${tag}`)).map((tag) => t(`garden.purpose.${tag}`)),
  )

  return purposes
    ? t('garden.prose.characterPurpose', { labels, purposes })
    : t('garden.prose.characterPlain', { labels })
})

/** The walk from the stop, which is the one arrival fact that holds for everybody. */
const access = computed(() => {
  const entry = garden.value!

  return entry.stationWalkMin === null
    ? t('garden.prose.accessUnknown')
    : t('garden.prose.accessKnown', { min: entry.stationWalkMin })
})

/* ---------- Metadata ---------- */

usePageSeo(() => ({
  title: garden.value?.name,
  description:
    garden.value?.description
    ?? t('garden.seoFallback', { name: garden.value?.name }),
  type: 'article',
}))

const absoluteUrl = useAbsoluteUrl()
const pageUrl = computed(() => absoluteUrl(gardenPath(garden.value!.slug)))

/** schema.org's day URLs, keyed the way the database keys them: 1 = Monday. */
const SCHEMA_WEEKDAYS: Record<number, string> = {
  1: 'https://schema.org/Monday',
  2: 'https://schema.org/Tuesday',
  3: 'https://schema.org/Wednesday',
  4: 'https://schema.org/Thursday',
  5: 'https://schema.org/Friday',
  6: 'https://schema.org/Saturday',
  7: 'https://schema.org/Sunday',
}

/**
 * The self-service garden's hours, and only those.
 *
 * `openingHoursSpecification` describes one business, and the restaurant in the
 * same house keeps different hours — that is why `area` is part of the key at
 * all. Merging both areas into one list would publish their union, which is
 * open at times neither of them is. So this marks up what the page shows: the
 * garden. Restaurant hours, once they exist, need a `Restaurant` of their own
 * rather than more entries here.
 */
const openingSpec = computed(() =>
  WEEKDAY_VALUES.flatMap((day) => {
    const window = openingWindow(garden.value!, day)

    return window
      ? [{
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: SCHEMA_WEEKDAYS[day],
          opens: formatClock(window.opensAt),
          closes: formatClock(window.closesAt),
        }]
      : []
  }),
)

/**
 * The equipment as schema.org sees it — the same facts the chips print.
 *
 * Only what really is a feature of the place: how far the stop is and whether
 * the garden sits in the city say where it is, not what it has.
 */
const amenities = computed(() => {
  const entry = garden.value!

  return [
    ...entry.tags.map((tag) => ({ name: tagLabel(tag), value: true })),
    // Both cases are on the page — "nur Bedienung" is the same statement as
    // `value: false`, written the way a chip has to write it.
    ...(entry.selfService === null ? [] : [{ name: SELF_SERVICE, value: entry.selfService }]),
    // The page shows this one only when it is true, so the markup does too.
    ...(entry.ownFoodAllowed ? [{ name: OWN_FOOD, value: true }] : []),
  ].map((feature) => ({ '@type': 'LocationFeatureSpecification', ...feature }))
})

/**
 * The beer prices as a menu. Dormant while none are surveyed — the block
 * appears with the first price the crawler brings in, and not before.
 */
const menu = computed(() => {
  const prices = garden.value?.beerPrices ?? []
  if (!prices.length) return null

  return {
    '@type': 'Menu',
    hasMenuItem: prices.map((price) => ({
      '@type': 'MenuItem',
      name: `${beerKind(price.kind)}, ${beerSize(price.sizeMl)}`,
      offers: {
        '@type': 'Offer',
        price: (price.cents / 100).toFixed(2),
        priceCurrency: 'EUR',
      },
    })),
  }
})

/*
 * The garden as a place, and where it sits in the site.
 *
 * Every value here is a field, never a guess: a null brewery, a missing seat
 * count or an image without a credit drop out through `compactJsonLd` instead
 * of turning into an empty claim. The brewery goes in as `additionalProperty`
 * rather than `brand` — the garden is not branded by the brewery, it pours it,
 * and "Ausschank" is what the page calls that.
 */
useJsonLd(() => {
  const entry = garden.value!
  // The same rule `GardenPhoto` applies: it is the licence that is missing, not
  // the file, so an image without a credit counts as no image.
  const licensed = !!entry.imageUrl && !!entry.imageCredit

  return {
    '@context': 'https://schema.org',
    '@graph': [
      compactJsonLd({
        '@type': 'Restaurant',
        '@id': pageUrl.value,
        name: entry.name,
        url: pageUrl.value,
        description: entry.description,
        image: licensed ? absoluteUrl(entry.imageUrl!) : null,
        geo: { '@type': 'GeoCoordinates', latitude: entry.lat, longitude: entry.lon },
        // Town and country, and not a line more: no street and no postcode are
        // recorded, so none get claimed. The coordinates above are the precise
        // part of "where", and those we do have.
        address: locality.value
          ? { '@type': 'PostalAddress', addressLocality: locality.value, addressCountry: 'DE' }
          : null,
        hasMap: mapsSearchUrl(entry.name),
        maximumAttendeeCapacity: entry.seats,
        openingHoursSpecification: openingSpec.value,
        amenityFeature: amenities.value,
        hasMenu: menu.value,
        additionalProperty: brewery.value
          ? { '@type': 'PropertyValue', name: t('garden.pour'), value: brewery.value }
          : null,
      }),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Startseite', item: absoluteUrl('/') },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Alle Biergärten',
            item: absoluteUrl('/verzeichnis'),
          },
          { '@type': 'ListItem', position: 3, name: entry.name, item: pageUrl.value },
        ],
      },
    ],
  }
})
</script>

<template>
  <section v-if="garden" class="entity">
    <!--
      Hero: the image across the full width, the name as a stamp half over it.
      The stamp deliberately sits on the edge — an imprint does not respect
      margins.
    -->
    <div class="hero">
      <GardenPhoto :garden="garden" />
      <div class="hero-plate">
        <!-- The garden's name is what this page is about, so it is the h1. -->
        <h1>{{ garden.name }}</h1>
        <span v-if="visited" class="seen">{{ t('common.seen') }}</span>
      </div>
    </div>

    <div class="entity-body">
      <div class="entity-main">
        <div class="gmeta">
          {{ metaLine(
            brewery,
            garden.district,
            formatSeatCount(garden.seats),
            leg ? t('garden.travelLine', { min: leg.min, start: state.startPoint.name }) : null,
          ) }}
        </div>
        <div v-if="isOnWater(garden)" class="water">{{ t('common.onWater') }}</div>

        <p v-if="garden.description" class="desc">{{ garden.description }}</p>
        <div v-if="garden.caveat" class="warnbox">{{ garden.caveat }}</div>

        <SectionTitle :title="t('garden.equipment')" />
        <div class="facts">
          <span
            v-for="tag in garden.tags"
            :key="tag"
            class="fact"
          >{{ tagLabel(tag) }}</span>
          <span class="fact">{{ garden.selfService ? SELF_SERVICE : t('common.servedOnly') }}</span>
          <span v-if="garden.ownFoodAllowed" class="fact">{{ OWN_FOOD }}</span>
          <span v-if="garden.stationWalkMin !== null" class="fact">
            {{ t('garden.stationWalk', { min: garden.stationWalkMin }) }}
          </span>
          <span class="fact">{{ garden.zone === 'umland' ? t('garden.zoneUmland') : t('garden.zoneCity') }}</span>
        </div>

        <div class="actions">
          <NuxtLink class="btn on" to="/planer">{{ t('garden.planHere') }}</NuxtLink>
          <button
            class="btn"
            :class="{ warn: visited }"
            @click="planner.toggleVisited(garden.slug)"
          >{{ visited ? t('garden.seenAlready') : t('common.markSeen') }}</button>
          <a class="btn gold" :href="mapsSearchUrl(garden.name)" target="_blank" rel="noopener">
            {{ t('garden.onGoogleMaps') }}
          </a>
        </div>

        <!--
          Below this line the page stops listing fields and starts reading as
          prose. It is the same blocks the landing page uses, for the same
          reason: this is the page a search by name lands on, and until now it
          said less about the garden than the directory row that links to it.
        -->
        <ContentSection id="einordnung" class="prose" :title="t('garden.aboutTitle')">
          <p>{{ placement }}</p>
          <p v-if="service">{{ service }}</p>
          <p v-if="character">{{ character }}</p>
        </ContentSection>

        <ContentSection id="anfahrt" class="prose" :title="t('garden.accessTitle')">
          <p>{{ access }}</p>

          <!--
            The concrete minutes come with the stored start point, so they are
            client-side only. Prerendered they would be the time from
            Candidplatz — on every page and for everybody.
          -->
          <template v-if="leg">
            <p>
              {{ t('garden.prose.plannerTimes', {
                start: state.startPoint.name,
                walk: leg.walk,
                bike: leg.bike,
                transit: leg.transit,
                km: formatKm(leg.km),
              }) }}
            </p>
            <ModeLinks
              :from="state.startPoint"
              :to="garden"
              :selected="leg.mode"
              :mode="state.mode"
              :max-leg-minutes="state.maxLegMinutes"
            />
          </template>
        </ContentSection>

        <ContentSection id="in-der-naehe" class="prose" :title="t('garden.nearbyTitle')">
          <p v-if="nearest">
            <i18n-t keypath="garden.prose.nearest">
              <template #link>
                <NuxtLink :to="gardenPath(nearest.garden.slug)">{{ nearest.garden.name }}</NuxtLink>
              </template>
              <template #km>{{ formatKm(nearest.km) }}</template>
            </i18n-t>
          </p>

          <div class="glist">
            <GardenTeaser v-for="entry in nearby" :key="entry.garden.slug" :garden="entry.garden" />
          </div>

          <p v-if="sameDistrict.length">
            {{ sameDistrict.length === 1 ? t('garden.prose.sameDistrictOne') : t('garden.prose.sameDistrictMany') }}
            <template v-for="(entry, index) in sameDistrict" :key="entry.slug"><span
              v-if="index > 0"
            >{{ index === sameDistrict.length - 1 ? t('garden.prose.and') : t('garden.prose.comma') }}</span><NuxtLink
              :to="gardenPath(entry.slug)"
            >{{ entry.name }}</NuxtLink></template>.
          </p>

          <p v-if="sameBrewery.length">
            {{ sameBrewery.length === 1 ? t('garden.prose.sameBreweryOne') : t('garden.prose.sameBreweryMany') }}
            <template v-for="(entry, index) in sameBrewery" :key="entry.slug"><span
              v-if="index > 0"
            >{{ index === sameBrewery.length - 1 ? t('garden.prose.and') : t('garden.prose.comma') }}</span><NuxtLink
              :to="gardenPath(entry.slug)"
            >{{ entry.name }}</NuxtLink></template>.
          </p>

          <p>
            <i18n-t keypath="garden.prose.allGardens">
              <template #count>{{ gardens.length }}</template>
              <template #directory>
                <NuxtLink to="/verzeichnis">{{ t('garden.prose.allGardensDirectory') }}</NuxtLink>
              </template>
              <template #planner>
                <NuxtLink to="/planer">{{ t('garden.prose.allGardensPlanner') }}</NuxtLink>
              </template>
            </i18n-t>
          </p>
        </ContentSection>
      </div>

      <aside class="entity-side">
        <SectionTitle :title="t('garden.priceTitle')" />
        <BeerPriceList :garden="garden" />

        <SectionTitle :title="t('garden.hoursTitle')" />
        <OpeningHoursTable :garden="garden" :today="today" />

        <SectionTitle :title="t('garden.whereTitle')" />
        <ClientOnly>
          <GardenMap :garden="garden" />
        </ClientOnly>
      </aside>
    </div>
  </section>
</template>
