/**
 * Shared deduplication index for sync operations.
 * Replaces O(n) .some()/.find() scans with O(1) Set/Map lookups.
 */

import type { TrunkEvent } from '../../events/types'

export type DedupeIndex = {
  clientIds: Set<string>
  keys: Set<string>
  byClientId: Map<string, TrunkEvent>
}

/**
 * Build a dedup index from the current event log.
 * Used by both pull and realtime to detect duplicates in O(1).
 */
export function buildDedupeIndex(events: readonly TrunkEvent[]): DedupeIndex {
  const clientIds = new Set<string>()
  const keys = new Set<string>()
  const byClientId = new Map<string, TrunkEvent>()

  for (const e of events) {
    if (e.client_id) {
      clientIds.add(e.client_id)
      byClientId.set(e.client_id, e)
    }
    keys.add(`${e.timestamp}|${e.type}`)
  }

  return { clientIds, keys, byClientId }
}
