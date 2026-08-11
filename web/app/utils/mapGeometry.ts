import type { Coordinates } from '#core'

/**
 * The hand-drawn map.
 *
 * Deliberately not a real mapping library: in the suggestion list this sketch
 * has more charm than a tile-map crop, it renders instantly and needs no
 * network. MapLibre and Protomaps come later where people actually navigate —
 * not here.
 *
 * Projection: equidistant around Munich, with a latitude correction. Across a
 * twenty-kilometre crop the error is invisible.
 */

const LAT0 = 48.14
const LON0 = 11.575
const SCALE = 3400
const COS_LAT = Math.cos((LAT0 * Math.PI) / 180)

/** Aspect ratio of the map crop, matching `svg.map` in the stylesheet. */
const ASPECT = 1 / 1.02

export type Point = [number, number]

export const project = ({ lat, lon }: Coordinates): Point => [
  (lon - LON0) * COS_LAT * SCALE,
  (LAT0 - lat) * SCALE,
]

/** A lake's semi-axes, from degrees into screen units. */
export const projectRadius = (radii: { rx: number, ry: number }): Point => [
  radii.rx * COS_LAT * SCALE,
  radii.ry * SCALE,
]

const coord = (lat: number, lon: number): Coordinates => ({ lat, lon })

export const ISAR: Coordinates[] = [
  coord(48.199, 11.62), coord(48.184, 11.606), coord(48.17, 11.6), coord(48.158, 11.594),
  coord(48.147, 11.5905), coord(48.1385, 11.59), coord(48.131, 11.585), coord(48.1265, 11.579),
  coord(48.1215, 11.574), coord(48.117, 11.568), coord(48.113, 11.561), coord(48.109, 11.549),
  coord(48.101, 11.548), coord(48.0965, 11.5445), coord(48.088, 11.545),
]

export const LAKES = [
  { lat: 48.1596, lon: 11.5928, rx: 0.0024, ry: 0.0014 },
  { lat: 48.1103, lon: 11.6293, rx: 0.0016, ry: 0.0009 },
  { lat: 48.0958, lon: 11.5413, rx: 0.0007, ry: 0.0017 },
  { lat: 48.122, lon: 11.525, rx: 0.0012, ry: 0.0006 },
]

export const PARKS: Coordinates[][] = [
  [
    coord(48.1435, 11.583), coord(48.15, 11.5875), coord(48.162, 11.5875), coord(48.176, 11.5975),
    coord(48.188, 11.607), coord(48.186, 11.615), coord(48.172, 11.61), coord(48.159, 11.602),
    coord(48.147, 11.5945), coord(48.1415, 11.5885),
  ],
  [coord(48.105, 11.6195), coord(48.1165, 11.6205), coord(48.117, 11.639), coord(48.1045, 11.6375)],
  [
    coord(48.118, 11.559), coord(48.113, 11.5455), coord(48.094, 11.5395), coord(48.087, 11.541),
    coord(48.089, 11.556), coord(48.105, 11.559),
  ],
  [coord(48.115, 11.512), coord(48.125, 11.515), coord(48.124, 11.534), coord(48.114, 11.532)],
  [coord(48.144, 11.5), coord(48.164, 11.498), coord(48.165, 11.522), coord(48.145, 11.523)],
]

export const HOODS = [
  { lat: 48.1375, lon: 11.5715, label: 'Zentrum' },
  { lat: 48.1645, lon: 11.578, label: 'Schwabing' },
  { lat: 48.1765, lon: 11.624, label: 'Oberföhring' },
  { lat: 48.113, lon: 11.611, label: 'Neuperlach' },
  { lat: 48.101, lon: 11.55, label: 'Thalkirchen' },
  { lat: 48.156, lon: 11.515, label: 'Nymphenburg' },
]

export const polygonPoints = (points: Coordinates[]): string =>
  points.map((point) => project(point).join(',')).join(' ')

/** Round corners into a river course — quadratic Béziers through the midpoints. */
export function smoothPath(points: Coordinates[]): string {
  const projected = points.map(project)
  const fixed = (value: number) => value.toFixed(1)

  let path = `M${fixed(projected[0][0])},${fixed(projected[0][1])}`

  for (let i = 1; i < projected.length - 1; i++) {
    const midX = (projected[i][0] + projected[i + 1][0]) / 2
    const midY = (projected[i][1] + projected[i + 1][1]) / 2
    path += ` Q${fixed(projected[i][0])},${fixed(projected[i][1])} ${fixed(midX)},${fixed(midY)}`
  }

  const last = projected[projected.length - 1]

  return `${path} L${fixed(last[0])},${fixed(last[1])}`
}

/**
 * A slightly curved arc between two points. Straight lines would look like
 * straight-line distances — which is exactly what the legs are, but the map
 * should not claim it.
 */
export function arcBetween(from: Coordinates, to: Coordinates): string {
  const [ax, ay] = project(from)
  const [bx, by] = project(to)

  const midX = (ax + bx) / 2 + (by - ay) * 0.13
  const midY = (ay + by) / 2 - (bx - ax) * 0.13
  const fixed = (value: number) => value.toFixed(1)

  return `M${fixed(ax)},${fixed(ay)} Q${fixed(midX)},${fixed(midY)} ${fixed(bx)},${fixed(by)}`
}

/** Choose the viewport so every point fits with a margin. */
export function viewBoxFor(points: Coordinates[]): string {
  const projected = points.map(project)
  const xs = projected.map(([x]) => x)
  const ys = projected.map(([, y]) => y)

  let x0 = Math.min(...xs)
  let x1 = Math.max(...xs)
  let y0 = Math.min(...ys)
  let y1 = Math.max(...ys)

  const padX = (x1 - x0) * 0.3 + 38
  const padY = (y1 - y0) * 0.2 + 38

  x0 -= padX
  x1 += padX
  y0 -= padY
  y1 += padY

  let width = x1 - x0
  let height = y1 - y0

  if (width / height > ASPECT) {
    const target = width / ASPECT
    y0 -= (target - height) / 2
    height = target
  }
  else {
    const target = height * ASPECT
    x0 -= (target - width) / 2
    width = target
  }

  return [x0, y0, width, height].map((value) => value.toFixed(1)).join(' ')
}

/**
 * Leg colours come from the stylesheet, not from this file.
 *
 * Otherwise the map would carry two colour tables for light and dark, and
 * somebody would have to remember to maintain both. SVG presentation
 * attributes do not understand `var()` — which is why these values are applied
 * as a `style` binding in the template rather than as a `stroke` attribute.
 */
export const LEG_COLOURS: Record<string, string> = {
  walk: 'var(--leg-walk)',
  bike: 'var(--leg-bike)',
  transit: 'var(--leg-transit)',
}

export const LEG_DASHES: Record<string, string> = {
  walk: '1 6',
  bike: '5 4',
  transit: '9 6',
}
