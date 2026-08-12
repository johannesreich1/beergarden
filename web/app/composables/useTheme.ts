export type ThemeChoice = 'light' | 'dark'

const STORAGE_KEY = 'bg-theme'

/**
 * Light or dark. Nothing else.
 *
 * There used to be a third setting, "system", and it was the default. It reads
 * well in a settings list and badly on a switch: two of the three states look
 * identical at any given moment, so pressing it appeared to do nothing every
 * second time. The device preference has not gone away — it decides the first
 * view, before anybody has chosen. It just is not a state you can land on.
 */
export function useTheme() {
  const theme = useState<ThemeChoice>('theme', () => 'light')

  function apply(choice: ThemeChoice): void {
    document.documentElement.dataset.theme = choice
  }

  function choose(choice: ThemeChoice): void {
    theme.value = choice
    apply(choice)

    try {
      localStorage.setItem(STORAGE_KEY, choice)
    }
    catch {
      // Private mode. The choice then only holds for this session.
    }
  }

  /** The next setting — what one press of the switch will do. With only two
   *  states, "next" simply means "the other one". */
  const next = computed<ThemeChoice>(() => (theme.value === 'light' ? 'dark' : 'light'))

  function cycle(): void {
    choose(next.value)
  }

  /** Call in the browser only. The head script already set the attribute. */
  /**
   * The device decides the first view, the visitor decides every one after.
   *
   * The head script has already written the attribute, resolving the device
   * preference when nothing was stored — reading it back keeps one source for
   * the answer instead of asking `matchMedia` a second time and risking a
   * different one.
   */
  function hydrate(): void {
    const stored = document.documentElement.dataset.theme
    theme.value = stored === 'dark' ? 'dark' : 'light'
  }

  return { theme, next, choose, cycle, hydrate }
}
