import type { GeoJSONSource, LayerSpecification, Map as MapLibreMap } from 'maplibre-gl'

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
 */
export function mapPin(kind: 'on' | 'off' | 'start', label?: string) {
  const element = document.createElement('div')
  element.className = `pin ${kind}`
  element.appendChild(document.createElement('i'))

  if (!label) return { element }

  const name = document.createElement('b')
  name.textContent = label
  element.appendChild(name)

  return { element, anchor: 'left' as const, offset: [-LOZENGE_HALF, 0] as [number, number] }
}
