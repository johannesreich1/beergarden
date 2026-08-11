import { describe, expect, it } from 'vitest'
import { GARDENS, defaultOptions, gardenBySlug } from './fixtures'
import { generateRoutes } from './generator'
import { openingWindow } from './hours'
import { at } from './time'

const TUESDAY = 2
const WEDNESDAY = 3

describe('generateRoutes', () => {
  it('liefert Vorschläge mit der gewünschten Stationszahl', () => {
    const { routes } = generateRoutes(GARDENS, defaultOptions())

    expect(routes.length).toBeGreaterThan(0)
    for (const route of routes) expect(route.slugs).toHaveLength(3)
  })

  it('hält die Öffnungszeiten jeder Station ein', () => {
    const options = defaultOptions()
    const { routes } = generateRoutes(GARDENS, options)

    for (const route of routes) {
      let clock = options.startMinutes

      route.slugs.forEach((slug, index) => {
        clock += route.legs[index].min
        const window = openingWindow(gardenBySlug(slug), options.weekday)!

        expect(clock).toBeGreaterThanOrEqual(window.opensAt)
        expect(clock + route.stays[index]).toBeLessThanOrEqual(window.closesAt)

        clock += route.stays[index]
      })
    }
  })

  it('überspringt einen Garten an seinem Ruhetag', () => {
    // The Hirschau is closed on Tuesdays. That lives as its own row in
    // opening_hours rather than a flag on the garden — which is exactly why the
    // generator can use the same code for every weekday.
    const tuesday = generateRoutes(GARDENS, defaultOptions({ weekday: TUESDAY }))
    const wednesday = generateRoutes(GARDENS, defaultOptions({ weekday: WEDNESDAY }))

    expect(tuesday.routes.some((route) => route.slugs.includes('hirschau'))).toBe(false)
    expect(wednesday.routes.some((route) => route.slugs.includes('hirschau'))).toBe(true)
  })

  it('erzwingt bei "mindestens einer am Wasser" genau das', () => {
    const options = defaultOptions()
    options.filters = { ...options.filters, waterRequired: true }

    const { routes } = generateRoutes(GARDENS, options)

    expect(routes.length).toBeGreaterThan(0)
    for (const route of routes) {
      const onWater = route.slugs.some((slug) => gardenBySlug(slug).tags.includes('wasser'))
      expect(onWater).toBe(true)
    }
  })

  it('sortiert nach Bewertung und dedupliziert nach Stopp-Menge', () => {
    const { routes } = generateRoutes(GARDENS, defaultOptions())

    const scores = routes.map((route) => route.score)
    expect([...scores].sort((a, b) => b - a)).toEqual(scores)

    const sets = routes.map((route) => [...route.slugs].sort().join('|'))
    expect(new Set(sets).size).toBe(sets.length)
  })

  it('sagt im Klartext, warum nichts geht, statt eine leere Liste zu liefern', () => {
    // Two hours are not enough for three stops — three times 45 minutes of
    // sitting alone already exceeds it.
    const { routes, reason } = generateRoutes(GARDENS, defaultOptions({ budgetMinutes: 120 }))

    expect(routes).toHaveLength(0)
    expect(reason).toContain('geht sich das nicht aus')
  })

  it('nennt die Zahl, wenn zu wenige Gärten zu den Filtern passen', () => {
    const options = defaultOptions()
    options.filters = { ...options.filters, tags: ['keller'] }

    const { routes, reason } = generateRoutes(GARDENS, options)

    expect(routes).toHaveLength(0)
    expect(reason).toContain('Nur 2 Biergärten')
  })

  it('bevorzugt Touren mit verschiedenen Brauereien', () => {
    // Two Augustiner gardens on one tour earn the brewery bonus only once.
    // This is the one place where the ranking holds an opinion about how the
    // afternoon should go.
    const { routes } = generateRoutes(GARDENS, defaultOptions({ stops: 2, budgetMinutes: 300 }))
    const best = routes[0]

    const breweries = new Set(best.slugs.map((slug) => gardenBySlug(slug).brewery?.slug))
    expect(breweries.size).toBe(2)
  })

  it('hält die Verweilgrenze eines Gartens ein', () => {
    // The Hofbräukeller is capped at 75 minutes in the fixture. Six hours over
    // two stops would otherwise give more than two hours each.
    const { routes } = generateRoutes(GARDENS, defaultOptions({ stops: 2, budgetMinutes: 420 }))

    for (const route of routes) {
      const index = route.slugs.indexOf('hofbraeukeller')
      if (index >= 0) expect(route.stays[index]).toBeLessThanOrEqual(75)
    }
  })

  it('respektiert einen späteren Aufbruch', () => {
    const late = generateRoutes(GARDENS, defaultOptions({ startMinutes: at(19) }))

    for (const route of late.routes) expect(route.end).toBeGreaterThan(at(19))
  })
})
