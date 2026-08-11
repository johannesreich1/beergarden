<script setup lang="ts">
import type { FaqItem } from '~/components/FaqList.vue'

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

const stats = computed(() => {
  const all = gardens.value

  const withTag = (tag: string) => all.filter((garden) => garden.tags.includes(tag)).length

  return {
    total: all.length,
    city: all.filter((garden) => garden.zone === 'city').length,
    umland: all.filter((garden) => garden.zone === 'umland').length,
    selfService: all.filter((garden) => garden.selfService).length,
    ownFood: all.filter((garden) => garden.ownFoodAllowed).length,
    water: withTag('wasser'),
    forest: withTag('wald'),
    city_tag: withTag('stadt'),
    playground: withTag('spielplatz'),
    music: withTag('musik'),
    cellar: withTag('keller'),
    view: withTag('aussicht'),
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

const featured = computed(() =>
  FEATURED
    .map((slug) => gardens.value.find((garden) => garden.slug === slug))
    .filter((garden) => garden !== undefined),
)

const faq = computed((): FaqItem[] => [
  {
    question: 'Wie viele Biergärten sind erfasst?',
    answer:
      `${stats.value.total} — ${stats.value.city} im Stadtgebiet und `
      + `${stats.value.umland} im Umland. Jeder mit Öffnungszeiten, Ausschank, Lage und `
      + 'einer Quelle, aus der die Angaben stammen.',
  },
  {
    question: 'Darf ich eigene Brotzeit mitbringen?',
    answer:
      'Im Selbstbedienungsbereich ja, Getränke nicht — das ist die Münchner Regel und der '
      + 'Grund, warum es den Selbstbedienungsteil überhaupt gibt. Im bedienten Bereich gilt sie '
      + `nicht. ${stats.value.ownFood} der ${stats.value.total} erfassten Biergärten haben einen `
      + 'solchen Bereich.',
  },
  {
    question: 'Welcher ist der größte Biergarten?',
    answer: stats.value.largest
      ? `${stats.value.largest.name} in ${stats.value.largest.district} mit `
        + `${stats.value.largest.seats?.toLocaleString('de-DE')} Plätzen.`
      : 'Dazu liegen gerade keine Platzzahlen vor.',
  },
  {
    question: 'Wie genau sind die Fahrzeiten?',
    answer:
      'Sie sind geschätzt: Luftlinie plus Umwegfaktor, nicht der MVV-Fahrplan. Deshalb steht '
      + 'überall ein ≈ davor. Jede Etappe zeigt Fuß-, Rad- und ÖPNV-Zeit, und ein Tippen darauf '
      + 'öffnet die echte Verbindung. Umstiege sind in der ÖPNV-Zeit nicht enthalten.',
  },
  {
    question: 'Wann haben Münchner Biergärten geöffnet?',
    answer:
      'Die meisten sperren zwischen 10 und 12 Uhr auf und zwischen 22 und 23.30 Uhr zu. '
      + 'Verlässlich ist das nur bei schönem Wetter — bei Regen entscheidet der Wirt morgens, '
      + 'ob überhaupt aufgesperrt wird. Der Planer rechnet mit den hinterlegten Zeiten des '
      + 'jeweiligen Wochentags und verwirft Touren, die daran scheitern.',
  },
  {
    question: 'Brauche ich ein MVV-Ticket für die Tour?',
    answer:
      'Im Stadtgebiet reicht eine Tageskarte für die Zone M. Für Pullach, Baierbrunn und '
      + 'Unterföhring brauchst du eine Zone mehr.',
  },
  {
    question: 'Kostet der Planer etwas oder brauche ich ein Konto?',
    answer:
      'Nein. Kein Login, keine Anmeldung. Was du gesehen hast und wie du unterwegs bist, bleibt '
      + 'im Browser auf deinem Gerät.',
  },
])

usePageSeo(() => ({
  // The one page whose title is worth a keyword rather than just the name:
  // nobody searches for "Biergarten Freunde", they search for the subject.
  title: 'Biergärten in München',
  description:
    `${stats.value.total} Biergärten in München mit Öffnungszeiten, Ausschank und Anfahrt — `
    + 'plus Tourenplaner: Startpunkt und Zeitfenster angeben, fertige Biergarten-Tour bekommen.',
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
      description: SITE.description,
      inLanguage: 'de-DE',
    },
    {
      '@type': 'ItemList',
      name: 'Bekannte Biergärten in München',
      itemListElement: featured.value.map((garden, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: garden.name,
        url: `/biergarten/${garden.slug}`,
      })),
    },
  ],
}))
</script>

