import { describe, expect, it } from 'vitest'
import { CANDIDPLATZ, gardenBySlug } from './fixtures'
import { distanceKm } from './geo'
import { LEG_UNCAPPED, planLeg, travelTimes } from './travel'

const keller = gardenBySlug('augustinerkeller')
const hirschgarten = gardenBySlug('hirschgarten')
const flaucher = gardenBySlug('flaucher')
const seehaus = gardenBySlug('seehaus')
const hirschau = gardenBySlug('hirschau')

describe('distanceKm', () => {
  it('misst Luftlinie in Kilometern', () => {
    // Augustiner-Keller to Hirschgarten is just under 2.7 km as the crow flies.
    expect(distanceKm(keller, hirschgarten)).toBeCloseTo(2.68, 2)
  })

  it('ist symmetrisch und null für denselben Punkt', () => {
    expect(distanceKm(keller, hirschgarten)).toBeCloseTo(distanceKm(hirschgarten, keller), 10)
    expect(distanceKm(keller, keller)).toBe(0)
  })
})

describe('travelTimes', () => {
  it('rechnet Rad schneller als zu Fuß', () => {
    const times = travelTimes(keller, hirschgarten)

    expect(times.bike).toBeLessThan(times.walk)
  })

  it('rechnet den Fußweg von der Haltestelle in die ÖPNV-Zeit ein', () => {
    // The Flaucher is 13 minutes from the nearest stop. That is exactly why
    // the bike usually wins there — not a weakness of the model but the very
    // statement it is making.
    const withAccess = travelTimes(CANDIDPLATZ, flaucher)
    const withoutAccess = travelTimes(CANDIDPLATZ, { ...flaucher, stationWalkMin: 0 })

    expect(withAccess.transit - withoutAccess.transit).toBe(13)
  })

  it('setzt Untergrenzen, damit keine Etappe null Minuten dauert', () => {
    const nearby = travelTimes(keller, { ...keller, lat: keller.lat + 0.0001 })

    expect(nearby.walk).toBeGreaterThanOrEqual(3)
    expect(nearby.transit).toBeGreaterThanOrEqual(8)
  })
})

describe('planLeg', () => {
  it('nimmt bei gemischtem Modus den Fußweg für kurze Strecken', () => {
    // Seehaus to Hirschau is under 500 metres. That walking wins has less to do
    // with the limit than with both being far from any stop — public transport
    // loses against itself here.
    const leg = planLeg(seehaus, hirschau, 'mix', 60)

    expect(leg.mode).toBe('walk')
    expect(leg.min).toBe(leg.walk)
  })

  it('nimmt den ÖPNV, sobald der Fußweg mehr als zehn Minuten draufschlägt', () => {
    // Keller to Hirschgarten: 44 minutes on foot against 29 by tram. The
    // 60-minute limit would hold — yet public transport wins, because walking
    // is only preferred up to a ten-minute penalty.
    const leg = planLeg(keller, hirschgarten, 'mix', 60)

    expect(leg.mode).toBe('transit')
  })

  it('weicht bei gemischtem Modus auf ÖPNV aus, wenn der Fußweg zu lang wird', () => {
    const leg = planLeg(keller, flaucher, 'mix', 10)

    expect(leg.mode).toBe('transit')
  })

  it('gilt bei gemischtem Modus immer als machbar', () => {
    // 'mix' may switch per leg, so there is no leg the generator would have to
    // fail on. The slider then only bounds the walking.
    expect(planLeg(keller, flaucher, 'mix', 5).feasible).toBe(true)
  })

  it('schneidet bei festem Modus alles über dem Limit ab', () => {
    expect(planLeg(keller, flaucher, 'walk', 10).feasible).toBe(false)
    expect(planLeg(keller, flaucher, 'walk', 240).feasible).toBe(true)
  })

  it('läuft auch ohne Limit nicht alles zu Fuß', () => {
    // LEG_UNCAPPED's own doc makes this claim: under mix the walk-or-transit
    // comparison holds its own line, so an uncapped cap must not degenerate
    // into hour-long walks. Candidplatz to the Hirschgarten is far enough
    // that transit has to win.
    const leg = planLeg(CANDIDPLATZ, hirschgarten, 'mix', LEG_UNCAPPED)

    expect(leg.mode).toBe('transit')
    expect(leg.min).toBe(travelTimes(CANDIDPLATZ, hirschgarten).transit)
  })
})
