import type { Garden } from './types'

/**
 * Wie lange man sitzen bleibt.
 *
 * Die Regel steht hier und nur hier — Generator, Ablauf und Prüfung fragen
 * dieselbe Funktion. Sonst driften die drei auseinander, und der Planer
 * verspricht eine Sitzzeit, die der Zeitstrahl nicht einhält.
 */

/** Unter einer Dreiviertelstunde ist es kein Biergartenbesuch. */
export const MIN_STAY_MINUTES = 45
/** Darüber wird aus einer Tour ein Sitzenbleiben. */
export const MAX_STAY_MINUTES = 150
/** Sitzzeiten auf fünf Minuten runden. Alles andere täuscht Genauigkeit vor. */
export const STAY_ROUNDING = 5

/**
 * Die Sitzzeit an diesem Garten: der Vorschlag, in seine Grenzen geklemmt.
 *
 * Beide Grenzen sind optional. Wo keine hinterlegt ist, gilt die globale —
 * ein geratener Wert wäre schlechter als gar keiner, und ein Garten ohne
 * erhobene Grenzen soll sich verhalten wie bisher.
 */
export function stayAt(garden: Garden, suggested: number): number {
  const min = garden.minStayMinutes ?? MIN_STAY_MINUTES
  const max = garden.maxStayMinutes ?? MAX_STAY_MINUTES

  return Math.min(Math.max(suggested, min), max)
}

/** Der Vorschlag vor dem Klemmen: verfügbare Sitzzeit auf die Stationen verteilt. */
export const suggestStay = (sitTotal: number, stops: number): number =>
  Math.floor(sitTotal / stops / STAY_ROUNDING) * STAY_ROUNDING
