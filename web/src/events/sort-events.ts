import type { TrunkEvent } from './types'

/**
 * Sort events by timestamp (ascending).
 * Returns a new sorted array — does not mutate the input.
 */
export function sortEventsByTimestamp(events: readonly TrunkEvent[]): TrunkEvent[] {
  return [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )
}
