/**
 * One way to give a page its metadata.
 *
 * Before this every page hand-rolled `useHead({ title })`, which meant the
 * title suffix existed three times and description, canonical and Open Graph
 * existed nowhere. A page states what it is; where those facts end up in the
 * document is decided here, once.
 */

export interface PageSeo {
  /** Without the site name — the suffix is added by `pageTitle`. */
  title?: string
  description: string
  /** `website` for the landing page, `article` for a garden. */
  type?: 'website' | 'article'
}

/**
 * The absolute URL of the current page.
 *
 * Canonical and `og:url` have to be absolute, so the deployment has to know its
 * own address. It comes from `NUXT_PUBLIC_SITE_URL`; in dev that is localhost,
 * which is wrong in production but not silently wrong — a localhost canonical
 * is visible in the first crawl.
 */
function useCanonical() {
  const route = useRoute()
  const { public: config } = useRuntimeConfig()

  return computed(() => {
    // No trailing slash except on the root: `/planer` and `/planer/` are one
    // page, and two canonicals for one page is the problem canonicals solve.
    const path = route.path === '/' ? '/' : route.path.replace(/\/$/, '')

    return new URL(path, config.siteUrl).href
  })
}

/** Sets title, description, canonical and Open Graph for one page. */
export function usePageSeo(input: PageSeo | (() => PageSeo)): void {
  const seo = computed(() => (typeof input === 'function' ? input() : input))
  const canonical = useCanonical()
  const title = computed(() => pageTitle(seo.value.title))

  useHead({
    title,
    link: [{ rel: 'canonical', href: canonical }],
  })

  useSeoMeta({
    description: () => seo.value.description,
    ogTitle: title,
    ogDescription: () => seo.value.description,
    ogType: () => seo.value.type ?? 'website',
    ogUrl: canonical,
    ogLocale: SITE.locale,
    ogSiteName: SITE.name,
    twitterCard: 'summary',
  })
}

/**
 * A schema.org block for this page.
 *
 * `</script>` inside a JSON string would close the tag it sits in, so the
 * angle bracket is escaped. `<` is still valid JSON and parses back to
 * "<" — the crawler reads what we meant, the browser cannot be tricked.
 */
export function useJsonLd(data: MaybeRefOrGetter<Record<string, unknown>>): void {
  useHead({
    script: [{
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(toValue(data)).replace(/</g, '\\u003c')),
    }],
  })
}
