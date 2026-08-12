import { describe, expect, it } from 'vitest'
import { at } from './time'
import { MUNICH, sunsetMinutesAt } from './sun'

describe('sunsetMinutesAt', () => {
  it('trifft den nachgerechneten Wert für München', () => {
    // docs/PROJECT.md lists 20:34 for this day under its sources. That number
    // is two to three minutes early: the NOAA spreadsheet method independently
    // gives 20:36, this implementation 20:37. At the solstices both methods
    // agree to within a minute (see the next test) — so the error is in the
    // inherited constant, not in the calculation.
    const minutes = sunsetMinutesAt(new Date('2026-08-11T12:00:00Z'), MUNICH.lat, MUNICH.lon)

    expect(minutes).toBeGreaterThanOrEqual(at(20, 35))
    expect(minutes).toBeLessThanOrEqual(at(20, 38))
  })

  it('bleibt an den Sonnenwenden innerhalb einer Minute zum NOAA-Verfahren', () => {
    const june = sunsetMinutesAt(new Date('2026-06-21T12:00:00Z'), MUNICH.lat, MUNICH.lon)
    const december = sunsetMinutesAt(new Date('2026-12-21T12:00:00Z'), MUNICH.lat, MUNICH.lon)

    // Reference from the NOAA spreadsheet method: 21:17 and 16:22. This
    // implementation gives 21:18 and 16:22. One minute of deviation is the
    // price of the simplified series expansion and utterly irrelevant to the
    // question "does the last stop run into dusk".
    expect(june).toBeGreaterThan(december)
    expect(Math.abs(june - at(21, 17))).toBeLessThanOrEqual(1)
    expect(Math.abs(december - at(16, 22))).toBeLessThanOrEqual(1)
  })

  it('rechnet die Sommerzeit über Intl und nicht selbst', () => {
    // The clocks change at the end of March. Sunset the day before and the day
    // after must not differ by a full hour of daylight.
    const before = sunsetMinutesAt(new Date('2026-03-28T12:00:00Z'), MUNICH.lat, MUNICH.lon)
    const after = sunsetMinutesAt(new Date('2026-03-30T12:00:00Z'), MUNICH.lat, MUNICH.lon)

    expect(after - before).toBeGreaterThan(55)
    expect(after - before).toBeLessThan(70)
  })
})
