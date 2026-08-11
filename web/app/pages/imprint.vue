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
 * this site where a guess causes actual harm.
 */
definePageMeta({ path: '/impressum' })

usePageSeo({
  title: 'Impressum',
  description: 'Anbieterkennzeichnung und Kontakt für Biergarten Freunde.',
})
</script>

<template>
  <article class="prosa">
    <h1 class="page-title stamped">Impressum</h1>

    <div class="warnbox">
      <b>Noch auszufüllen.</b> Name, Anschrift und Vertretungsberechtigter müssen vor dem
      Livegang eingetragen werden — hier steht bewusst nichts Erfundenes.
    </div>

    <h2>Angaben gemäß § 5 DDG</h2>
    <p>
      <b>[Name]</b><br>
      <b>[Straße und Hausnummer]</b><br>
      <b>[PLZ und Ort]</b>
    </p>

    <h2>Kontakt</h2>
    <p>
      E-Mail: <a href="mailto:servus@biergarten-freunde.de">servus@biergarten-freunde.de</a><br>
      Telefon: <b>[optional]</b>
    </p>

    <h2>Verantwortlich für den Inhalt</h2>
    <p><b>[Name, Anschrift wie oben]</b></p>

    <h2>Haftung für Inhalte</h2>
    <p>
      Öffnungszeiten, Bierpreise und Ausstattung sind nach bestem Wissen zusammengetragen und
      können sich jederzeit ändern. Wo eine Angabe nicht gegen eine Quelle geprüft werden
      konnte, sagt die Seite das an Ort und Stelle. Fahrzeiten sind Schätzungen und kein
      Fahrplan. Wer sich auf eine Angabe verlässt, prüft sie bitte beim Wirt nach.
    </p>

    <h2>Haftung für Links</h2>
    <p>
      Diese Seite verlinkt auf fremde Seiten, etwa auf Google Maps und auf die Auftritte der
      Wirtschaften. Auf deren Inhalte haben wir keinen Einfluss und übernehmen dafür keine
      Gewähr.
    </p>

    <h2>Kartendaten</h2>
    <p>
      Die Karten beruhen auf Daten von
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">
        OpenStreetMap
      </a>
      und dessen Mitwirkenden, veröffentlicht unter der Open Database License (ODbL). Die
      Kacheln werden aus einem Auszug der Protomaps-Basiskarte erzeugt und von unserem eigenen
      Server ausgeliefert.
    </p>
  </article>
</template>
