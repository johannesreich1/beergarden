/**
 * Pass-through to the Laravel application.
 *
 * This makes the API same-origin in the browser — no CORS, no preflights, no
 * second domain in the CSP. And while prerendering, Nitro reaches the same
 * route through itself, without an absolute URL hard-wired anywhere.
 */
export default defineEventHandler((event) => {
  const { apiBase } = useRuntimeConfig(event)
  const path = getRouterParam(event, 'path')

  return proxyRequest(event, `${apiBase}/api/${path}`)
})
