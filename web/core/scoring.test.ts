import { describe, expect, it } from 'vitest'
import { GARDENS, gardenBySlug } from './fixtures'
import { scoreRoute } from './scoring'
import type { ScoreInput } from './scoring'
import { at } from './time'

/**
 * The weights are the planner's editorial stance, and until now nothing
 * pinned them: any of the eight could have been given a wrong value and the
 * rest of the suite would have stayed green. These tests assert differences
 * between two inputs, not absolute numbers — the stance, not the arithmetic.
 */

const base = (overrides: Partial<ScoreInput> = {}): ScoreInput => ({
  gardens: [gardenBySlug('augustinerkeller'), gardenBySlug('hofbraeukeller')],
  travelMinutes: 60,
  sitMinutesEach: 90,
  // Early enough that the sunset finale plays no part unless a test wants it.
  departureFromLast: at(17),
  sunsetMinutes: at(20, 34),
  visited: new Set<string>(),
  ...overrides,
})

describe('scoreRoute', () => {
  it('zieht besuchte Gärten spürbar ab, verbietet sie aber nicht', () => {
    const fresh = scoreRoute(base())
    const seen = scoreRoute(base({ visited: new Set(['augustinerkeller']) }))

    expect(seen).toBeLessThan(fresh)
    // "Pulls hard, but forbids nothing": the penalty must stay finite.
    expect(Number.isFinite(seen)).toBe(true)
  })

  it('bestraft eine letzte Station mit Vorbehalt', () => {
    // Hirschau carries the fixture's caveat. Same two gardens, same numbers —
    // only which of them comes last changes.
    const caveatLast = scoreRoute(base({ gardens: [gardenBySlug('seehaus'), gardenBySlug('hirschau')] }))
    const caveatFirst = scoreRoute(base({ gardens: [gardenBySlug('hirschau'), gardenBySlug('seehaus')] }))

    expect(caveatLast).toBeLessThan(caveatFirst)
  })

  it('wertet fehlenden Charme als null, nicht als Fehler', () => {
    const rated = gardenBySlug('flaucher')
    const unrated = { ...rated, charm: null }

    const withCharm = scoreRoute(base({ gardens: [rated] }))
    const without = scoreRoute(base({ gardens: [unrated] }))

    expect(without).toBeLessThan(withCharm)
    expect(Number.isFinite(without)).toBe(true)
  })

  it('belohnt Wasser auf der Tour', () => {
    const onWater = gardenBySlug('flaucher')
    const drained = { ...onWater, tags: onWater.tags.filter((tag) => tag !== 'wasser') }

    expect(scoreRoute(base({ gardens: [onWater] })))
      .toBeGreaterThan(scoreRoute(base({ gardens: [drained] })))
  })

  it('belohnt verschiedene Brauereien gegenüber derselben zweimal', () => {
    const a = gardenBySlug('augustinerkeller')
    // The same garden twice over, once wearing a different pour — everything
    // else identical, so the difference is exactly the variety bonus.
    const clone = { ...a, slug: 'klon' }
    const otherBrewery = { ...clone, brewery: { slug: 'paulaner', label: 'Paulaner' } }

    expect(scoreRoute(base({ gardens: [a, otherBrewery] })))
      .toBeGreaterThan(scoreRoute(base({ gardens: [a, clone] })))
  })

  it('zählt das Finale erst, wenn der Aufbruch NACH Sonnenuntergang minus 30 liegt', () => {
    // The boundary is strict on purpose, and this pins it: leaving exactly 30
    // minutes before sunset is not yet a golden-hour finale, one minute later
    // it is. GARDENS[3] is the Seehaus — on the water, so the finale applies.
    const sunset = at(20, 34)
    const gardens = [gardenBySlug('seehaus')]

    const onBoundary = scoreRoute(base({ gardens, sunsetMinutes: sunset, departureFromLast: sunset - 30 }))
    const inside = scoreRoute(base({ gardens, sunsetMinutes: sunset, departureFromLast: sunset - 29 }))

    expect(inside).toBeGreaterThan(onBoundary)
  })

  it('Reisezeit schadet, Sitzzeit nützt', () => {
    expect(scoreRoute(base({ travelMinutes: 90 }))).toBeLessThan(scoreRoute(base({ travelMinutes: 60 })))
    expect(scoreRoute(base({ sitMinutesEach: 120 }))).toBeGreaterThan(scoreRoute(base({ sitMinutesEach: 90 })))
  })

  it('nutzt die Fixture-Gärten, nicht nur Kopien', () => {
    // Guards the assumptions above: the caveat sits on the Hirschau, the
    // Seehaus is on the water. If the fixture changes, fail here — loudly.
    expect(gardenBySlug('hirschau').caveat).not.toBeNull()
    expect(gardenBySlug('seehaus').tags).toContain('wasser')
    expect(GARDENS.length).toBeGreaterThanOrEqual(8)
  })
})
