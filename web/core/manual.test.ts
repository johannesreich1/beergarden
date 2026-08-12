import { describe, expect, it } from 'vitest'
import { CANDIDPLATZ, GARDENS, defaultOptions, gardenBySlug } from './fixtures'
import { nextStops } from './manual'
import { MIN_STAY_MINUTES, stayAt } from './stay'
import { at } from './time'
import { planLeg } from './travel'

const TUESDAY = 2
const WEDNESDAY = 3

const options = defaultOptions()

const bySlug = (candidates: ReturnType<typeof nextStops>, slug: string) =>
  candidates.find((candidate) => candidate.garden.slug === slug)!

/** The leg the travel model would compute — the test must not guess its own. */
const legMin = (from: { lat: number; lon: number }, slug: string) =>
  planLeg(from, gardenBySlug(slug), options.mode, options.maxLegMinutes).min

const minStay = (slug: string) => stayAt(gardenBySlug(slug), MIN_STAY_MINUTES)

describe('nextStops', () => {
  it('rechnet ohne Auswahl vom Startpunkt aus', () => {
    const candidates = nextStops(GARDENS, [], options, {})

    expect(candidates).toHaveLength(GARDENS.length)

    for (const candidate of candidates) {
      expect(candidate.legMinutes).toBe(legMin(CANDIDPLATZ, candidate.garden.slug))
      expect(candidate.arrival).toBe(options.startMinutes + candidate.legMinutes)
      expect(candidate.earliestLeave).toBe(candidate.arrival + minStay(candidate.garden.slug))
    }
  })

  it('rechnet ab der letzten gewählten Station, samt deren Aufenthalt', () => {
    const first = legMin(CANDIDPLATZ, 'flaucher')
    const candidates = nextStops(GARDENS, ['flaucher'], options, {})

    const next = bySlug(candidates, 'hofbraeukeller')
    const depart = options.startMinutes + first + minStay('flaucher')

    expect(next.legMinutes).toBe(legMin(gardenBySlug('flaucher'), 'hofbraeukeller'))
    expect(next.arrival).toBe(depart + next.legMinutes)
  })

  it('verschiebt alles nach hinten, wenn der Aufenthalt verlängert wird', () => {
    // The stay comes out of `stays`, not out of a second calculation of its
    // own — that is what `buildSchedule` is there for.
    const short = nextStops(GARDENS, ['flaucher'], options, {})
    const long = nextStops(GARDENS, ['flaucher'], options, { flaucher: minStay('flaucher') + 30 })

    expect(bySlug(long, 'hofbraeukeller').arrival).toBe(
      bySlug(short, 'hofbraeukeller').arrival + 30,
    )
  })

  it('kennzeichnet einen am Ruhetag geschlossenen Garten', () => {
    // The Hirschau is closed on Tuesdays. It stays in the list all the same:
    // greyed out with a reason is an answer, silently gone is not.
    const tuesday = nextStops(GARDENS, [], defaultOptions({ weekday: TUESDAY }), {})
    const wednesday = nextStops(GARDENS, [], defaultOptions({ weekday: WEDNESDAY }), {})

    expect(bySlug(tuesday, 'hirschau').reason).toBe('closed')
    expect(bySlug(tuesday, 'hirschau').fits).toBe(false)
    expect(bySlug(wednesday, 'hirschau').reason).toBe('ok')
  })

  it('kennzeichnet einen Garten, an dem man vor dem Aufsperren stünde', () => {
    // Setting off at nine: the Augustiner-Keller unlocks at ten.
    const candidates = nextStops(GARDENS, [], defaultOptions({ startMinutes: at(9) }), {})
    const early = bySlug(candidates, 'augustinerkeller')

    expect(early.arrival).toBeLessThan(at(10))
    expect(early.reason).toBe('too-early')
    expect(early.fits).toBe(false)
  })

  it('kennzeichnet einen Garten, bei dem der Mindestaufenthalt nicht mehr in die Öffnungszeit passt', () => {
    const candidates = nextStops(GARDENS, [], defaultOptions({ startMinutes: at(21, 30) }), {})
    const late = bySlug(candidates, 'hirschgarten')

    expect(late.earliestLeave).toBeGreaterThan(at(22))
    expect(late.reason).toBe('too-late')
  })

  it('lässt einen Garten jenseits des Zeitfensters in der Liste stehen', () => {
    // A good hour and a half left: the Hofbräukeller works out with the way
    // home, the Hirschgarten does not.
    const candidates = nextStops(GARDENS, [], defaultOptions({ budgetMinutes: 100 }), {})
    const over = bySlug(candidates, 'hirschgarten')

    expect(candidates).toHaveLength(GARDENS.length)
    expect(over.reason).toBe('over-budget')
    expect(over.fits).toBe(false)
    expect(bySlug(candidates, 'hofbraeukeller').fits).toBe(true)
  })

  it('zeigt bereits gewählte Gärten nicht noch einmal an', () => {
    const chosen = ['flaucher', 'hofbraeukeller']
    const slugs = nextStops(GARDENS, chosen, options, {}).map((candidate) => candidate.garden.slug)

    expect(slugs).toHaveLength(GARDENS.length - chosen.length)
    for (const slug of chosen) expect(slugs).not.toContain(slug)
  })

  it('lässt aus, was die Filter ausschließen — auch am Ruhetag', () => {
    // Whether a garden is closed today and whether it matches the filters are
    // two different questions. The Hirschau is a forest garden and closed on
    // Tuesdays: it belongs in the "Wald" list, with its reason.
    const filters = { ...options.filters, tags: ['wald'] }
    const candidates = nextStops(GARDENS, [], defaultOptions({ filters }), {})
    const slugs = candidates.map((candidate) => candidate.garden.slug)

    expect(slugs).not.toContain('augustinerkeller')
    expect(slugs).toContain('hirschau')
    expect(bySlug(candidates, 'hirschau').reason).toBe('closed')
  })

  it('sortiert nach Fahrzeit aufsteigend', () => {
    const minutes = nextStops(GARDENS, ['flaucher'], options, {}).map(
      (candidate) => candidate.legMinutes,
    )

    expect([...minutes].sort((a, b) => a - b)).toEqual(minutes)
  })
})
