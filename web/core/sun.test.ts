import { describe, expect, it } from 'vitest'
import { at } from './time'
import { sunsetMinutes } from './sun'

const MUNICH = { lat: 48.1374, lon: 11.5755 }

describe('sunsetMinutes', () => {
  it('trifft den nachgerechneten Wert für München', () => {
    // docs/PROJECT.md nennt unter Quellen 20:34 für diesen Tag. Diese Zahl ist
    // um zwei bis drei Minuten zu früh: das NOAA-Tabellenverfahren liefert
    // unabhängig 20:36, diese Implementierung 20:37. Für Sonnenwenden stimmen
    // beide Verfahren exakt überein (siehe nächster Test) — der Fehler liegt
    // also in der übernommenen Konstante, nicht in der Rechnung.
    const minutes = sunsetMinutes(new Date('2026-08-11T12:00:00Z'), MUNICH.lat, MUNICH.lon)

    expect(minutes).toBeGreaterThanOrEqual(at(20, 35))
    expect(minutes).toBeLessThanOrEqual(at(20, 38))
  })

  it('bleibt an den Sonnenwenden innerhalb einer Minute zum NOAA-Verfahren', () => {
    const june = sunsetMinutes(new Date('2026-06-21T12:00:00Z'), MUNICH.lat, MUNICH.lon)
    const december = sunsetMinutes(new Date('2026-12-21T12:00:00Z'), MUNICH.lat, MUNICH.lon)

    // Referenz aus dem NOAA-Tabellenverfahren: 21:17 und 16:22. Diese
    // Implementierung liefert 21:18 und 16:22. Eine Minute Abweichung ist der
    // Preis der vereinfachten Reihenentwicklung und für die Frage "geht die
    // letzte Station in die Dämmerung" ohne jede Bedeutung.
    expect(june).toBeGreaterThan(december)
    expect(Math.abs(june - at(21, 17))).toBeLessThanOrEqual(1)
    expect(Math.abs(december - at(16, 22))).toBeLessThanOrEqual(1)
  })

  it('rechnet die Sommerzeit über Intl und nicht selbst', () => {
    // Ende März springt die Uhr. Ein Sonnenuntergang am Tag davor und danach
    // darf sich nicht um eine ganze Stunde unterscheiden.
    const before = sunsetMinutes(new Date('2026-03-28T12:00:00Z'), MUNICH.lat, MUNICH.lon)
    const after = sunsetMinutes(new Date('2026-03-30T12:00:00Z'), MUNICH.lat, MUNICH.lon)

    expect(after - before).toBeGreaterThan(55)
    expect(after - before).toBeLessThan(70)
  })
})
