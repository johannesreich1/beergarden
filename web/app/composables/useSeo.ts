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
  /**
   * Whether the page belongs in a search index. Default yes.
   *
   * A page that renders nothing without JavaScript still wants a title and a
   * description — that is what a messenger shows when somebody shares the
   * link — but it does not want to be a search result. The two are separate
   * decisions, so the page states the decision and this file writes the tag.
   */
  indexable?: boolean
}

/**
 * Turns a path into an absolute URL.
 *
 * Canonical, `og:url` and every `@id` in a schema.org block have to be
 * absolute, so the deployment has to know its own address. It comes from
 * `NUXT_PUBLIC_SITE_URL`; in dev that is localhost, which is wrong in
 * production but not silently wrong — a localhost canonical is visible in the
 * first crawl.
 */
export function useAbsoluteUrl(): (path: string) => string {
  const { public: config } = useRuntimeConfig()

  return (path: string) => new URL(path, config.siteUrl).href
}

/** The absolute URL of the current page. */
function useCanonical() {
  const route = useRoute()
  const absoluteUrl = useAbsoluteUrl()

  return computed(() => {
    // No trailing slash except on the root: `/planer` and `/planer/` are one
    // page, and two canonicals for one page is the problem canonicals solve.
    const path = route.path === '/' ? '/' : route.path.replace(/\/$/, '')

    return absoluteUrl(path)
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
    // `follow` rather than `none`: the page is not worth indexing, its links
    // still are.
    robots: () => (seo.value.indexable === false ? 'noindex, follow' : null),
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

/**
 * Drops the properties we have no value for.
 *
 * `null` in a schema.org block is a claim about a gap; leaving the property out
 * is the honest form of not knowing. Same rule as everywhere else here — what
 * is not verified does not get written down. An empty array counts as nothing
 * known too: `openingHoursSpecification: []` says the place is never open.
 */
export function compactJsonLd<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([, value]) =>
        value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0),
    ),
  ) as Partial<T>
}
