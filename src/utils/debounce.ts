/**
 * Debounce a function to prevent rapid repeated calls.
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | null = null
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      window.clearTimeout(timeoutId)
    }
    timeoutId = window.setTimeout(() => {
      timeoutId = null
      fn(...args)
    }, delay)
  }
}

/**
 * Prevent double-clicks by disabling button briefly after click.
 * Returns a wrapped handler that disables the button for the given duration.
 */
export function preventDoubleClick(
  handler: (e: MouseEvent) => void,
  lockDuration: number = 500
): (e: MouseEvent) => void {
  let locked = false
  return (e: MouseEvent) => {
    if (locked) return
    locked = true
    handler(e)
    window.setTimeout(() => {
      locked = false
    }, lockDuration)
  }
}
