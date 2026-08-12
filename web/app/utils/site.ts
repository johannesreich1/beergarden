/**
 * Who this site is, in one place.
 *
 * The title suffix used to be typed out in every page — three copies of
 * "· Biergarten Freunde" that drift apart the moment one of them changes.
 * Name, claim and locale belong together, so they live together.
 */
export const SITE = {
  // The name is the brand, not a translation — it reads the same in every
  // language, which is why it lives here and not in the locale file. The
  // site's description does translate and sits under `site.description`.
  name: 'Biergarten Freunde',
  locale: 'de_DE',
} as const

/** "Alle Biergärten · Biergarten Freunde". Without a title just the name. */
export const pageTitle = (title?: string): string =>
  title ? `${title} · ${SITE.name}` : SITE.name
