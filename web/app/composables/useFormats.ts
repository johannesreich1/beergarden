import { MASS_ML } from '#core'

/** Half a litre — the other size the price lists know by name. */
const HALF_ML = 500

/**
 * Wording that depends on the locale, behind one composable.
 *
 * `presentation.ts` stays pure logic; the words live in the locale file. This
 * is the bridge for the handful of formats that need both — a number AND the
 * language's way of saying it. Components call these instead of assembling
 * label strings themselves.
 */
export function useFormats() {
  const { t, te } = useI18n()

  /** "8.000 Plätze" — or the honest "Größe unbekannt". */
  const seats = (count: number | null): string =>
    count === null
      ? t('seats.unknown')
      : t('seats.count', { n: count.toLocaleString('de-DE') })

  const beerSize = (ml: number): string =>
    ml === MASS_ML ? t('beer.sizeMass') : ml === HALF_ML ? t('beer.sizeHalf') : t('beer.sizeMl', { ml })

  /** Anything unknown shows its key — better than nothing. */
  const beerKind = (kind: string): string =>
    te(`beer.kind.${kind}`) ? t(`beer.kind.${kind}`) : kind

  const tagLabel = (tag: string): string =>
    te(`tags.${tag}`) ? t(`tags.${tag}`) : tag

  /**
   * "90 min" or "75–120 min". Stays can be bounded per garden, so they are
   * no longer one number for the whole tour — showing only the first value
   * would claim a uniformity that does not exist.
   */
  const stays = (values: number[]): string => {
    const min = Math.min(...values)
    const max = Math.max(...values)

    return min === max ? t('common.minutes', { min }) : t('common.minutesRange', { min, max })
  }

  return { seats, beerSize, beerKind, tagLabel, stays }
}
