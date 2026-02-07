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

const VALID_EVENT_TYPES = new Set([
  'sprout_planted',
  'sprout_watered',
  'sprout_harvested',
  'sprout_uprooted',
  'sun_shone',
  'leaf_created',
])

function validateSyncPayload(payload: unknown): payload is TrunkEvent {
  if (typeof payload !== 'object' || payload === null) return false
  const p = payload as Record<string, unknown>
  if (typeof p.type !== 'string' || !VALID_EVENT_TYPES.has(p.type)) return false
  if (typeof p.timestamp !== 'string') return false
  return true
}

export function syncToLocalEvent(sync: SyncEvent): TrunkEvent | null {
  if (!validateSyncPayload(sync.payload)) {
    console.warn('Sync: rejected invalid event payload', sync.payload)
    return null
  }
  return sync.payload as unknown as TrunkEvent
}
