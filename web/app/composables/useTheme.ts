export type ThemeChoice = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'bg-theme'

/**
 * Light, dark, or whatever the device wants.
 *
 * Three states, not two: "system" is not a detour but the right answer for
 * most people — dark in the evening, light in the beer garden, without anyone
 * touching a setting. The other two are for those it does not suit.
 *
 * The value lands as `data-theme` on <html>. Without the attribute the system
 * setting applies; that is how the stylesheet is built.
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
      // Private mode. The choice then only holds for this session.
    }
  }

  /** Call in the browser only. The head script already set the attribute. */
  function hydrate(): void {
    const stored = document.documentElement.dataset.theme
    theme.value = stored === 'light' || stored === 'dark' ? stored : 'system'
  }

  return { theme, choose, hydrate }
}
