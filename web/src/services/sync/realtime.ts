import { supabase } from '../../lib/supabase'
import { getAuthState } from '../auth-service'
import { getEvents, appendEvents } from '../../events/store'
import type { TrunkEvent } from '../../events/types'
import type { SyncEvent } from '../sync-types'
import { syncToLocalEvent } from '../sync-types'
import type { RealtimeChannel } from '@supabase/supabase-js'

// DO-14: Validate realtime payload shape before casting to SyncEvent
function isValidSyncEventShape(data: unknown): data is SyncEvent {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return (
    typeof d.type === 'string' &&
    typeof d.client_id === 'string' &&
    typeof d.user_id === 'string' &&
    typeof d.created_at === 'string'
  )
}

// Track the current realtime subscription
let realtimeChannel: RealtimeChannel | null = null
let onRealtimeEvent: ((event: TrunkEvent) => void) | null = null

/**
 * Subscribe to realtime events from other devices
 */
export function subscribeToRealtime(onEvent: (event: TrunkEvent) => void): void {
  if (!supabase) return

  const { user } = getAuthState()
  if (!user) return

  // Store callback for later use
  onRealtimeEvent = onEvent

  // Unsubscribe from any existing channel
  unsubscribeFromRealtime()

  // Subscribe to INSERT events on the events table for this user
  realtimeChannel = supabase
    .channel('events-realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'events',
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        // DO-14: Validate shape before casting
        if (!isValidSyncEventShape(payload.new)) return
        const syncEvent = payload.new
        const localEvent = syncToLocalEvent(syncEvent)
        if (!localEvent) return

        // C9: Dedup by client_id (primary) and timestamp (fallback)
        const existingEvents = getEvents()
        const alreadyExists = existingEvents.some(
          (e) =>
            (syncEvent.client_id && e.client_id === syncEvent.client_id) ||
            e.timestamp === localEvent.timestamp,
        )

        if (!alreadyExists) {
          // New event from another device - apply it
          appendEvents([localEvent])
          onRealtimeEvent?.(localEvent)
        }
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
      }
    })
}

/**
 * Unsubscribe from realtime events
 */
export function unsubscribeFromRealtime(): void {
  if (realtimeChannel) {
    supabase?.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
  onRealtimeEvent = null
}
