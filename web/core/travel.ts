import { distanceKm } from './geo'
import type { Leg, Mode, PlanningMode, TravelTimes, Waypoint } from './types'

/**
 * Das Fahrzeitmodell ist eine Krücke und weiß das.
 *
 * Luftlinie mal Umwegfaktor durch Geschwindigkeit. Bekannte systematische
 * Fehler, dokumentiert in docs/PROJECT.md:
 *
 *   1. ÖPNV auf durchgehenden U-Bahn-Achsen zu schlecht — die pauschalen
 *      9 Minuten Grundzeit passen für die S-Bahn ins Umland, nicht für
 *      Hofbräukeller → Michaeligarten.
 *   2. Keine Höhenmeter. Der Anstieg nach Großhesselohe fehlt.
 *   3. Radfaktor 1.25 stimmt entlang der Isar, quer über den Mittleren Ring
 *      eher 1.4.
 *
 * Deshalb steht im UI überall ein ≈ und ein Link auf die echte Verbindung.
 * Das bleibt so, bis Valhalla dahinterliegt — dann fliegt diese Datei raus
 * und der Rest des Kerns merkt davon nichts.
 */

const WALK_DETOUR = 1.3
const WALK_KMH = 4.8
const BIKE_DETOUR = 1.25
const BIKE_KMH = 15
/** Aufschlag fürs Aufschließen und Abstellen. */
const BIKE_HANDLING_MIN = 2
/** Warten plus Umsteigen, pauschal. */
const TRANSIT_BASE_MIN = 9
const TRANSIT_DETOUR = 1.3
const TRANSIT_KMH = 20

const MIN_ACTIVE_MIN = 3
const MIN_TRANSIT_MIN = 8

/**
 * Fußweg von der nächsten Haltestelle. Startpunkte sind selbst Haltestellen
 * und tragen deshalb nichts bei.
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
 * Eine Etappe im gewählten Modus.
 *
 * Bei 'mix' entscheidet das Modell pro Etappe: zu Fuß, solange das unter dem
 * Limit bleibt und nicht mehr als zehn Minuten länger dauert als der ÖPNV.
 * Sonst ÖPNV. Bei einem festen Modus zählt stattdessen, ob das Limit hält —
 * `feasible` ist dann die Bedingung, an der der Generator Pfade abschneidet.
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
