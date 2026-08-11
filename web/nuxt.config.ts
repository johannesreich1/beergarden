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
    // The planner computes in the client and reads localStorage. Prerendered on
    // the server it would be an empty shell plus a hydration flash.
    '/planer': { ssr: false },

    // Landing page, directory and detail pages are the SEO-relevant part. They
    // are built at build time and served statically afterwards — no Node runs
    // for them in production.
    '/': { prerender: true },
    '/verzeichnis': { prerender: true },
    '/biergarten/**': { prerender: true },
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
