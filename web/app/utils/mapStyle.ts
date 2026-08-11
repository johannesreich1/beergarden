import type { StyleSpecification } from 'maplibre-gl'
import type { Mode } from '#core'

/**
 * The map style, built from the palette in `main.css`.
 *
 * Not a JSON file, for two reasons. The map has to follow the theme switch, and
 * the colours have exactly one home — the stylesheet. Reading the custom
 * properties at runtime is what stops a second palette from growing here.
 *
 * Deliberately without labels, and therefore without glyphs. Every label font
 * would be a `.pbf` from protomaps.github.io, and the point of self-hosted tiles
 * is that the page calls nobody. Water, parks and streets place a garden well
 * enough; its name is on the page already.
 */

/** Where the tiles live. Served by us, which is the whole point. */
export const TILES_URL = '/tiles/munich.pmtiles'

/** OpenStreetMap's licence asks for this, and it is not negotiable. */
export const MAP_ATTRIBUTION
  = '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a> · Protomaps'

/**
 * Everything green in `landuse`. Protomaps splits this finely; we do not — a
 * park and a cemetery are the same thing on a map at this size: not built on.
 */
const GREEN = [
  'park', 'forest', 'wood', 'grass', 'meadow', 'garden', 'nature_reserve',
  'recreation_ground', 'village_green', 'allotments', 'cemetery', 'golf_course',
  'pitch', 'scrub', 'farmland', 'orchard',
]

export function mapStyle(): StyleSpecification {
  const css = getComputedStyle(document.documentElement)
  const token = (name: string): string => css.getPropertyValue(name).trim()

  const ground = token('--map-ground')
  const park = token('--map-park')
  const water = token('--map-water')
  const line = token('--map-label')

  return {
    version: 8,
    // No glyphs and no sprite: nothing on this map is a label or an icon.
    sources: {
      protomaps: {
        type: 'vector',
        url: `pmtiles://${TILES_URL}`,
        attribution: MAP_ATTRIBUTION,
      },
    },
    layers: [
      { id: 'ground', type: 'background', paint: { 'background-color': ground } },

      {
        id: 'green',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'landuse',
        filter: ['in', ['get', 'kind'], ['literal', GREEN]],
        paint: { 'fill-color': park },
      },

      {
        id: 'water',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'water',
        paint: { 'fill-color': water, 'fill-opacity': 0.42 },
      },

      // Buildings only from close up, and only as a texture. Any stronger and
      // they swallow the streets, which are what people navigate by.
      {
        id: 'buildings',
        type: 'fill',
        source: 'protomaps',
        'source-layer': 'buildings',
        minzoom: 14,
        paint: { 'fill-color': line, 'fill-opacity': 0.12 },
      },

      // Three road weights, not seven. This is a locator map, not a road atlas.
      {
        id: 'roads-minor',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'roads',
        filter: ['in', ['get', 'kind'], ['literal', ['minor_road', 'path']]],
        minzoom: 13,
        paint: {
          'line-color': line,
          'line-opacity': 0.5,
          'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.4, 16, 1.6],
        },
      },
      {
        id: 'roads-medium',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'roads',
        filter: ['==', ['get', 'kind'], 'medium_road'],
        paint: {
          'line-color': line,
          'line-opacity': 0.7,
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 16, 3],
        },
      },
      {
        id: 'roads-major',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'roads',
        filter: ['in', ['get', 'kind'], ['literal', ['major_road', 'highway']]],
        paint: {
          'line-color': line,
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.7, 16, 4.5],
        },
      },

      // The Isar as a line as well as an area: above the bridges it is narrower
      // than a tile pixel, and a river that disappears is worse than none.
      {
        id: 'water-line',
        type: 'line',
        source: 'protomaps',
        'source-layer': 'water',
        paint: {
          'line-color': water,
          'line-opacity': 0.55,
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.6, 16, 2.5],
        },
      },
    ],
  }
}

/**
 * Leg colours and dash patterns for the tour map.
 *
 * The colours live in the stylesheet like every other colour; MapLibre paint
 * properties cannot read `var()`, so they are resolved here — at draw time,
 * which is exactly when the theme may have changed.
 *
 * The dashes are measured in line widths rather than pixels: MapLibre scales
 * them with the line, so one pattern holds at every zoom. Walking is a dotted
 * line, the tram a long dash — the same reading as in the legend.
 */
export function legPaint(): Record<Mode, { color: string, dash: number[] }> {
  const css = getComputedStyle(document.documentElement)
  const token = (name: string): string => css.getPropertyValue(name).trim()

  return {
    walk: { color: token('--leg-walk'), dash: [0.1, 1.9] },
    bike: { color: token('--leg-bike'), dash: [1.6, 1.2] },
    transit: { color: token('--leg-transit'), dash: [3, 2] },
  }
}
