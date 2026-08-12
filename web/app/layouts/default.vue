<script setup lang="ts">
import type { ThemeChoice } from '~/composables/useTheme'
import { formatClock, sunsetMinutes } from '#core'

const MUNICH = { lat: 48.1374, lon: 11.5755 }

/**
 * Date and sunset only in the browser. On a prerendered page both would be the
 * build date and wrong from the next day on.
 *
 * The prototype also had "31° · Sonne" here. There is no source for that — and
 * an invented weather report is exactly the kind of claim this project
 * explicitly forbids itself elsewhere.
 */
const today = ref<Date | null>(null)
const { theme, next, cycle, hydrate } = useTheme()

/*
 * Runs in the <head>, so before the first paint. Without it a prerendered page
 * briefly shows the system variant and then jumps to the chosen one — a flash
 * you never get rid of once it is in.
 */
useHead({
  script: [{
    innerHTML:
      // Runs before the first paint. It also resolves the device preference when
      // nothing is stored, so the attribute is always set — with only two states
      // left, an absent attribute would be a third one in disguise.
      "try{var t=localStorage.getItem('bg-theme');"
      + "if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';"
      + "document.documentElement.dataset.theme=t}catch(e){}",
    tagPosition: 'head',
  }],
})

/** What each setting is called, in one place — title, label and nothing else. */
const THEME_LABELS: Record<ThemeChoice, string> = {
  light: 'Hell',
  dark: 'Dunkel',
}

/** True on a garden's detail page — the only route with a third segment. */
const route = useRoute()
const onGarden = computed(() => route.path.startsWith('/biergarten/'))

onMounted(() => {
  today.value = new Date()
  hydrate()
})

const eyebrow = computed(() => {
  if (!today.value) return 'Tourenplaner · München'

  const date = new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(today.value)

  const sunset = formatClock(sunsetMinutes(today.value, MUNICH.lat, MUNICH.lon))

  return `${date} · Sonnenuntergang ${sunset}`
})
</script>

<template>
  <div>
    <div class="head">
      <div class="wrap">
        <!--
          One switch, not three buttons.

          Three labelled buttons cost a row of the head to say something almost
          nobody changes. This says the same in one icon: what is set now, and
          in its label what a press will do. The icon is the state, the label
          is the action — mixing those up is how icon-only controls become
          guesswork.
        -->
        <button
          class="theme-switch"
          type="button"
          :title="`Ansicht: ${THEME_LABELS[theme]} — umschalten auf ${THEME_LABELS[next]}`"
          :aria-label="`Ansicht: ${THEME_LABELS[theme]}. Umschalten auf ${THEME_LABELS[next]}`"
          @click="cycle"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <!-- light: the sun, rays as short strokes -->
            <template v-if="theme === 'light'">
              <circle class="fill" cx="12" cy="12" r="4.6" />
              <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M19.4 4.6l-2.1 2.1M6.7 17.3l-2.1 2.1" />
            </template>
            <!-- dark: the crescent -->
            <path v-else class="fill" d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
          </svg>
        </button>

        <div class="eyebrow">{{ eyebrow }}</div>

        <div class="wordmark">
          <!--
          The seal: lettering on the ring, the Bavarian lozenge at its core, the
          place at its foot. Set askew, because a rubber stamp never sits
          straight. The `stamped` mask breaks the ink up — the same one the
          title and the switches carry.
        -->
          <svg
            class="seal stamped"
            viewBox="0 0 132 132"
            role="img"
            aria-label="Siegel: Biergarten Freunde, München"
          >
            <defs>
              <path id="siegelring" d="M66,66 m-49,0 a49,49 0 1,1 98,0 a49,49 0 1,1 -98,0" />
            </defs>
            <circle class="ringlinie" cx="66" cy="66" r="63" stroke-width="3" />
            <circle class="ringlinie" cx="66" cy="66" r="57" stroke-width="1.5" />
            <circle class="ringlinie" cx="66" cy="66" r="34" stroke-width="1.5" />
            <text font-size="11.5">
              <textPath href="#siegelring" startOffset="50%" text-anchor="middle">
                BIERGARTEN · FREUNDE ·
              </textPath>
            </text>
            <path class="raute" d="M66,48 L78,66 L66,84 L54,66 Z" />
            <text class="ort" x="66" y="112" font-size="8" text-anchor="middle">MÜNCHEN</text>
          </svg>

          <!--
            A `p`, not an `h1`: the site is called this on every page, but no
            page is *about* being called this. Each page brings its own `h1`.
          -->
          <p class="wordmark-text stamped">
            <NuxtLink to="/">
              <span class="l1">Biergarten</span><span class="l2">Freunde</span>
            </NuxtLink>
          </p>
        </div>

        <p>
          Sag, wo du losgehst, wie lange du Zeit hast und was du willst — die Tour baut
          sich selbst, samt Alternativen. <b>Wo du warst, wird abgestempelt.</b>
        </p>
      </div>
    </div>

    <div class="torn-edge" aria-hidden="true" />

    <div class="wrap">
      <!--
        The detail page gets a third segment instead of a back link of its own.
        A back link in its own row said "leave", and only that. As a segment it
        says where you are while the other two stay one press away — which is
        what somebody who landed on a garden from a search result needs.

        It is a span, not a link: it points at the page you are already on.
      -->
      <nav class="seg">
        <NuxtLink to="/planer">Tour bauen</NuxtLink>
        <NuxtLink to="/verzeichnis">Alle Biergärten</NuxtLink>
        <span v-if="onGarden" aria-current="page">Informationen</span>
      </nav>

      <slot />

      <!--
        One foot for the whole site. The caveats used to sit here as a loose
        paragraph under every page; they belong with the imprint and the map
        attribution, which are required anyway — and a reader looking for "how
        exact is this?" looks at the foot, not at the middle of a list.
      -->
      <footer class="fuss">
        <nav class="fuss-wege" aria-label="Fußzeile">
          <NuxtLink to="/planer">Tour bauen</NuxtLink>
          <NuxtLink to="/verzeichnis">Alle Biergärten</NuxtLink>
          <NuxtLink to="/impressum">Impressum</NuxtLink>
          <NuxtLink to="/datenschutz">Datenschutz</NuxtLink>
          <a href="mailto:servus@biergarten-freunde.de">Kontakt</a>
        </nav>

        <p class="fuss-genau">
          Fahrzeiten sind Schätzungen aus Luftlinie plus Umwegfaktor — für die echte
          Verbindung auf die Modus-Angabe tippen. Wo beim Ausschank <b>k.&nbsp;A.</b> steht,
          war die Brauerei nicht sicher zu verifizieren. „Bei schönem Wetter“ heißt: der
          Wirt entscheidet morgens um neun.
        </p>

        <p class="fuss-quelle">
          Kartendaten
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">
            © OpenStreetMap-Mitwirkende
          </a>
          (ODbL) · Kacheln: Protomaps
        </p>
      </footer>
    </div>
  </div>
</template>
