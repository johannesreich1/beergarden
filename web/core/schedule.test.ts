import { describe, expect, it } from 'vitest'
import { CANDIDPLATZ, GARDENS, defaultOptions } from './fixtures'
import { generateRoutes } from './generator'
import { buildSchedule, planFromRoute } from './schedule'
import type { ScheduleOptions } from './schedule'
import { at } from './time'

const options = defaultOptions()
const plan = planFromRoute(generateRoutes(GARDENS, options).routes[0])

const scheduleOptions = (overrides: Partial<ScheduleOptions> = {}): ScheduleOptions => ({
  start: CANDIDPLATZ,
  startMinutes: at(15),
  mode: 'mix',
  maxLegMinutes: 25,
  skipped: new Set<string>(),
  durations: {},
  lastStop: null,
  ...overrides,
})

describe('buildSchedule', () => {
  it('rechnet Ankunft und Abfahrt fortlaufend durch', () => {
    const schedule = buildSchedule(plan, GARDENS, scheduleOptions())!

    expect(schedule.rows).toHaveLength(plan.slugs.length)
    expect(schedule.rows[0].arrive).toBe(at(15) + plan.legs[0].min)

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
    const durations = { [plan.slugs[0]]: 120 }
    const schedule = buildSchedule(plan, GARDENS, scheduleOptions({ durations }))!

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
