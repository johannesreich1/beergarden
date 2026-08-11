export type ThemeChoice = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'bg-theme'

/**
 * Hell, dunkel oder wie das Gerät es will.
 *
 * Drei Zustände, nicht zwei: „System" ist kein Umweg, sondern für die meisten
 * die richtige Antwort — abends dunkel, im Biergarten hell, ohne dass jemand
 * etwas umstellt. Die beiden anderen sind für die, denen das nicht passt.
 *
 * Der Wert landet als `data-theme` am <html>. Ohne Attribut greift die
 * Systemeinstellung, so ist das Stylesheet gebaut.
 */
export function useTheme() {
  const theme = useState<ThemeChoice>('theme', () => 'system')

  function apply(choice: ThemeChoice): void {
    if (choice === 'system') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = choice
  }

  function choose(choice: ThemeChoice): void {
    theme.value = choice
    apply(choice)

    try {
      if (choice === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, choice)
    }
    catch {
      // Privater Modus. Die Wahl gilt dann nur für diese Sitzung.
    }
  }

  /** Nur im Browser aufrufen. Das Attribut selbst setzt schon das Kopf-Skript. */
  function hydrate(): void {
    const stored = document.documentElement.dataset.theme
    theme.value = stored === 'light' || stored === 'dark' ? stored : 'system'
  }

  return { theme, choose, hydrate }
}
