<script setup lang="ts">
import type { FaqItem } from '~/components/FaqList.vue'
import { TAGS } from '#core'

/**
 * The landing page.
 *
 * The planner cannot carry this job: it runs client-side (`ssr: false`), so a
 * crawler gets an empty shell from it. This page is prerendered and is the only
 * place on the site where the subject is described in prose rather than
 * demonstrated by a tool.
 *
 * Every number in the text is counted from the data, not typed in. A hard-coded
 * "35 Biergärten" is wrong the day the 36th is seeded, and nobody remembers to
 * come back here.
 */
const { data: gardens } = await useGardens()

const { t } = useI18n()

const stats = computed(() => {
  const all = gardens.value

  const withTag = (tag: string) => all.filter((garden) => garden.tags.includes(tag)).length

  return {
    total: all.length,
    city: all.filter((garden) => garden.zone === 'city').length,
    umland: all.filter((garden) => garden.zone === 'umland').length,
    selfService: all.filter((garden) => garden.selfService).length,
    ownFood: all.filter((garden) => garden.ownFoodAllowed).length,
    water: withTag(TAGS.water),
    forest: withTag(TAGS.forest),
    city_tag: withTag(TAGS.city),
    playground: withTag(TAGS.playground),
    music: withTag(TAGS.music),
    cellar: withTag(TAGS.cellar),
    view: withTag(TAGS.view),
    largest: [...all].sort((a, b) => (b.seats ?? 0) - (a.seats ?? 0))[0] ?? null,
  }
})

/*
 * Fixed by slug rather than "the six biggest": this is the row people arrive
 * looking for by name, and it should not reshuffle because a seat count was
 * corrected.
 */
const FEATURED = [
  'hirschgarten',
  'chinaturm',
  'augustinerkeller',
  'aumeister',
  'seehaus',
  'nockherberg',
]

const featured = computed(() => gardensFor(FEATURED, gardens.value))

/** The type list: which stat goes with which tag, in reading order. */
const TYPE_ITEMS = [
  { key: 'green', stat: 'forest' },
  { key: 'water', stat: 'water' },
  { key: 'city', stat: 'city_tag' },
  { key: 'cellar', stat: 'cellar' },
  { key: 'playground', stat: 'playground' },
  { key: 'music', stat: 'music' },
  { key: 'view', stat: 'view' },
] as const

const faq = computed((): FaqItem[] => [
  { question: t('home.faq.q1'), answer: t('home.faq.a1', stats.value) },
  { question: t('home.faq.q2'), answer: t('home.faq.a2', stats.value) },
  {
    question: t('home.faq.q3'),
    answer: stats.value.largest
      ? t('home.faq.a3', {
          name: stats.value.largest.name,
          district: stats.value.largest.district,
          seats: stats.value.largest.seats?.toLocaleString('de-DE'),
        })
      : t('home.faq.a3Unknown'),
  },
  { question: t('home.faq.q4'), answer: t('home.faq.a4') },
  { question: t('home.faq.q5'), answer: t('home.faq.a5') },
  { question: t('home.faq.q6'), answer: t('home.faq.a6') },
  { question: t('home.faq.q7'), answer: t('home.faq.a7') },
])

usePageSeo(() => ({
  // The one page whose title is worth a keyword rather than just the name:
  // nobody searches for "Biergarten Freunde", they search for the subject.
  title: t('home.seoTitle'),
  description: t('home.seoDescription', { total: stats.value.total }),
}))

/*
 * Two blocks: what this site is, and who runs it. `WebSite` is what a search
 * engine hangs the site name on, `ItemList` names the gardens listed below so
 * the links are read as a list and not as decoration.
 */
useJsonLd(() => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: SITE.name,
      description: t('site.description'),
      inLanguage: 'de-DE',
    },
    {
      '@type': 'ItemList',
      name: t('home.itemListName'),
      itemListElement: featured.value.map((garden, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: garden.name,
        url: gardenPath(garden.slug),
      })),
    },
  ],
}))
</script>

<template>
  <article class="prose">
    <h1 class="page-title stamped">{{ t('home.title') }}</h1>

    <!-- Deliberately not a variation on the tagline in the header: the same
         sentence twice on one page is one sentence too many. -->
    <p class="lede">{{ t('home.lede', { total: stats.total }) }}</p>

    <!-- No buttons here: the navigation directly above already offers both of
         these, and the same two words twice in two styles reads as a mistake.
         The call to action sits at the end, where the reader has arrived. -->

    <ContentSection id="planung" :title="t('home.planning.title')">
      <p>{{ t('home.planning.p1') }}</p>
      <p>{{ t('home.planning.p2') }}</p>
      <p>
        <i18n-t keypath="home.planning.p3">
          <template #strong><strong>{{ t('home.planning.p3Strong') }}</strong></template>
        </i18n-t>
      </p>
      <p>{{ t('home.planning.p4') }}</p>
    </ContentSection>

    <ContentSection id="typen" :title="t('home.types.title')">
      <p>{{ t('home.types.p1', { selfService: stats.selfService, total: stats.total }) }}</p>
      <p>{{ t('home.types.p2') }}</p>
      <ul>
        <li v-for="item in TYPE_ITEMS" :key="item.key">
          <strong>{{ t(`home.types.${item.key}`) }}</strong>
          {{ t(`home.types.${item.key}Text`, { n: stats[item.stat] }) }}
        </li>
      </ul>
      <p>
        <i18n-t keypath="home.types.outro">
          <template #link>
            <NuxtLink to="/verzeichnis">{{ t('home.types.outroLink') }}</NuxtLink>
          </template>
        </i18n-t>
      </p>
    </ContentSection>

    <ContentSection id="bekannte" :title="t('home.famous.title')">
      <p>{{ t('home.famous.p1') }}</p>
      <div class="glist">
        <GardenTeaser v-for="garden in featured" :key="garden.slug" :garden="garden" />
      </div>
      <p>
        <i18n-t keypath="home.famous.p2">
          <template #total>{{ stats.total }}</template>
          <template #link>
            <NuxtLink to="/verzeichnis">{{ t('home.famous.p2Link') }}</NuxtLink>
          </template>
        </i18n-t>
      </p>
    </ContentSection>

    <ContentSection id="radl" :title="t('home.bike.title')">
      <p>{{ t('home.bike.p1') }}</p>
      <p>{{ t('home.bike.p2') }}</p>
      <p>{{ t('home.bike.p3') }}</p>
    </ContentSection>

    <ContentSection id="oeffnungszeiten" :title="t('home.hoursSection.title')">
      <p>{{ t('home.hoursSection.p1') }}</p>
      <p>
        <i18n-t keypath="home.hoursSection.p2">
          <template #ka><b>{{ t('home.hoursSection.p2Ka') }}</b></template>
        </i18n-t>
      </p>
      <p>{{ t('home.hoursSection.p3') }}</p>
    </ContentSection>

    <ContentSection id="faq" :title="t('home.faqTitle')">
      <FaqList :items="faq" />
    </ContentSection>

    <ContentSection id="losgehen" :title="t('home.go.title')">
      <p>{{ t('home.go.p1', { total: stats.total }) }}</p>
      <div class="actions">
        <NuxtLink class="btn big on" to="/planer">{{ t('home.go.plan') }}</NuxtLink>
        <NuxtLink class="btn big" to="/verzeichnis">{{ t('home.go.browse') }}</NuxtLink>
      </div>
    </ContentSection>
  </article>
</template>
