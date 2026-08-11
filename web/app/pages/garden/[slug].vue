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

const garden = computed(() => gardens.value.find((entry) => entry.slug === route.params.slug))

if (!garden.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Diesen Biergarten kenne ich nicht.',
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
 * contradiction this kind of markup gets penalised for.
 */
const SELF_SERVICE = 'Selbstbedienung'
const OWN_FOOD = 'Eigene Brotzeit erlaubt'

/**
 * What a character tag is worth for an evening, as a sentence fragment.
 *
 * `TAG_LABELS` stays the one place a tag is *named*; this says what it means.
 * Two different statements about the same tag, so two lists — and the sentence
 * below quotes the label rather than inventing a second wording for it.
 */
const TAG_PURPOSE: Record<string, string> = {
  wasser: 'einen späten Abend am Wasser',
  wald: 'einen langen Nachmittag im Schatten',
  stadt: 'einen kurzen Abend ohne Anfahrt',
  aussicht: 'den freien Blick, wenn die Sonne tiefer steht',
  keller: 'schattige Plätze über den alten Lagerkellern',
  spielplatz: 'einen Nachmittag mit Kindern',
  musik: 'Blasmusik oder Band',
}

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

const gardenLink = (entry: Garden): string => `/biergarten/${entry.slug}`

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
 * days is safe on a page that is built once: "dienstags zu" holds every week,
 * unlike anything derived from what day it happens to be at build time.
 */
const openingSummary = computed(() => {
  const entry = garden.value
  if (!entry) return null

  const windows = WEEKDAYS.map((day) => openingWindow(entry, day.value))
  const open = windows.filter((window) => window !== null)
  const first = open[0]

  if (!first) return null
  if (open.some((window) => window.opensAt !== first.opensAt || window.closesAt !== first.closesAt)) {
    return null
  }

  const closed = WEEKDAYS.filter((_, index) => windows[index] === null).map(
    (day) => WEEKDAY_NAMES[day.value] ?? '',
  )

  const hours = `Geöffnet ist der Garten von ${formatClock(first.opensAt)} bis ${formatClock(first.closesAt)} Uhr`

  return closed.length ? `${hours}, ${joinList(closed)} ist zu.` : `${hours}.`
})

/*
 * The sentences are built here rather than in the template because German
 * needs the right case and the right spacing, and a template that stitches
 * fragments together with `v-if` gets both wrong the moment the compiler drops
 * a whitespace node.
 */

/** Where it is and how big it is. */
const placement = computed(() => {
  const entry = garden.value!
  const zone = entry.zone === 'umland' ? 'im Umland' : 'im Münchner Stadtgebiet'
  const measure = size.value

  return [
    entry.district
      ? `${entry.name} liegt in ${entry.district} und damit ${zone}.`
      : `${entry.name} liegt ${zone}.`,
    measure ? `Er zählt ${formatSeats(measure.seats)}.` : null,
    measure && measure.rank === 1
      ? `Kein anderer der ${measure.counted} erfassten Gärten ist größer.`
      : null,
    measure && measure.rank > 1
      ? `Das ist ${measure.seats >= measure.average ? 'mehr' : 'weniger'} als der Schnitt `
        + `über alle ${measure.counted} erfassten Gärten: ${formatSeats(measure.average)}.`
      : null,
    brewery.value ? `Ausgeschenkt wird ${brewery.value}.` : null,
  ]
    .filter((part) => part !== null)
    .join(' ')
})

/** How you are served, and when. */
const service = computed(() => {
  const entry = garden.value!

  return [
    entry.selfService
      ? 'Es gibt einen Selbstbedienungsbereich: Krug selbst holen, Tisch selbst suchen.'
      : 'Hier wird bedient.',
    entry.selfService && entry.ownFoodAllowed
      ? 'Die eigene Brotzeit ist dort erlaubt — Getränke nicht, die kommen vom Haus.'
      : null,
    entry.selfService === false
      ? 'Eine eigene Brotzeit ist damit nicht vorgesehen: erlaubt ist sie in München nur im '
        + 'Selbstbedienungsbereich.'
      : null,
    openingSummary.value,
  ]
    .filter((part) => part !== null)
    .join(' ')
})

/** What the character tags say the garden is good for. */
const character = computed(() => {
  const tags = garden.value?.tags ?? []
  if (!tags.length) return null

  const labels = joinList(tags.map((tag) => TAG_LABELS[tag] ?? tag))
  const purposes = joinList(
    tags.map((tag) => TAG_PURPOSE[tag]).filter((purpose) => purpose !== undefined),
  )

  return purposes
    ? `Eingeordnet ist er unter ${labels} — gut also für ${purposes}.`
    : `Eingeordnet ist er unter ${labels}.`
})

/** The walk from the stop, which is the one arrival fact that holds for everybody. */
const access = computed(() => {
  const entry = garden.value!

  return [
    entry.stationWalkMin === null
      ? 'Wie weit die nächste Haltestelle entfernt ist, ist hier nicht geprüft.'
      : `Von der nächsten Haltestelle sind es ${entry.stationWalkMin} Minuten zu Fuß. Dieser `
        + 'Fußweg steckt in der ÖPNV-Zeit mit drin — deshalb ist das Radl bei Gärten ohne '
        + 'Station vor der Tür oft schneller als die Bahn.',
    entry.zone === 'umland'
      ? 'Der Garten liegt im Umland und damit außerhalb des Stadtgebiets.'
      : null,
  ]
    .filter((part) => part !== null)
    .join(' ')
})

/* ---------- Metadata ---------- */

usePageSeo(() => ({
  title: garden.value?.name,
  description:
    garden.value?.description
    ?? `${garden.value?.name} in München — Öffnungszeiten, Ausschank und Anfahrt.`,
  type: 'article',
}))

const absoluteUrl = useAbsoluteUrl()
const pageUrl = computed(() => absoluteUrl(gardenLink(garden.value!)))

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
  WEEKDAYS.flatMap((day) => {
    const window = openingWindow(garden.value!, day.value)

    return window
      ? [{
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: SCHEMA_WEEKDAYS[day.value],
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
    ...entry.tags.map((tag) => ({ name: TAG_LABELS[tag] ?? tag, value: true })),
    // Both cases are on the page — "nur Bedienung" is the same statement as
    // `value: false`, written the way a chip has to write it.
    ...(entry.selfService === null ? [] : [{ name: SELF_SERVICE, value: entry.selfService }]),
    // The page shows this one only when it is true, so the markup does too.
    ...(entry.ownFoodAllowed ? [{ name: OWN_FOOD, value: true }] : []),
  ].map((feature) => ({ '@type': 'LocationFeatureSpecification', ...feature }))
})

/**
 * The town for the postal address.
 *
 * City gardens are in München by definition of `zone`. For the three in the
 * Umland the district field carries the town's name ahead of the separator,
 * which is the only place it is recorded. No street and no postcode exist, so
 * nothing else about the address gets claimed.
 */
const locality = computed(() => {
  const entry = garden.value!

  return entry.zone === 'city' ? 'München' : (entry.district?.split('·')[0]?.trim() ?? null)
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
      name: `${BEER_KIND_LABELS[price.kind] ?? price.kind}, ${formatBeerSize(price.sizeMl)}`,
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
        address: locality.value
          ? { '@type': 'PostalAddress', addressLocality: locality.value, addressCountry: 'DE' }
          : null,
        hasMap: mapsSearchUrl(entry.name),
        maximumAttendeeCapacity: entry.seats,
        openingHoursSpecification: openingSpec.value,
        amenityFeature: amenities.value,
        hasMenu: menu.value,
        additionalProperty: brewery.value
          ? { '@type': 'PropertyValue', name: 'Ausschank', value: brewery.value }
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
        <span v-if="visited" class="seen">warst du</span>
      </div>
    </div>

    <div class="entity-body">
      <div class="entity-main">
        <div class="gmeta">
          {{ metaLine(
            brewery,
            garden.district,
            formatSeats(garden.seats),
            leg ? `≈${leg.min} min ab ${state.startPoint.name}` : null,
          ) }}
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
          <span class="fact">{{ garden.selfService ? SELF_SERVICE : 'nur Bedienung' }}</span>
          <span v-if="garden.ownFoodAllowed" class="fact">{{ OWN_FOOD }}</span>
          <span v-if="garden.stationWalkMin !== null" class="fact">
            {{ garden.stationWalkMin }} min von der Haltestelle
          </span>
          <span class="fact">{{ garden.zone === 'umland' ? 'Umland' : 'Stadtgebiet' }}</span>
        </div>

        <div class="actions">
          <NuxtLink class="btn on" to="/planer">Tour hierhin bauen</NuxtLink>
          <button
            class="btn"
            :class="{ warn: visited }"
            @click="planner.toggleVisited(garden.slug)"
          >{{ visited ? 'Warst du schon' : 'War ich schon' }}</button>
          <a class="btn gold" :href="mapsSearchUrl(garden.name)" target="_blank" rel="noopener">
            Auf Google Maps
          </a>
        </div>

        <!--
          Below this line the page stops listing fields and starts reading as
          prose. It is the same blocks the landing page uses, for the same
          reason: this is the page a search by name lands on, and until now it
          said less about the garden than the directory row that links to it.
        -->
        <ContentSection id="einordnung" class="prose" title="Was für ein Garten das ist">
          <p>{{ placement }}</p>
          <p>{{ service }}</p>
          <p v-if="character">{{ character }}</p>
        </ContentSection>

        <ContentSection id="anfahrt" class="prose" title="Anfahrt">
          <p>{{ access }}</p>

          <!--
            The concrete minutes come with the stored start point, so they are
            client-side only. Prerendered they would be the time from
            Candidplatz — on every page and for everybody.
          -->
          <template v-if="leg">
            <p>
              Ab {{ state.startPoint.name }} rechnet der Planer mit ≈{{ leg.walk }} min zu Fuß,
              ≈{{ leg.bike }} min mit dem Radl und ≈{{ leg.transit }} min mit dem ÖPNV, bei
              {{ formatKm(leg.km) }} Luftlinie. Für die echte Verbindung:
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

        <ContentSection id="in-der-naehe" class="prose" title="Biergärten in der Nähe">
          <p v-if="nearest">
            Der nächste andere Biergarten ist
            <NuxtLink :to="gardenLink(nearest.garden)">{{ nearest.garden.name }}</NuxtLink>,
            {{ formatKm(nearest.km) }} Luftlinie entfernt. Für eine Tour über mehrere Stationen
            sind diese die naheliegenden Nachbarn:
          </p>

          <div class="glist">
            <GardenTeaser v-for="entry in nearby" :key="entry.garden.slug" :garden="entry.garden" />
          </div>

          <p v-if="sameDistrict.length">
            Im selben Stadtteil {{ sameDistrict.length === 1 ? 'liegt' : 'liegen' }} außerdem
            <template v-for="(entry, index) in sameDistrict" :key="entry.slug"><span
              v-if="index > 0"
            >{{ index === sameDistrict.length - 1 ? ' und ' : ', ' }}</span><NuxtLink
              :to="gardenLink(entry)"
            >{{ entry.name }}</NuxtLink></template>.
          </p>

          <p v-if="sameBrewery.length">
            Denselben Ausschank {{ sameBrewery.length === 1 ? 'hat' : 'haben' }}
            <template v-for="(entry, index) in sameBrewery" :key="entry.slug"><span
              v-if="index > 0"
            >{{ index === sameBrewery.length - 1 ? ' und ' : ', ' }}</span><NuxtLink
              :to="gardenLink(entry)"
            >{{ entry.name }}</NuxtLink></template>.
          </p>

          <p>
            Alle {{ gardens.length }} erfassten Gärten, filterbar nach Ausschank, Lage und
            Selbstbedienung, stehen im
            <NuxtLink to="/verzeichnis">Verzeichnis</NuxtLink>. Wer daraus einen ganzen Abend machen
            will, lässt sich im <NuxtLink to="/planer">Planer</NuxtLink> eine Tour über mehrere
            Stationen bauen.
          </p>
        </ContentSection>
      </div>

      <aside class="entity-side">
        <div class="section-title"><h2>Was die Maß kostet</h2><div class="rule" /></div>
        <BeerPriceList :garden="garden" />

        <div class="section-title"><h2>Öffnungszeiten</h2><div class="rule" /></div>
        <OpeningHoursTable :garden="garden" :today="today" />

        <div class="section-title"><h2>Wo es liegt</h2><div class="rule" /></div>
        <ClientOnly>
          <GardenMap :garden="garden" />
        </ClientOnly>
      </aside>
    </div>
  </section>
</template>
