/**
 * robots.txt.
 *
 * A route rather than a file in `public/`, because the sitemap line has to
 * carry an absolute URL and the domain is only known from the environment.
 * One place decides what the site is called: `siteUrl`.
 */
export default defineEventHandler((event) => {
  const { public: config } = useRuntimeConfig(event)

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')

  /*
   * Nothing is disallowed. /planer renders nothing without JavaScript, but
   * blocking it would also stop a crawler from seeing that it links onward —
   * and there is nothing there to waste a crawl budget on either.
   */
  return `User-agent: *
Allow: /

Sitemap: ${new URL('/sitemap.xml', config.siteUrl).href}
`
})
