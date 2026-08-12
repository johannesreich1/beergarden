import { describe, expect, it } from 'vitest'
import { gardenBySlug } from './fixtures'
import { stayAt, suggestStay } from './stay'

/**
 * Generator, schedule and validation all ask these two functions — the file's
 * own docstring calls that the reason it exists. Asserted until now; proven
 * here.
 */

describe('stayAt', () => {
  it('klemmt nach oben in die Grenze des Gartens', () => {
    // The Hofbräukeller carries maxStay 75 in the fixture.
    expect(stayAt(gardenBySlug('hofbraeukeller'), 120)).toBe(75)
  })

  it('klemmt nach unten in die Grenze des Gartens', () => {
    const garden = { ...gardenBySlug('flaucher'), minStayMinutes: 60 }

    expect(stayAt(garden, 45)).toBe(60)
  })

  it('fällt ohne eigene Grenzen auf die globalen 45 und 150 zurück', () => {
    const unbounded = gardenBySlug('wawi')

    expect(unbounded.minStayMinutes).toBeNull()
    expect(unbounded.maxStayMinutes).toBeNull()
    expect(stayAt(unbounded, 10)).toBe(45)
    expect(stayAt(unbounded, 999)).toBe(150)
    expect(stayAt(unbounded, 90)).toBe(90)
  })
})

describe('suggestStay', () => {
  it('teilt die Sitzzeit durch die Stationen und rundet auf fünf Minuten ab', () => {
    expect(suggestStay(200, 3)).toBe(65)
    expect(suggestStay(300, 3)).toBe(100)
  })
})
