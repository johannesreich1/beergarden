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
  let unmounted = false

  onMounted(async () => {
    if (!container.value) return

    const [maplibre, { Protocol }] = await Promise.all([
      import('maplibre-gl'),
      import('pmtiles'),
      import('maplibre-gl/dist/maplibre-gl.css'),
    ])

    // The component can be gone before these land — MapLibre is a megabyte and
    // the first visit fetches it over the wire. By then Vue has run the unmount
    // hook, so a map built now is one nothing ever removes: it holds a WebGL
    // context for the life of the page. Once the browser starts reclaiming
    // contexts, the map that is still on screen loses its style and stops
    // asking for tiles without firing a single error.
    if (unmounted || !container.value) return

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
      // MapLibre labels its controls in English. Everything a visitor reads on
      // this site is German, and a screen reader announcing "Zoom in" in the
      // middle of it is the one place the seam would show.
      locale: {
        'NavigationControl.ZoomIn': 'Hineinzoomen',
        'NavigationControl.ZoomOut': 'Herauszoomen',
        'AttributionControl.ToggleAttribution': 'Quellenangabe ein- oder ausblenden',
        'Map.Title': 'Karte',
        'ScrollZoomBlocker.CtrlMessage': 'Zum Zoomen Strg gedrückt halten',
        'ScrollZoomBlocker.CmdMessage': 'Zum Zoomen ⌘ gedrückt halten',
      },
    })

    instance.touchZoomRotate.disableRotation()

    /*
     * Zoom buttons, always.
     *
     * Wheel and pinch are shortcuts, not the control — a mouse without a wheel,
     * a trackpad someone has never pinched on, and every keyboard user were
     * locked out of the one thing a map is for. No compass: rotation is off, so
     * a button that undoes a turn nobody can make is a button that lies.
     */
    instance.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right')

    // Without a listener MapLibre swallows source and style failures. A map
    // that stays grey without saying why costs an hour every single time.
    instance.on('error', (event) => console.error('[map]', event.error ?? event))

    // Before debugging a map that shows nothing: MapLibre 6 hangs the whole
    // style load on one requestAnimationFrame, so a map built while the tab is
    // hidden stays completely inert — no layers, no tile request, and not one
    // error event. Measured on 6.3.0: in a background tab `_order` is 0 and
    // `isStyleLoaded()` false; bring the tab to the front and the same instance
    // finishes on its own. A map inspected from a detached devtools window or a
    // covered window therefore always looks dead — check `visibilityState`
    // before believing it.
    instance.on('load', () => {
      // Framing happens after load, not at construction, and after a resize. A
      // map built inside a column that is still laying out has no size yet, and
      // `fitBounds` works off that size: framing the same tour at 0×0 and at
      // 330×337 gave zoom 10.15 against 10.39 — the tour ends up cut off rather
      // than filling the map. Measured, because the camera survives it; it is
      // the framing that is wrong, not the map.
      // The first framing does not animate — there is nothing to follow yet.
      instance.resize()
      if (options.fit) fitTo(instance, options.fit, false)
      draw?.(instance)
    })

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
    unmounted = true
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
