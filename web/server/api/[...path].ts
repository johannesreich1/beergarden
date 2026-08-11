/**
 * Durchreiche zur Laravel-Anwendung.
 *
 * Damit ist die API im Browser gleichursprünglich — kein CORS, keine
 * Preflights, keine zweite Domain in der CSP. Und beim Vorrendern erreicht
 * Nitro dieselbe Route über sich selbst, ohne dass irgendwo eine absolute
 * URL fest verdrahtet wäre.
 */
export default defineEventHandler((event) => {
  const { apiBase } = useRuntimeConfig(event)
  const path = getRouterParam(event, 'path')

  return proxyRequest(event, `${apiBase}/api/${path}`)
})
