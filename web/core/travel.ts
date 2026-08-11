import { distanceKm } from './geo'
import type { Leg, Mode, PlanningMode, TravelTimes, Waypoint } from './types'

/**
 * The travel model is a crutch and knows it.
 *
 * Straight-line distance times a detour factor over a speed. Known systematic
 * errors, documented in docs/PROJECT.md:
 *
 *   1. Public transport too pessimistic on continuous underground lines — the
 *      flat 9 minutes of base time fit the suburban train to the outskirts,
 *      not Hofbräukeller → Michaeligarten.
 *   2. No elevation. The climb up to Großhesselohe is missing.
 *   3. The 1.25 cycling factor holds along the Isar; across the Mittlerer Ring
 *      it is closer to 1.4.
 *
 * That is why the UI shows a ≈ everywhere plus a link to the real connection.
 * It stays that way until Valhalla sits behind it — then this file goes and
 * the rest of the core never notices.
 */

const WALK_DETOUR = 1.3
const WALK_KMH = 4.8
const BIKE_DETOUR = 1.25
const BIKE_KMH = 15
/** Surcharge for unlocking and parking the bike. */
const BIKE_HANDLING_MIN = 2
/** Waiting plus changing, as a flat allowance. */
const TRANSIT_BASE_MIN = 9
const TRANSIT_DETOUR = 1.3
const TRANSIT_KMH = 20

const MIN_ACTIVE_MIN = 3
const MIN_TRANSIT_MIN = 8

/**
 * Walk from the nearest stop. Start points are stops themselves and therefore
 * contribute nothing.
 */
const accessMinutes = (point: Waypoint): number => point.stationWalkMin ?? 0

export function travelTimes(a: Waypoint, b: Waypoint): TravelTimes {
  const km = distanceKm(a, b)

  return {
    km,
    walk: Math.max(MIN_ACTIVE_MIN, Math.round(((km * WALK_DETOUR) / WALK_KMH) * 60)),
    bike: Math.max(MIN_ACTIVE_MIN, Math.round(((km * BIKE_DETOUR) / BIKE_KMH) * 60) + BIKE_HANDLING_MIN),
    transit: Math.max(
      MIN_TRANSIT_MIN,
      Math.round(
        TRANSIT_BASE_MIN +
          accessMinutes(a) +
          accessMinutes(b) +
          ((km * TRANSIT_DETOUR) / TRANSIT_KMH) * 60,
      ),
    ),
  }
}

/**
 * One leg in the chosen mode.
 *
 * With 'mix' the model decides per leg: on foot as long as that stays under
 * the limit and takes no more than ten minutes longer than public transport.
 * Otherwise public transport. With a fixed mode what counts instead is whether
 * the limit holds — `feasible` is then the condition the generator prunes on.
 */
export function planLeg(
  a: Waypoint,
  b: Waypoint,
  mode: PlanningMode,
  maxLegMinutes: number,
): Leg {
  const times = travelTimes(a, b)

  const chosen: Mode =
    mode === 'mix'
      ? times.walk <= maxLegMinutes && times.walk <= times.transit + 10
        ? 'walk'
        : 'transit'
      : mode

  return {
    ...times,
    mode: chosen,
    min: times[chosen],
    feasible: mode === 'mix' ? true : times[chosen] <= maxLegMinutes,
  }
}
