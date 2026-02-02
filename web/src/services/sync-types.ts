import type { TrunkEvent } from '../events/types'

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
 * Generate a unique client ID for an event.
 * Uses timestamp + type + key details to create uniqueness.
 */
function generateClientId(event: TrunkEvent): string {
  const parts = [event.timestamp, event.type]

  // Add unique identifiers based on event type
  if ('sproutId' in event) parts.push(event.sproutId)
  if ('twigId' in event) parts.push(event.twigId)
  if ('leafId' in event && event.leafId) parts.push(event.leafId)
  if ('content' in event) parts.push(event.content.slice(0, 50)) // First 50 chars

  // Simple hash for uniqueness
  const str = parts.join('|')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return `${event.timestamp}-${Math.abs(hash).toString(36)}`
}

export function localToSyncPayload(
  event: TrunkEvent,
  userId: string
): Omit<SyncEvent, 'id' | 'created_at'> {
  return {
    user_id: userId,
    type: event.type,
    payload: event as unknown as Record<string, unknown>,
    client_id: generateClientId(event),
    client_timestamp: event.timestamp,
  }
}

export function syncToLocalEvent(sync: SyncEvent): TrunkEvent {
  return sync.payload as unknown as TrunkEvent
}
