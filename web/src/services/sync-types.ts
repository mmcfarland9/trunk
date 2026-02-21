import type { TrunkEvent } from '../events/types'
import { VALID_SEASONS, VALID_ENVIRONMENTS } from '../events/types'
import { VALID_EVENT_TYPES } from '../generated/constants'

// Event format for Supabase storage
export type SyncEvent = {
  id: string
  user_id: string
  type: string
  payload: Record<string, unknown>
  client_id: string
  client_timestamp: string
  created_at: string
}

/**
 * Generate a unique client ID using crypto.randomUUID().
 * Non-deterministic — each call produces a new ID.
 * Callers should store the result on the event for reuse (e.g., retry matching).
 */
export function generateClientId(): string {
  return `${new Date().toISOString()}-${crypto.randomUUID().slice(0, 8)}`
}

export function localToSyncPayload(
  event: TrunkEvent,
  userId: string,
): Omit<SyncEvent, 'id' | 'created_at'> {
  return {
    user_id: userId,
    type: event.type,
    payload: event as unknown as Record<string, unknown>,
    client_id: event.client_id || generateClientId(),
    client_timestamp: event.timestamp,
  }
}

/**
 * Validate a merged sync payload has the required shape of a TrunkEvent.
 * Mirrors the per-event-type checks in store.ts validateEvent() to reject
 * malformed sync data before casting.
 */
function validateSyncPayload(payload: unknown): payload is TrunkEvent {
  if (typeof payload !== 'object' || payload === null) return false
  const e = payload as Record<string, unknown>

  if (typeof e.type !== 'string' || !VALID_EVENT_TYPES.has(e.type)) return false
  if (typeof e.timestamp !== 'string' || e.timestamp.length === 0) return false

  switch (e.type) {
    case 'sprout_planted':
      return (
        typeof e.sproutId === 'string' &&
        typeof e.twigId === 'string' &&
        typeof e.title === 'string' &&
        typeof e.season === 'string' &&
        (VALID_SEASONS as readonly string[]).includes(e.season) &&
        typeof e.environment === 'string' &&
        (VALID_ENVIRONMENTS as readonly string[]).includes(e.environment) &&
        typeof e.soilCost === 'number' &&
        e.soilCost >= 0
      )
    case 'sprout_watered':
      return typeof e.sproutId === 'string'
    case 'sprout_harvested':
      return (
        typeof e.sproutId === 'string' &&
        typeof e.result === 'number' &&
        e.result >= 1 &&
        e.result <= 5 &&
        typeof e.capacityGained === 'number' &&
        e.capacityGained >= 0
      )
    case 'sprout_uprooted':
      return typeof e.sproutId === 'string'
    case 'sun_shone':
      return typeof e.twigId === 'string'
    case 'leaf_created':
      return typeof e.leafId === 'string' && typeof e.name === 'string'
    default:
      return false
  }
}

export function syncToLocalEvent(sync: SyncEvent): TrunkEvent | null {
  // Build event by merging top-level columns into payload.
  // Web stores the full event object as payload (includes type/timestamp),
  // but iOS stores only domain fields in payload (type/timestamp are separate columns).
  // Merge ensures both formats produce a valid local event.
  const merged: Record<string, unknown> = {
    ...sync.payload,
    type: sync.payload.type ?? sync.type,
    timestamp: sync.payload.timestamp ?? sync.client_timestamp,
    client_id: sync.client_id,
  }

  // Validate per-event-type required fields before casting
  if (!validateSyncPayload(merged)) {
    return null
  }
  return merged as TrunkEvent
}
