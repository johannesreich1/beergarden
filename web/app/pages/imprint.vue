<script setup lang="ts">
/**
 * The imprint.
 *
 * Required by § 5 DDG for any German site that is not purely private, and the
 * footer links to it — a link to a 404 is worse than no link at all.
 *
 * The operator's details are deliberately left as marked gaps rather than
 * filled with something plausible. An imprint is a legal declaration about who
 * is responsible; inventing a name and an address would be the one place on
 * this site where a guess causes actual harm. The gaps stay in the template,
 * not in the locale file — they are placeholders to replace, not text to
 * translate.
 */
definePageMeta({ path: '/impressum' })

const { t } = useI18n()

usePageSeo({
  title: t('legal.imprint.seoTitle'),
  description: t('legal.imprint.seoDescription'),
})
</script>

<template>
  <article class="prosa">
    <h1 class="page-title stamped">{{ t('legal.imprint.title') }}</h1>

    <div class="warnbox">
      <b>{{ t('legal.imprint.todoLead') }}</b> {{ t('legal.imprint.todo') }}
    </div>

    <h2>{{ t('legal.imprint.providerTitle') }}</h2>
    <p>
      <b>[Name]</b><br>
      <b>[Straße und Hausnummer]</b><br>
      <b>[PLZ und Ort]</b>
    </p>

    <h2>{{ t('legal.imprint.contactTitle') }}</h2>
    <p>
      {{ t('legal.imprint.email') }}
      <a href="mailto:servus@biergarten-freunde.de">servus&#64;biergarten-freunde.de</a><br>
      {{ t('legal.imprint.phone') }} <b>[optional]</b>
    </p>

    <h2>{{ t('legal.imprint.responsibleTitle') }}</h2>
    <p><b>[Name, Anschrift wie oben]</b></p>

    <h2>{{ t('legal.imprint.contentLiabilityTitle') }}</h2>
    <p>{{ t('legal.imprint.contentLiability') }}</p>

    <h2>{{ t('legal.imprint.linkLiabilityTitle') }}</h2>
    <p>{{ t('legal.imprint.linkLiability') }}</p>

    <h2>{{ t('legal.imprint.mapTitle') }}</h2>
    <p>
      <i18n-t keypath="legal.imprint.map">
        <template #osm>
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">
            OpenStreetMap
          </a>
        </template>
      </i18n-t>
    </p>
  </article>
</template>
