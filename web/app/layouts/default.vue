<script setup lang="ts">
import { formatClock, sunsetMinutes } from '#core'

const MUNICH = { lat: 48.1374, lon: 11.5755 }

/**
 * Datum und Sonnenuntergang erst im Browser. Auf einer vorgerenderten Seite
 * wäre beides das Build-Datum und ab dem nächsten Tag falsch.
 *
 * Im Prototyp stand hier zusätzlich "31° · Sonne". Dafür gibt es keine Quelle —
 * und eine erfundene Wetterlage ist genau die Art Behauptung, die sich das
 * Projekt an anderer Stelle ausdrücklich verbietet.
 */
const today = ref<Date | null>(null)
const { theme, choose, hydrate } = useTheme()

/*
 * Läuft im <head>, also vor dem ersten Anstrich. Ohne das zeigt eine
 * vorgerenderte Seite kurz die Systemfassung und springt dann auf die
 * gewählte um — ein Blitzer, den man nicht mehr wegbekommt, wenn er
 * einmal drin ist.
 */
useHead({
  script: [{
    innerHTML:
      "try{var t=localStorage.getItem('bg-theme');"
      + "if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}",
    tagPosition: 'head',
  }],
})

const THEMES = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
] as const

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
        <div class="theme-switch" role="group" aria-label="ThemeChoice">
          <button
            v-for="option in THEMES"
            :key="option.value"
            :aria-pressed="theme === option.value"
            @click="choose(option.value)"
          >{{ option.label }}</button>
        </div>

        <div class="eyebrow">{{ eyebrow }}</div>

        <!--
          Das Siegel: Schrift auf dem Ring, bayerische Raute im Kern, Ort im Fuß.
          Schief aufgesetzt, weil ein Gummistempel nie gerade sitzt. Die Maske
          `abdruck` reißt die Farbe auf — dieselbe, die Titel und Schalter tragen.
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

        <h1 class="stamped">
          <NuxtLink to="/">
            <span class="l1">Biergarten</span><span class="l2">Freunde</span>
          </NuxtLink>
        </h1>

        <p>
          Sag, wo du losgehst, wie lange du Zeit hast und was du willst — die Tour baut
          sich selbst, samt Alternativen. <b>Wo du warst, wird abgestempelt.</b>
        </p>
      </div>
    </div>

    <div class="torn-edge" aria-hidden="true" />

    <div class="wrap">
      <nav class="seg">
        <NuxtLink to="/">Tour bauen</NuxtLink>
        <NuxtLink to="/verzeichnis">Alle Biergärten</NuxtLink>
      </nav>

      <slot />

      <footer>
        Fahrzeiten sind Schätzungen aus Luftlinie plus Umwegfaktor — für die echte
        Verbindung auf die Modus-Angabe tippen. Wo beim Ausschank <b>k.&nbsp;A.</b> steht,
        war die Brauerei nicht sicher zu verifizieren. „Bei schönem Wetter“ heißt: der
        Wirt entscheidet morgens um neun.
      </footer>
    </div>
  </div>
</template>
