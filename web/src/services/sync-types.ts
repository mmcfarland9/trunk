import type { TrunkEvent } from '../events/types'
import { validateEvent } from '../events/types'

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
  if (!validateEvent(merged)) {
    return null
  }
  return merged as TrunkEvent
}
