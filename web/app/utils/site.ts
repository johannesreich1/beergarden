/**
 * Who this site is, in one place.
 *
 * The title suffix used to be typed out in every page — three copies of
 * "· Biergarten Freunde" that drift apart the moment one of them changes.
 * Name, claim and locale belong together, so they live together.
 */
export const SITE = {
  name: 'Biergarten Freunde',
  locale: 'de_DE',

  /** Fallback description for pages that bring none of their own. */
  description:
    'Biergarten-Touren für München: Sag, wo du losgehst und wie lange du Zeit hast — '
    + 'der Planer baut die Tour, mit Öffnungszeiten, Fahrzeiten und Sonnenuntergang.',
} as const

/** "Alle Biergärten · Biergarten Freunde". Without a title just the name. */
export const pageTitle = (title?: string): string =>
  title ? `${title} · ${SITE.name}` : SITE.name
