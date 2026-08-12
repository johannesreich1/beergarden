import { describe, expect, it } from 'vitest'
import { GARDENS, defaultOptions, gardenBySlug } from './fixtures'
import { generateRoutes } from './generator'
import { BACK_LEG, DEFAULT_MANUAL_STAY, buildSchedule, planFromRoute, planFromSlugs } from './schedule'
import type { ScheduleOptions } from './schedule'
import { travelTimes } from './travel'

const options = defaultOptions()
const plan = planFromRoute(generateRoutes(GARDENS, options).routes[0])

/*
 * Derived from the shared defaults rather than restated: this file used to
 * hardcode the same start time, mode and cap `defaultOptions()` supplies, and
 * a change there silently left this file testing the old values.
 */
const scheduleOptions = (overrides: Partial<ScheduleOptions> = {}): ScheduleOptions => ({
  start: options.start,
  startMinutes: options.startMinutes,
  mode: options.mode,
  maxLegMinutes: options.maxLegMinutes,
  skipped: new Set<string>(),
  stayOverrides: {},
  lastStop: null,
  ...overrides,
})

describe('buildSchedule', () => {
  it('rechnet Ankunft und Abfahrt fortlaufend durch', () => {
    const schedule = buildSchedule(plan, GARDENS, scheduleOptions())!

    expect(schedule.rows).toHaveLength(plan.slugs.length)
    expect(schedule.rows[0].arrive).toBe(options.startMinutes + plan.legs[0].min)

    for (const row of schedule.rows) {
      expect(row.depart).toBe(row.arrive + row.duration)
    }
    for (let i = 1; i < schedule.rows.length; i++) {
      expect(schedule.rows[i].arrive).toBeGreaterThan(schedule.rows[i - 1].depart)
    }
  })

  it('schlägt die Etappe einer ausgelassenen Station auf die nächste auf', () => {
    const skipped = new Set([plan.slugs[0]])
    const schedule = buildSchedule(plan, GARDENS, scheduleOptions({ skipped }))!

    expect(schedule.rows).toHaveLength(plan.slugs.length - 1)
    expect(schedule.rows[0].garden.slug).toBe(plan.slugs[1])
    expect(schedule.rows[0].legMinutes).toBe(plan.legs[0].min + plan.legs[1].min)

    // The original mode applies to the original leg. Skipping a stop means
    // travelling a different route — public transport is then the cautious
    // assumption.
    expect(schedule.rows[0].legMode).toBe('transit')
    expect(schedule.modified).toBe(true)
  })

  it('macht bei "hier Schluss" wirklich Schluss', () => {
    const schedule = buildSchedule(plan, GARDENS, scheduleOptions({ lastStop: plan.slugs[0] }))!

    expect(schedule.rows).toHaveLength(1)
    expect(schedule.rows[0].isLast).toBe(true)
    expect(schedule.modified).toBe(true)
  })

  it('übernimmt eine abweichende Verweildauer', () => {
    const stayOverrides = { [plan.slugs[0]]: 120 }
    const schedule = buildSchedule(plan, GARDENS, scheduleOptions({ stayOverrides }))!

    expect(schedule.rows[0].duration).toBe(120)
    expect(schedule.rows[0].depart).toBe(schedule.rows[0].arrive + 120)
  })

  it('gibt null zurück, wenn der gespeicherte Plan auf einen unbekannten Garten zeigt', () => {
    // Happens as soon as a garden disappears from the data while yesterday's
    // plan is still sitting in localStorage.
    const stale = { ...plan, slugs: [...plan.slugs.slice(0, -1), 'gibt-es-nicht'] }

    expect(buildSchedule(stale, GARDENS, scheduleOptions())).toBeNull()
  })

  it('gibt null zurück, wenn alle Stationen ausgelassen wurden', () => {
    const skipped = new Set(plan.slugs)

    expect(buildSchedule(plan, GARDENS, scheduleOptions({ skipped }))).toBeNull()
  })
})

describe('planFromSlugs', () => {
  const slugOptions = { start: options.start, mode: options.mode, maxLegMinutes: options.maxLegMinutes }
  const picked = ['augustinerkeller', 'hofbraeukeller']

  it('übernimmt den von Hand gewählten Modus aus derselben Zeittabelle', () => {
    // The override picks WHICH of the three counts — it must not compute a
    // number of its own. Same table, different column.
    const manual = planFromSlugs(picked, GARDENS, slugOptions, {}, { hofbraeukeller: 'transit' })!
    const expected = travelTimes(gardenBySlug('augustinerkeller'), gardenBySlug('hofbraeukeller'))

    expect(manual.legs[1]!.mode).toBe('transit')
    expect(manual.legs[1]!.min).toBe(expected.transit)
  })

  it('BACK_LEG steuert den Heimweg, nicht die letzte Etappe', () => {
    const manual = planFromSlugs(picked, GARDENS, slugOptions, {}, { [BACK_LEG]: 'bike' })!
    const expected = travelTimes(gardenBySlug('hofbraeukeller'), options.start)

    expect(manual.back.mode).toBe('bike')
    expect(manual.back.min).toBe(expected.bike)
    expect(manual.legs[1]!.mode).not.toBe('bike')
  })

  it('klemmt den Standard-Aufenthalt in die Grenzen des Gartens', () => {
    // The Hofbräukeller caps stays at 75 — the 90-minute default must bend,
    // in the core AND therefore everywhere the timeline shows it.
    const manual = planFromSlugs(picked, GARDENS, slugOptions, {})!

    expect(manual.stays[0]).toBe(DEFAULT_MANUAL_STAY)
    expect(manual.stays[1]).toBe(75)
  })

  it('lässt einen unbekannten Slug fallen, statt den Rest zu verweigern', () => {
    // Deliberately different from buildSchedule (whole plan void) and
    // checkPlan ('missing'): mid-picking, a stale pick from localStorage must
    // not veto the stops that still exist. The comment in planFromSlugs owns
    // this decision; the test keeps it honest.
    const manual = planFromSlugs(['gibt-es-nicht', ...picked], GARDENS, slugOptions, {})!

    expect(manual.slugs).toEqual(picked)
    expect(manual.legs).toHaveLength(2)
  })
})
