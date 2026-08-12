import type * as GeoJSON from 'geojson'
import type { GeoJSONSource, LayerSpecification, Map as MapLibreMap } from 'maplibre-gl'
import { legPaint } from './mapStyle'

/**
 * Adding to a map that may already have it.
 *
 * `draw` runs again after every theme change, and by then MapLibre may or may
 * not have kept a source across `setStyle`. Both helpers make the second run
 * behave like the first instead of throwing on a duplicate id.
 */

export function ensureSource(map: MapLibreMap, id: string, data: GeoJSON.GeoJSON): void {
  const existing = map.getSource(id) as GeoJSONSource | undefined

  if (existing) existing.setData(data)
  else map.addSource(id, { type: 'geojson', data })
}

export function ensureLayer(map: MapLibreMap, layer: LayerSpecification): void {
  if (!map.getLayer(layer.id)) map.addLayer(layer)
}

/** A point as GeoJSON wants it: longitude first. */
export const point = (place: { lat: number, lon: number }): [number, number] =>
  [place.lon, place.lat]

/**
 * The legs of a tour as GeoJSON: one line per hop, tagged with its mode.
 *
 * Both maps draw the same kind of route and used to build it separately —
 * the chain from the start through every stop is one statement, made here.
 */
export function legFeatures(
  start: { lat: number, lon: number },
  stops: Array<{ place: { lat: number, lon: number }, mode: string }>,
): GeoJSON.FeatureCollection {
  let previous = start

  return {
    type: 'FeatureCollection',
    features: stops.map((stop) => {
      const feature: GeoJSON.Feature = {
        type: 'Feature',
        properties: { mode: stop.mode },
        geometry: { type: 'LineString', coordinates: [point(previous), point(stop.place)] },
      }
      previous = stop.place

      return feature
    }),
  }
}

/**
 * The leg layers, one per mode, in the palette's dashes.
 *
 * Idempotent like the helpers above, so a theme change or a plan edit can
 * simply call it again.
 */
export function drawLegLayers(map: MapLibreMap, features: GeoJSON.FeatureCollection): void {
  ensureSource(map, 'legs', features)

  for (const [mode, paint] of Object.entries(legPaint())) {
    ensureLayer(map, {
      id: `leg-${mode}`,
      type: 'line',
      source: 'legs',
      filter: ['==', ['get', 'mode'], mode],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': paint.color,
        'line-width': 3,
        'line-dasharray': paint.dash,
      },
    })
  }
}

/** Half the lozenge, from `.pin i` in the stylesheet. */
const LOZENGE_HALF = 6.5

/**
 * A pin on the map, ready to hand to `new Marker(…)`.
 *
 * Built from DOM nodes rather than a string: the names come from the database,
 * and `textContent` cannot be talked into being markup. The look lives in
 * `main.css` under `.pin`, like every other part of the design.
 *
 * With a name the pin is a pair, so it is anchored on its left edge and pulled
 * back by half a lozenge — otherwise the marker centres the whole pair on the
 * coordinate and the lozenge lands next to the place it is pointing at.
 *
 * A pin that does something on click is a `<button>`, not a div with a
 * listener: on the builder the map IS the list, and a div-only map is a list
 * the keyboard cannot reach. `action` is the accessible name — what a press
 * does, since the visible label may be hidden until hover.
 */
export function mapPin(kind: 'on' | 'off' | 'start', label?: string, action?: string) {
  const element = document.createElement(action ? 'button' : 'div')
  if (action) {
    (element as HTMLButtonElement).type = 'button'
    element.setAttribute('aria-label', action)
  }
  element.className = `pin ${kind}`
  element.appendChild(document.createElement('i'))

  if (!label) return { element }

  const name = document.createElement('b')
  name.textContent = label
  element.appendChild(name)

  return { element, anchor: 'left' as const, offset: [-LOZENGE_HALF, 0] as [number, number] }
}
