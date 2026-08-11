import type { Garden, OpeningHour } from './types'

/**
 * Der Selbstbedienungs-Biergarten. Restaurant und SB-Bereich im selben Haus
 * haben unterschiedliche Zeiten — deshalb ist `area` Teil des Schlüssels und
 * nicht optional.
 */
export const GARDEN_AREA = 'garden'

export interface OpeningWindow {
  opensAt: number
  closesAt: number
}

export function hoursFor(
  garden: Garden,
  weekday: number,
  area: string = GARDEN_AREA,
): OpeningHour | undefined {
  return garden.openingHours.find((h) => h.weekday === weekday && h.area === area)
}

/**
 * Das Zeitfenster für einen Wochentag, oder null wenn geschlossen.
 *
 * null ist hier die ehrliche Antwort auf drei verschiedene Fälle: Ruhetag,
 * kein Eintrag, Eintrag ohne Zeiten. Der Aufrufer muss keinen davon
 * unterscheiden — er will nur wissen, ob er planen kann.
 */
export function openingWindow(
  garden: Garden,
  weekday: number,
  area: string = GARDEN_AREA,
): OpeningWindow | null {
  const hours = hoursFor(garden, weekday, area)

  if (!hours || hours.isClosed || hours.opensAt === null || hours.closesAt === null) {
    return null
  }

  return { opensAt: hours.opensAt, closesAt: hours.closesAt }
}

export function isOpenOn(garden: Garden, weekday: number, area: string = GARDEN_AREA): boolean {
  return openingWindow(garden, weekday, area) !== null
}

/**
 * Ob für diesen Tag überhaupt eine verifizierte Quelle hinterlegt ist.
 * Solange das nirgends true ist, gehört ein ≈ ins UI.
 */
export function isVerified(garden: Garden, weekday: number, area: string = GARDEN_AREA): boolean {
  return hoursFor(garden, weekday, area)?.verifiedAt !== null
}
