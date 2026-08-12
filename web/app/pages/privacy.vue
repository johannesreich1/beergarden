<script setup lang="ts">
/**
 * The privacy notice.
 *
 * Unusually, most of this can be written truthfully rather than boilerplate,
 * because the site does very little: no cookies, no analytics, no external
 * fonts, no CDN, and map tiles from our own server. Where something depends on
 * the hosting rather than on the code — server logs, retention — it is marked
 * as a gap instead of being filled with a plausible sentence. The gaps stay in
 * the template: they are placeholders to replace, not text to translate.
 *
 * Whatever changes here must change in the code as well. A privacy notice that
 * describes a site which no longer exists is worse than none, because people
 * act on it.
 */
definePageMeta({ path: '/datenschutz' })

const { t } = useI18n()

usePageSeo({
  title: t('legal.privacy.seoTitle'),
  description: t('legal.privacy.seoDescription'),
})
</script>

<template>
  <article class="prosa">
    <h1 class="page-title stamped">{{ t('legal.privacy.title') }}</h1>

    <p class="lead">
      <i18n-t keypath="legal.privacy.lead">
        <template #noCookie><b>{{ t('legal.privacy.leadNoCookie') }}</b></template>
      </i18n-t>
    </p>

    <div class="warnbox">
      <b>{{ t('legal.privacy.todoLead') }}</b> {{ t('legal.privacy.todo') }}
    </div>

    <h2>{{ t('legal.privacy.controllerTitle') }}</h2>
    <p><b>[Name, Anschrift, E-Mail — siehe Impressum]</b></p>

    <h2>{{ t('legal.privacy.storageTitle') }}</h2>
    <p>
      <i18n-t keypath="legal.privacy.storageIntro">
        <template #code><code>localStorage</code></template>
      </i18n-t>
    </p>
    <ul>
      <li><b>bg-planer-v5</b> {{ t('legal.privacy.storagePlanner') }}</li>
      <li><b>bg-theme</b> {{ t('legal.privacy.storageTheme') }}</li>
    </ul>
    <p>{{ t('legal.privacy.storageOutro') }}</p>

    <h2>{{ t('legal.privacy.locationTitle') }}</h2>
    <p>
      <i18n-t keypath="legal.privacy.location">
        <template #button><b>{{ t('legal.privacy.locationButton') }}</b></template>
      </i18n-t>
    </p>

    <h2>{{ t('legal.privacy.mapsTitle') }}</h2>
    <p>
      <i18n-t keypath="legal.privacy.maps">
        <template #osm>
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">
            OpenStreetMap
          </a>
        </template>
      </i18n-t>
    </p>

    <h2>{{ t('legal.privacy.googleTitle') }}</h2>
    <p>{{ t('legal.privacy.google') }}</p>

    <h2>{{ t('legal.privacy.noTrackingTitle') }}</h2>
    <p>{{ t('legal.privacy.noTracking') }}</p>

    <h2>{{ t('legal.privacy.logsTitle') }}</h2>
    <p>
      <b>[Vom Hoster abhängig: welche Daten protokolliert werden, wie lange sie liegen und auf
      welcher Rechtsgrundlage. Vor dem Livegang eintragen.]</b>
    </p>

    <h2>{{ t('legal.privacy.rightsTitle') }}</h2>
    <p>{{ t('legal.privacy.rights') }}</p>
  </article>
</template>