<template>
  <article class="prose">
    <h1 class="page-title stamped">Biergärten in München</h1>

    <!-- Deliberately not a variation on the tagline in the header: the same
         sentence twice on one page is one sentence too many. -->
    <p class="lede">
      {{ stats.total }} Biergärten in und um München: Öffnungszeiten, Ausschank, Lage — und zu
      jeder Angabe die Quelle, aus der sie stammt. Wer nicht stöbern, sondern losgehen will,
      lässt sich daraus eine Tour über mehrere Stationen bauen.
    </p>

    <!-- No buttons here: the navigation directly above already offers both of
         these, and the same two words twice in two styles reads as a mistake.
         The call to action sits at the end, where the reader has arrived. -->

    <ContentSection id="planung" title="Wie die Tourenplanung funktioniert">
      <p>
        Ein Biergartenabend scheitert selten am Biergarten und fast immer an der Reihenfolge:
        der schöne liegt am anderen Ende der Stadt, der nächste hat montags zu, und der mit dem
        Blick aufs Wasser wäre erst nach Sonnenuntergang dran. Genau das nimmt der Planer ab.
      </p>
      <p>
        Du gibst einen Startpunkt an — eine Haltestelle, ein Viertel oder deine Position —,
        dazu Uhrzeit, Wochentag, Zeitfenster und ob du zu Fuß, mit dem Rad oder mit der Bahn
        unterwegs bist. Daraus baut er Touren über zwei bis vier Stationen und zeigt sie mit
        Alternativen nebeneinander.
      </p>
      <p>
        Dabei gilt: <strong>Öffnungszeiten werden mitgerechnet</strong>, für den Wochentag, den du
        gewählt hast. Wer erst um sieben losgeht, bekommt keine Tour vorgeschlagen, deren letzte
        Station um acht zusperrt. Änderst du hinterher die Startzeit oder den Wochentag, prüft der
        Planer die gewählte Tour erneut und verwirft sie mit Begründung, statt sie stillschweigend
        falsch stehen zu lassen.
      </p>
      <p>
        Der Sonnenuntergang des jeweiligen Tages ist Teil der Rechnung: Plätze am Wasser und mit
        Aussicht wandern ans Ende der Tour, weil sie dann am meisten hergeben. Brauchbares Licht
        gibt es noch etwa eine halbe Stunde danach.
      </p>
    </ContentSection>

    <ContentSection id="typen" title="Biergarten-Typen in München">
      <p>
        Der wichtigste Unterschied ist nicht die Brauerei, sondern die Bedienung.
        {{ stats.selfService }} der {{ stats.total }} erfassten Biergärten haben einen
        Selbstbedienungsbereich: Krug selbst holen, Tisch selbst suchen — und die eigene Brotzeit
        ist erlaubt. Getränke nicht, die kommen vom Haus. Im bedienten Teil desselben Hauses gilt
        das nicht, weshalb Restaurant und Selbstbedienung oft unterschiedliche Zeiten haben.
      </p>
      <p>Danach sortiert sich der Rest nach Lage und Charakter:</p>
      <ul>
        <li>
          <strong>Im Grünen</strong> — {{ stats.forest }} Gärten liegen im Wald, im Park oder am
          Waldrand. Der Englische Garten und der Hirschgarten sind die bekanntesten, aber längst
          nicht die einzigen.
        </li>
        <li>
          <strong>Am Wasser</strong> — {{ stats.water }} liegen an Isar, Kanal oder See. Die
          lohnen sich am Abend am meisten, deshalb legt der Planer sie nach hinten.
        </li>
        <li>
          <strong>Mitten in der Stadt</strong> — {{ stats.city_tag }} sind zu Fuß aus der Innenstadt
          erreichbar, gut für einen kurzen Abend ohne Anfahrt.
        </li>
        <li>
          <strong>Bierkeller</strong> — {{ stats.cellar }} Gärten stehen über den alten
          Lagerkellern, in deren Schatten die Kastanien überhaupt erst gepflanzt wurden.
        </li>
        <li>
          <strong>Mit Spielplatz</strong> — {{ stats.playground }} haben einen, was mit Kindern
          die einzige Frage ist, die wirklich zählt.
        </li>
        <li>
          <strong>Mit Live-Musik</strong> — {{ stats.music }} haben regelmäßig Blasmusik oder Band.
        </li>
        <li>
          <strong>Mit Aussicht</strong> — {{ stats.view }} liegen erhöht oder mit freiem Blick.
        </li>
      </ul>
      <p>
        Im <NuxtLink to="/verzeichnis">Verzeichnis</NuxtLink> lassen sich diese Merkmale einzeln
        filtern und mit der Fahrzeit ab deinem Startpunkt kombinieren.
      </p>
    </ContentSection>

    <ContentSection id="bekannte" title="Die bekanntesten Biergärten">
      <p>
        Wer zum ersten Mal hier ist, landet meist bei diesen — zu Recht, aber sie sind auch die
        vollsten. Jeder Eintrag führt auf eine Seite mit Öffnungszeiten, Ausschank und Anfahrt.
      </p>
      <div class="glist">
        <GardenTeaser v-for="garden in featured" :key="garden.slug" :garden="garden" />
      </div>
      <p>
        Das sind sechs von {{ stats.total }}. Die übrigen — darunter die kleineren, an denen man
        abends noch einen Platz bekommt — stehen im
        <NuxtLink to="/verzeichnis">Verzeichnis</NuxtLink>.
      </p>
    </ContentSection>

    <ContentSection id="radl" title="Mit dem Radl von Garten zu Garten">
      <p>
        Für eine Tour über mehrere Stationen ist das Rad in München fast immer das schnellste
        Verkehrsmittel — nicht weil es schneller führe als die U-Bahn, sondern weil der Fußweg von
        der Haltestelle wegfällt. Bei Flaucher, Hinterbrühl, Aumeister und Insel Mühle macht das
        den Unterschied: Sie haben keine Station vor der Tür, und die Radzeiten sind dort deshalb
        auffällig kürzer als die ÖPNV-Zeiten.
      </p>
      <p>
        Wer Rad und Bahn mischen will, muss die Sperrzeiten kennen: Die Fahrradmitnahme im MVV ist
        werktags von 6 bis 9 Uhr und von 16 bis 18 Uhr nicht erlaubt. Genau in dem Fenster, in dem
        man losfahren würde.
      </p>
      <p>
        Im Planer stellst du das Verkehrsmittel um und bekommst dieselbe Auswahl neu gerechnet.
        Jede Etappe zeigt weiterhin alle drei Zeiten nebeneinander, sodass sich einzelne
        Abschnitte auch anders lösen lassen als der Rest der Tour.
      </p>
    </ContentSection>

    <ContentSection id="oeffnungszeiten" title="Öffnungszeiten, Wetter und Sperrstunde">
      <p>
        Die meisten Münchner Biergärten sperren zwischen 10 und 12 Uhr auf und zwischen 22 und
        23.30 Uhr zu. Das ist der Rahmen — verlässlich ist er nur bei schönem Wetter. „Bei schönem
        Wetter“ heißt in der Praxis: Der Wirt entscheidet morgens gegen neun, ob der Garten
        aufmacht. Keine Datenbank der Welt bildet das zuverlässig ab, auch diese nicht.
      </p>
      <p>
        Was wir abbilden können, ist der reguläre Wochenplan, und zwar getrennt nach Bereich, weil
        Restaurant und Selbstbedienung im selben Haus unterschiedliche Zeiten haben. Wo eine
        Angabe nicht sicher zu verifizieren war, steht sie nicht da — an ihrer Stelle steht
        <b>k.&nbsp;A.</b> Das betrifft auch den Ausschank: Bei Gärten ohne belegte Brauerei raten
        wir nicht.
      </p>
      <p>
        Jede Angabe auf den Detailseiten trägt die Quelle, aus der sie stammt, und das Datum, an
        dem sie zuletzt geprüft wurde. Wenn eine Zahl älter aussieht, als dir lieb ist: Sie ist es
        vermutlich, und das steht dann auch dran.
      </p>
    </ContentSection>

    <ContentSection id="faq" title="Häufige Fragen">
      <FaqList :items="faq" />
    </ContentSection>

    <ContentSection id="losgehen" title="Losgehen">
      <p>
        Der Planer braucht drei Angaben und liefert eine fertige Tour samt Alternativen. Wenn du
        lieber selbst suchst, führt das Verzeichnis alle {{ stats.total }} Gärten mit Fahrzeit ab
        deinem Startpunkt.
      </p>
      <div class="actions">
        <NuxtLink class="btn big on" to="/planer">Tour bauen</NuxtLink>
        <NuxtLink class="btn big" to="/verzeichnis">Alle Biergärten ansehen</NuxtLink>
      </div>
    </ContentSection>
  </article>
</template>
