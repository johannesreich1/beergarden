import type { LngLatBoundsLike, Map as MapLibreMap } from 'maplibre-gl'

/**
 * A MapLibre map in a container, with everything that is the same every time.
 *
 * MapLibre and the pmtiles protocol are loaded on first use, not with the page:
 * together they weigh more than the rest of the application, and most visits
 * never reach a map. That is also why this only ever runs in the browser — the
 * detail pages are prerendered, and there is no WebGL in a build step.
 *
 * `draw` is called once the style is ready and again after every theme change,
 * because `setStyle` discards every layer that was added by hand.
 */
export function useMap(
  container: Ref<HTMLElement | undefined>,
  options: {
    center: [number, number]
    zoom: number
    /** Two or more points to frame instead of using center and zoom. */
    fit?: Array<[number, number]>
    interactive?: boolean
  },
  draw?: (map: MapLibreMap) => void,
) {
  const map = shallowRef<MapLibreMap | null>(null)
  let resize: ResizeObserver | null = null

  onMounted(async () => {
    if (!container.value) return

    const [maplibre, { Protocol }] = await Promise.all([
      import('maplibre-gl'),
      import('pmtiles'),
      import('maplibre-gl/dist/maplibre-gl.css'),
    ])

    // Registered once for the whole page: the protocol belongs to the library,
    // not to a map. Registering it twice would replace the handler while the
    // first map is still reading tiles through it.
    if (!window.__pmtilesRegistered) {
      maplibre.addProtocol('pmtiles', new Protocol().tile)
      window.__pmtilesRegistered = true
    }

    const instance = new maplibre.Map({
      container: container.value,
      style: mapStyle(),
      center: options.center,
      zoom: options.zoom,
      interactive: options.interactive ?? true,
      attributionControl: { compact: true },
      // Nothing here is tilted or turned. A locator map the reader can rotate
      // by accident is a locator map they have to straighten out again.
      dragRotate: false,
      pitchWithRotate: false,
    })

    instance.touchZoomRotate.disableRotation()

    // The first framing does not animate: there is nothing to follow yet, and
    // a map that flies in from the world view on load looks like a bug.
    if (options.fit) fitTo(instance, options.fit, false)

    // Without a listener MapLibre swallows source and style failures. A map
    // that stays grey without saying why costs an hour every single time.
    instance.on('error', (event) => console.error('[map]', event.error ?? event))

    instance.on('load', () => draw?.(instance))

    // A map that is built while its column is still zero wide stays grey
    // forever: MapLibre measures once, at construction. The observer is not
    // belt and braces here — inside a grid column that is exactly what happens.
    resize = new ResizeObserver(() => instance.resize())
    resize.observe(container.value)

    map.value = instance
  })

  // The style carries the palette, so a theme change is a new style — and the
  // handmade layers have to be drawn onto it again.
  const { theme } = useTheme()

  watch(theme, () => {
    const instance = map.value
    if (!instance) return

    instance.setStyle(mapStyle())
    instance.once('styledata', () => draw?.(instance))
  })

  onBeforeUnmount(() => {
    resize?.disconnect()
    resize = null
    map.value?.remove()
    map.value = null
  })

  /**
   * Frame these points.
   *
   * Callers use this when what is on the map changes — the initial `fit` only
   * covers what was there at construction, and a tour that gains a stop off
   * screen would otherwise be drawn outside the visible section.
   */
  const fit = (points: Array<[number, number]>, animate = true): void => {
    if (map.value) fitTo(map.value, points, animate)
  }

  return { map, fit }
}

/**
 * Put these points in view.
 *
 * A single point has no extent, so `fitBounds` would zoom to whatever maximum
 * it can — hence the separate case. `maxZoom` does the same job for two stops
 * that happen to sit on the same square.
 */
function fitTo(map: MapLibreMap, points: Array<[number, number]>, animate: boolean): void {
  if (!points.length) return

  if (points.length === 1) {
    map.easeTo({ center: points[0], zoom: 14, duration: animate ? 600 : 0 })
    return
  }

  map.fitBounds(boundsOf(points), {
    padding: 46,
    maxZoom: 15,
    duration: animate ? 600 : 0,
  })
}

/** The smallest box around a set of points, as MapLibre wants it. */
function boundsOf(points: Array<[number, number]>): LngLatBoundsLike {
  const lon = points.map((point) => point[0])
  const lat = points.map((point) => point[1])

  return [
    [Math.min(...lon), Math.min(...lat)],
    [Math.max(...lon), Math.max(...lat)],
  ]
}

declare global {
  interface Window {
    __pmtilesRegistered?: boolean
  }
}
