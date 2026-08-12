import { describe, expect, it } from 'vitest'
import { TUESDAY, gardenBySlug } from './fixtures'
import { isOpenOn, isVerified, openingWindow, windowProblem } from './hours'
import { at } from './time'

const MONDAY = 1

/**
 * CLAUDE.md states the opening-hours rule as "mit weekday UND area" and holds
 * this module up as its example of "prüfbar statt behauptet". The weekday
 * half was proven from three angles; the area half was asserted only — every
 * fixture row used to be the garden area. The WaWi now carries a restaurant
 * area with its own hours, so both halves are tests.
 */

describe('openingWindow mit area', () => {
  it('Restaurant und Garten im selben Haus haben verschiedene Zeiten', () => {
    const wawi = gardenBySlug('wawi')

    const garden = openingWindow(wawi, MONDAY)
    const restaurant = openingWindow(wawi, MONDAY, 'restaurant')

    expect(garden).toEqual({ opensAt: at(11), closesAt: at(23) })
    expect(restaurant).toEqual({ opensAt: at(17), closesAt: at(23, 30) })
  })

  it('eine Fläche ohne Eintrag für den Tag ist zu, nicht offen', () => {
    // The restaurant has only a Monday row in the fixture.
    expect(openingWindow(gardenBySlug('wawi'), TUESDAY, 'restaurant')).toBeNull()
    expect(isOpenOn(gardenBySlug('wawi'), TUESDAY, 'restaurant')).toBe(false)
  })
})

describe('isVerified', () => {
  it('erkennt die eine verifizierte Zeile', () => {
    expect(isVerified(gardenBySlug('wawi'), MONDAY)).toBe(true)
  })

  it('null bleibt unverifiziert', () => {
    expect(isVerified(gardenBySlug('wawi'), TUESDAY)).toBe(false)
  })

  it('eine fehlende Zeile ist NICHT verifiziert', () => {
    // The regression this file exists for: `hoursFor(...)?.verifiedAt` is
    // undefined with no row, and `undefined !== null` used to answer "yes" —
    // a day we know nothing about reported as checked against a source.
    expect(isVerified(gardenBySlug('wawi'), TUESDAY, 'restaurant')).toBe(false)
  })
})

describe('windowProblem', () => {
  const window = { opensAt: at(11), closesAt: at(22) }

  it('ohne Fenster: geschlossen', () => {
    expect(windowProblem(null, at(12), 45)).toBe('closed')
  })

  it('vor dem Aufsperren: zu früh', () => {
    expect(windowProblem(window, at(10, 30), 45)).toBe('too-early')
  })

  it('Ankommen reicht nicht — der Aufenthalt muss vor die Sperrstunde passen', () => {
    expect(windowProblem(window, at(21, 30), 45)).toBe('too-late')
    // Exactly until closing is still fine.
    expect(windowProblem(window, at(21, 15), 45)).toBeNull()
  })

  it('mitten im Fenster: kein Problem', () => {
    expect(windowProblem(window, at(15), 90)).toBeNull()
  })
})
