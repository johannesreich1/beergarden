/** Minutes since midnight from an hour and a minute. */
export const at = (hours: number, minutes = 0): number => hours * 60 + minutes

/**
 * "10:00" → 600, "24:30" → 1470.
 *
 * Values beyond 24 hours are not a bug: MariaDB stores a closing time after
 * midnight this way so it stays greater than the opening time.
 */
export function parseClock(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + (minutes || 0)
}

/** 1470 → "00:30". For display, not for arithmetic. */
export function formatClock(total: number): string {
  const hours = Math.floor(total / 60) % 24
  const minutes = total % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** 330 → "5 h 30 min", 45 → "45 min". */
export function formatDuration(total: number): string {
  if (total < 60) return `${total} min`
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`
}
