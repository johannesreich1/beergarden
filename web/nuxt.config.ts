import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2026-08-10',
  devtools: { enabled: false },

  // Der Kern liegt bewusst ausserhalb von app/: kein Nuxt-Import, kein Vue,
  // kein DOM, keine Laravel-Abhaengigkeit. Wenn die Framework-Entscheidung je
  // kippt, zieht dieser Ordner unveraendert mit um.
  alias: {
    '#core': fileURLToPath(new URL('./core', import.meta.url)),
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Serverseitig. Im Compose-Netz heisst die Laravel-Anwendung "app".
    apiBase: 'http://app',
  },

  routeRules: {
    // Der Planer rechnet im Client und liest localStorage. Serverseitig
    // vorgerendert waere er eine leere Huelle plus Hydration-Flackern.
    '/': { ssr: false },

    // Verzeichnis und Detailseiten sind der SEO-relevante Teil. Sie werden
    // zur Build-Zeit erzeugt und danach statisch ausgeliefert - in Produktion
    // laeuft dafuer kein Node.
    '/verzeichnis': { prerender: true },
    '/biergarten/**': { prerender: true },
  },

  nitro: {
    prerender: {
      // Von /verzeichnis aus findet der Crawler jede Detailseite.
      routes: ['/verzeichnis'],
      crawlLinks: true,
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'de' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      ],
    },
  },
})
