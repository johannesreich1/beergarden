<script setup lang="ts">
/**
 * The privacy notice.
 *
 * Unusually, most of this can be written truthfully rather than boilerplate,
 * because the site does very little: no cookies, no analytics, no external
 * fonts, no CDN, and map tiles from our own server. Where something depends on
 * the hosting rather than on the code — server logs, retention — it is marked
 * as a gap instead of being filled with a plausible sentence.
 *
 * Whatever changes here must change in the code as well. A privacy notice that
 * describes a site which no longer exists is worse than none, because people
 * act on it.
 */
definePageMeta({ path: '/datenschutz' })

usePageSeo({
  title: 'Datenschutz',
  description:
    'Was Biergarten Freunde speichert: nichts auf dem Server, zwei Einträge im Browser. '
    + 'Keine Cookies, kein Analytics, keine fremden Schriften.',
})
</script>

<template>
  <article class="prosa">
    <h1 class="page-title stamped">Datenschutz</h1>

    <p class="lead">
      Kurz: Diese Seite setzt <b>kein einziges Cookie</b>, misst nichts und lädt nichts von
      fremden Servern. Was du einstellst, bleibt in deinem Browser.
    </p>

    <div class="warnbox">
      <b>Noch auszufüllen.</b> Verantwortlicher, Anschrift und die Angaben zu Server-Logfiles
      hängen vom Hoster ab und müssen vor dem Livegang ergänzt werden.
    </div>

    <h2>Verantwortlicher</h2>
    <p><b>[Name, Anschrift, E-Mail — siehe Impressum]</b></p>

    <h2>Was im Browser gespeichert wird</h2>
    <p>
      Zwei Einträge im <code>localStorage</code>. Sie liegen auf deinem Gerät, werden nie an
      einen Server geschickt und lassen sich in den Browsereinstellungen jederzeit löschen:
    </p>
    <ul>
      <li>
        <b>bg-planer-v5</b> — Startpunkt, Startzeit, Zeitfenster, Zahl der Stationen,
        Fortbewegungsart, Wochentag, Filter, abgestempelte Biergärten und die gewählte Tour.
      </li>
      <li><b>bg-theme</b> — ob du helle, dunkle oder die Systemansicht gewählt hast.</li>
    </ul>
    <p>
      Cookies werden nicht gesetzt. Eine Einwilligung nach § 25 TDDDG ist dafür nicht nötig,
      weil diese Speicherung genau die Funktion erbringt, die du aufgerufen hast: Du bittest
      um eine Tour, und die Seite merkt sich deine Tour.
    </p>

    <h2>Standort</h2>
    <p>
      Nur, wenn du auf <b>Standort</b> drückst. Dein Browser fragt dann selbst um Erlaubnis,
      die Koordinaten werden im Browser zur Berechnung der Fahrzeiten benutzt und weder
      gespeichert noch übertragen.
    </p>

    <h2>Karten</h2>
    <p>
      Die Karten laufen mit MapLibre und werden aus einem Kartenausschnitt gezeichnet, der
      von unserem eigenen Server kommt. Es besteht keine Verbindung zu einem fremden
      Kartendienst — insbesondere nicht zu Google. Datengrundlage ist
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">
        OpenStreetMap
      </a>
      (ODbL).
    </p>

    <h2>Links zu Google Maps</h2>
    <p>
      Auf den Detailseiten und an den Etappen gibt es Links zu Google Maps. Sie werden erst
      aufgerufen, wenn du sie anklickst. Ab dann gelten die Bedingungen und die
      Datenschutzerklärung von Google; wir übertragen von uns aus nichts dorthin.
    </p>

    <h2>Keine Messung, keine fremden Ressourcen</h2>
    <p>
      Kein Analytics, kein Tracking, keine Werbenetzwerke, keine eingebetteten Videos. Die
      Schriften sind die deines Geräts, es wird keine Schrift nachgeladen. Auch sonst wird
      nichts von einem Content-Delivery-Network geholt.
    </p>

    <h2>Server-Logfiles</h2>
    <p>
      <b>[Vom Hoster abhängig: welche Daten protokolliert werden, wie lange sie liegen und auf
      welcher Rechtsgrundlage. Vor dem Livegang eintragen.]</b>
    </p>

    <h2>Deine Rechte</h2>
    <p>
      Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit
      und Widerspruch — zu erreichen über die Adresse im Impressum. Außerdem steht dir eine
      Beschwerde bei einer Aufsichtsbehörde zu; für Bayern ist das das Bayerische Landesamt
      für Datenschutzaufsicht.
    </p>
  </article>
</template>
