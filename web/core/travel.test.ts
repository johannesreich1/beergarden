import { describe, expect, it } from 'vitest'
import { CANDIDPLATZ, gardenBySlug } from './fixtures'
import { distanceKm } from './geo'
import { planLeg, travelTimes } from './travel'

const keller = gardenBySlug('augustinerkeller')
const hirschgarten = gardenBySlug('hirschgarten')
const flaucher = gardenBySlug('flaucher')
const seehaus = gardenBySlug('seehaus')
const hirschau = gardenBySlug('hirschau')

describe('distanceKm', () => {
  it('misst Luftlinie in Kilometern', () => {
    // Augustiner-Keller nach Hirschgarten sind knapp 2,7 km Luftlinie.
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
    // Der Flaucher liegt 13 Minuten von der nächsten Haltestelle entfernt.
    // Genau deshalb gewinnt dort oft das Rad — das ist keine Schwäche des
    // Modells, sondern die Aussage, um die es geht.
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
    // Seehaus zur Hirschau sind keine 500 Meter. Dass der Fußweg gewinnt,
    // liegt weniger am Limit als daran, dass beide weit von einer Haltestelle
    // entfernt liegen — der ÖPNV verliert hier gegen sich selbst.
    const leg = planLeg(seehaus, hirschau, 'mix', 60)

    expect(leg.mode).toBe('walk')
    expect(leg.min).toBe(leg.walk)
  })

  it('nimmt den ÖPNV, sobald der Fußweg mehr als zehn Minuten draufschlägt', () => {
    // Keller zu Hirschgarten: 44 Minuten laufen gegen 29 mit der Tram. Das
    // Limit von 60 Minuten wäre eingehalten — trotzdem gewinnt der ÖPNV,
    // weil "zu Fuß" nur bis zu zehn Minuten Aufschlag bevorzugt wird.
    const leg = planLeg(keller, hirschgarten, 'mix', 60)

    expect(leg.mode).toBe('transit')
  })

  it('weicht bei gemischtem Modus auf ÖPNV aus, wenn der Fußweg zu lang wird', () => {
    const leg = planLeg(keller, flaucher, 'mix', 10)

    expect(leg.mode).toBe('transit')
  })

  it('gilt bei gemischtem Modus immer als machbar', () => {
    // 'mix' darf pro Etappe wechseln, also gibt es keine Etappe, an der der
    // Generator scheitern müsste. Der Slider begrenzt dann nur den Fußweg.
    expect(planLeg(keller, flaucher, 'mix', 5).feasible).toBe(true)
  })

  it('schneidet bei festem Modus alles über dem Limit ab', () => {
    expect(planLeg(keller, flaucher, 'walk', 10).feasible).toBe(false)
    expect(planLeg(keller, flaucher, 'walk', 240).feasible).toBe(true)
  })
})
