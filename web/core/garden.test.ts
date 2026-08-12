import { describe, expect, it } from 'vitest'
import { GARDENS, NO_FILTERS, TUESDAY, WEDNESDAY, gardenBySlug } from './fixtures'
import {
  candidates,
  gardenPath,
  gardensBySlug,
  gardensFor,
  matchesDirectoryFilters,
} from './garden'
import { tourKey } from './schedule'

/**
 * Five of the six filter switches had never been exercised — a filter that
 * only ever passes is indistinguishable from no filter. The gardens whose
 * fields the fixture cannot vary (everything is self-service) are tested on
 * copies; a pure function does not care where its Garden came from.
 */

const NONE = new Set<string>()

const slugsOf = (gardens: { slug: string }[]) => gardens.map((garden) => garden.slug)

describe('candidates', () => {
  it('Tags sind ein UND, nicht ein ODER', () => {
    const found = candidates(GARDENS, { ...NO_FILTERS, tags: ['wald', 'musik'] }, NONE, WEDNESDAY)

    // Both tags, not either: the Hirschgarten (wald only) must stay out.
    expect(slugsOf(found).sort()).toEqual(['chinaturm', 'flaucher', 'hirschau', 'wawi'])
  })

  it('filtert nach Brauerei — und respektiert den Wochentag dabei', () => {
    const wednesday = candidates(GARDENS, { ...NO_FILTERS, breweries: ['paulaner'] }, NONE, WEDNESDAY)
    const tuesday = candidates(GARDENS, { ...NO_FILTERS, breweries: ['paulaner'] }, NONE, TUESDAY)

    expect(slugsOf(wednesday).sort()).toEqual(['hirschau', 'seehaus'])
    // The Hirschau is closed on Tuesdays, so the same filter loses it.
    expect(slugsOf(tuesday)).toEqual(['seehaus'])
  })

  it('nur Selbstbedienung schließt bediente Gärten aus', () => {
    const served = { ...gardenBySlug('seehaus'), selfService: false }
    const pool = [served, gardenBySlug('flaucher')]

    const found = candidates(pool, { ...NO_FILTERS, selfServiceOnly: true }, NONE, WEDNESDAY)

    expect(slugsOf(found)).toEqual(['flaucher'])
  })

  it('nur eigene Brotzeit schließt Gärten ohne aus', () => {
    const noPicnic = { ...gardenBySlug('seehaus'), ownFoodAllowed: false }
    const pool = [noPicnic, gardenBySlug('flaucher')]

    const found = candidates(pool, { ...NO_FILTERS, ownFoodOnly: true }, NONE, WEDNESDAY)

    expect(slugsOf(found)).toEqual(['flaucher'])
  })

  it('„wo ich war: raus" nimmt Besuchtes aus dem Pool', () => {
    const found = candidates(GARDENS, { ...NO_FILTERS, unvisitedOnly: true }, new Set(['flaucher']), WEDNESDAY)

    expect(slugsOf(found)).not.toContain('flaucher')
  })

  it('nur Stadtgebiet lässt das Umland draußen', () => {
    const found = candidates(GARDENS, { ...NO_FILTERS, cityOnly: true }, NONE, WEDNESDAY)

    expect(slugsOf(found)).not.toContain('wawi')
    expect(found.length).toBe(GARDENS.length - 1)
  })
})

describe('matchesDirectoryFilters', () => {
  it('„am Wasser" heißt hier: DIESER Garten liegt am Wasser', () => {
    // The same flag means "at least one on the tour" in the generator — the
    // double meaning is documented in types.ts, and this pins the directory
    // half of it.
    const filters = { ...NO_FILTERS, waterRequired: true }

    expect(matchesDirectoryFilters(gardenBySlug('flaucher'), filters, NONE)).toBe(true)
    expect(matchesDirectoryFilters(gardenBySlug('augustinerkeller'), filters, NONE)).toBe(false)
  })
})

describe('gardensFor / gardensBySlug / gardenPath / tourKey', () => {
  it('löst Slugs in Reihenfolge auf und lässt Unbekanntes still fallen', () => {
    const found = gardensFor(['flaucher', 'gibt-es-nicht', 'seehaus'], GARDENS)

    expect(slugsOf(found)).toEqual(['flaucher', 'seehaus'])
  })

  it('baut die Karte einmal und findet jeden Garten', () => {
    const bySlug = gardensBySlug(GARDENS)

    expect(bySlug.size).toBe(GARDENS.length)
    expect(bySlug.get('wawi')?.name).toBe('Waldwirtschaft Großhesselohe')
  })

  it('buchstabiert die Garten-URL an genau einer Stelle', () => {
    expect(gardenPath('flaucher')).toBe('/biergarten/flaucher')
  })

  it('gibt derselben Tour in jeder Reihenfolge denselben Schlüssel', () => {
    expect(tourKey(['b', 'a', 'c'])).toBe(tourKey(['c', 'b', 'a']))
    expect(tourKey(['a'])).not.toBe(tourKey(['b']))
  })
})
