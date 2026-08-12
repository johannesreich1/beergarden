import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2026-08-10',
  devtools: { enabled: false },

  // The core sits outside app/ on purpose: no Nuxt import, no Vue, no DOM, no
  // Laravel dependency. If the framework decision ever flips, this folder moves
  // across unchanged.
  alias: {
    '#core': fileURLToPath(new URL('./core', import.meta.url)),
  },

  modules: ['@nuxtjs/i18n'],

  // One language today, and still no string lives in a template: the words
  // sit in i18n/locales/de.json, the code holds keys. `no_prefix` keeps the
  // German URLs exactly as they are — a second language would decide its own
  // strategy when it arrives, not inherit one guessed today.
  i18n: {
    locales: [{ code: 'de', language: 'de-DE', file: 'de.json' }],
    defaultLocale: 'de',
    strategy: 'no_prefix',
  },

  css: ['~/assets/css/main.css'],

  vite: {
    // MapLibre parses tiles in a web worker that it spawns from its own module
    // URL. Vite's dependency pre-bundling rewrites that URL into .vite/deps, the
    // worker is never fetched, and the map then stays empty without a single
    // error: sources load forever and no tile is ever requested.
    optimizeDeps: { exclude: ['maplibre-gl'] },
  },

  runtimeConfig: {
    // Server side only. On the compose network the Laravel app is called "app".
    apiBase: 'http://app',

    public: {
      // Canonical and og:url have to be absolute, so the deployment has to know
      // its own address. Override with NUXT_PUBLIC_SITE_URL. The default is
      // localhost on purpose: wrong in production, but visibly wrong in the
      // first crawl rather than silently missing.
      siteUrl: 'http://localhost:3000',
    },
  },

  routeRules: {
    // The planner computes in the client and reads localStorage, so its body
    // waits for the browser — see the `ClientOnly` in the page. What is
    // prerendered is the head and the frame around it: with `ssr: false` the
    // route shipped 944 bytes without a title, and a shared link then showed
    // the bare URL in every messenger. It stays out of the sitemap and out of
    // the index; a head is worth having even for a page nobody should find
    // through a search.
    '/planer': { prerender: true },

    // Landing page, directory and detail pages are the SEO-relevant part. They
    // are built at build time and served statically afterwards — no Node runs
    // for them in production.
    '/': { prerender: true },
    '/verzeichnis': { prerender: true },
    '/biergarten/**': { prerender: true },
    // Pure prose, identical for everyone — and legally required to be reachable
    // even when nothing else works.
    '/impressum': { prerender: true },
    '/datenschutz': { prerender: true },
  },

  nitro: {
    prerender: {
      // From / and /verzeichnis the crawler finds every detail page. The
      // sitemap is listed explicitly because nothing links to it.
      routes: ['/', '/verzeichnis', '/sitemap.xml'],
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
