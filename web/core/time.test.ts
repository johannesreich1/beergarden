import { describe, expect, it } from 'vitest'
import { at, formatClock, formatDuration, parseClock } from './time'

describe('parseClock', () => {
  it('liest Uhrzeiten als Minuten seit Mitternacht', () => {
    expect(parseClock('10:00')).toBe(600)
    expect(parseClock('23:30')).toBe(1410)
  })

  it('hält Sperrstunden nach Mitternacht über 24 Stunden', () => {
    // MariaDB stores "half past midnight" as 24:30 so closing time stays
    // greater than opening time. Normalising that to 00:30 gives you a garden
    // that closes 22 hours before it opens.
    expect(parseClock('24:30')).toBe(1470)
    expect(parseClock('24:30')).toBeGreaterThan(parseClock('23:00'))
  })
})

describe('formatClock', () => {
  it('faltet über den Tageswechsel', () => {
    expect(formatClock(600)).toBe('10:00')
    expect(formatClock(1470)).toBe('00:30')
  })
})

describe('formatDuration', () => {
  it('schreibt Stunden aus, sobald es welche gibt', () => {
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(60)).toBe('1 h')
    expect(formatDuration(330)).toBe('5 h 30 min')
  })
})

describe('at', () => {
  it('ist die Umkehrung von formatClock', () => {
    expect(formatClock(at(20, 34))).toBe('20:34')
  })
})
