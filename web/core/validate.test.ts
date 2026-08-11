import { describe, expect, it } from 'vitest'
import { GARDENS, defaultOptions } from './fixtures'
import { generateRoutes } from './generator'
import { planFromRoute } from './schedule'
import { at } from './time'
import { checkPlan } from './validate'

const options = defaultOptions()
const plan = planFromRoute(generateRoutes(GARDENS, options).routes[0])

const TUESDAY = 2

describe('checkPlan', () => {
  it('findet an einer frisch erzeugten Tour nichts auszusetzen', () => {
    // If this breaks, generator and validation contradict each other — and then
    // one of the two is wrong.
    expect(checkPlan(plan, GARDENS, options)).toBeNull()
  })

  it('meldet, wenn man durch früheren Aufbruch vor dem Aufsperren ankäme', () => {
    const problem = checkPlan(plan, GARDENS, defaultOptions({ startMinutes: at(8) }))

    expect(problem?.kind).toBe('too-early')
    expect(problem?.opensAt).toBeGreaterThan(problem!.arrival)
  })

  it('meldet, wenn die Sitzzeit über die Sperrstunde ragt', () => {
    const problem = checkPlan(plan, GARDENS, defaultOptions({ startMinutes: at(19, 30) }))

    expect(problem?.kind).toBe('too-late')
    const index = plan.slugs.indexOf(problem!.slug)
    expect(problem!.arrival + plan.stays[index]).toBeGreaterThan(problem!.closesAt!)
  })

  it('meldet einen Ruhetag, wenn man den Wochentag wechselt', () => {
    // The Hirschau is closed on Tuesdays. A tour containing it on Wednesday
    // breaks when you switch to Tuesday.
    const mittwoch = defaultOptions({ weekday: 3 })
    const mitHirschau = generateRoutes(GARDENS, mittwoch).routes
      .find((route) => route.slugs.includes('hirschau'))!

    const problem = checkPlan(planFromRoute(mitHirschau), GARDENS, defaultOptions({ weekday: TUESDAY }))

    expect(problem?.kind).toBe('closed')
    expect(problem?.slug).toBe('hirschau')
  })

  it('meldet, wenn eine verlängerte Verweildauer die Tour sprengt', () => {
    // Four hours per stop is meant sincerely but fits no time budget — and that
    // is exactly what the user should be told.
    const durations = Object.fromEntries(plan.slugs.map((slug) => [slug, 240]))
    const problem = checkPlan(plan, GARDENS, options, durations)

    expect(problem).not.toBeNull()
    expect(['too-late', 'over-budget']).toContain(problem!.kind)
  })

  it('meldet, wenn das Zeitfenster nicht mehr reicht', () => {
    const problem = checkPlan(plan, GARDENS, defaultOptions({ budgetMinutes: 240 }))

    expect(problem?.kind).toBe('over-budget')
    expect(problem?.totalMinutes).toBeGreaterThan(240)
  })

  it('meldet einen Garten, den es nicht mehr gibt', () => {
    // A plan stored yesterday can point at a garden that has since dropped out
    // of the data set.
    const stale = { ...plan, slugs: ['gibt-es-nicht', ...plan.slugs.slice(1)] }
    const problem = checkPlan(stale, GARDENS, options)

    expect(problem?.kind).toBe('missing')
    expect(problem?.slug).toBe('gibt-es-nicht')
  })
})
