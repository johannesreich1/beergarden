/**
 * The sitemap, built from the same list the directory is built from.
 *
 * Written by hand rather than by a module: it is one query and one loop, and a
 * module would bring its own config for the two things this needs to know.
 *
 * Prerendered like the pages it lists, so production serves a static file.
 */

interface ApiGarden {
  slug: string
  verified_at: string | null
}

/** Everything that is not a garden. Kept next to the route rules it mirrors. */
const STATIC_PATHS = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/verzeichnis', priority: '0.9', changefreq: 'weekly' },
]

/*
 * The planner is deliberately absent: it renders nothing without JavaScript,
 * so listing it would ask a crawler to index an empty page. It stays reachable
 * through the navigation for people.
 */

const xmlEscape = (value: string): string =>
  value.replace(/[<>&'"]/g, (char) => `&${{ '<': 'lt', '>': 'gt', '&': 'amp', "'": 'apos', '"': 'quot' }[char]};`)

export default defineEventHandler(async (event) => {
  const { public: config } = useRuntimeConfig(event)
  const url = (path: string) => xmlEscape(new URL(path, config.siteUrl).href)

  const { data: gardens } = await $fetch<{ data: ApiGarden[] }>('/api/gardens')

  const entries = [
    ...STATIC_PATHS.map((entry) => ({ ...entry, lastmod: null as string | null })),
    ...gardens.map((garden) => ({
      path: `/biergarten/${garden.slug}`,
      priority: '0.8',
      changefreq: 'monthly',
      // The date the facts were last checked is the honest lastmod — it says
      // when the content could have changed, not when the build ran.
      lastmod: garden.verified_at,
    })),
  ]

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((entry) => `  <url>
    <loc>${url(entry.path)}</loc>${entry.lastmod ? `
    <lastmod>${xmlEscape(entry.lastmod.slice(0, 10))}</lastmod>` : ''}
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('\n')}
</urlset>
`
})
