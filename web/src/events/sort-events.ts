import type { TrunkEvent } from './types'

/**
 * Sort events by timestamp (ascending).
 * Returns a new sorted array — does not mutate the input.
 *
 * Optimization: O(n) pre-check detects already-sorted input (common case
 * when events come from localStorage or incremental appends) and skips
 * the O(n log n) sort, returning a shallow copy instead.
 */
export function sortEventsByTimestamp(events: readonly TrunkEvent[]): TrunkEvent[] {
  if (events.length <= 1) return [...events]

  // O(n) check: are events already in ascending timestamp order?
  let sorted = true
  let prevMs = new Date(events[0].timestamp).getTime()
  for (let i = 1; i < events.length; i++) {
    const ms = new Date(events[i].timestamp).getTime()
    if (ms < prevMs) {
      sorted = false
      break
    }
    prevMs = ms
  }

  if (sorted) return [...events]

  return [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )
}
