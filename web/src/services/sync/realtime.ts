import { supabase } from '../../lib/supabase'
import { getAuthState } from '../auth-service'
import { getEvents, appendEvents } from '../../events/store'
import type { TrunkEvent } from '../../events/types'
import type { SyncEvent } from '../sync-types'
import { syncToLocalEvent } from '../sync-types'
import { buildDedupeIndex } from './dedup'
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

// Microtask batching: collect rapid arrivals, process once
let pendingPayloads: { syncEvent: SyncEvent; localEvent: TrunkEvent }[] = []
let batchScheduled = false

function flushRealtimeBatch(): void {
  batchScheduled = false
  const payloads = pendingPayloads
  pendingPayloads = []
  if (payloads.length === 0) return

  // Build dedup index ONCE for the entire batch
  const { clientIds, keys } = buildDedupeIndex(getEvents())
  const newEvents: TrunkEvent[] = []

  for (const { syncEvent, localEvent } of payloads) {
    const alreadyExists =
      (syncEvent.client_id && clientIds.has(syncEvent.client_id)) ||
      keys.has(`${localEvent.timestamp}|${localEvent.type}`)

    if (!alreadyExists) {
      newEvents.push(localEvent)
      // Update index so subsequent events in the batch dedup against this one
      if (localEvent.client_id) clientIds.add(localEvent.client_id)
      keys.add(`${localEvent.timestamp}|${localEvent.type}`)
    }
  }

  if (newEvents.length > 0) {
    appendEvents(newEvents) // single derivation invalidation
    for (const event of newEvents) {
      onRealtimeEvent?.(event)
    }
  }
}

/** Flush any pending batched realtime events (exposed for testing). */
export function flushRealtimeQueue(): void {
  if (batchScheduled) {
    flushRealtimeBatch()
  }
}

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

        // Queue for microtask batch — rapid arrivals = 1 dedup + 1 derivation
        pendingPayloads.push({ syncEvent, localEvent })
        if (!batchScheduled) {
          batchScheduled = true
          queueMicrotask(flushRealtimeBatch)
        }
      },
    )
    .subscribe()
}

/**
 * Unsubscribe from realtime events
 */
export function unsubscribeFromRealtime(): void {
  // Flush any pending events before disconnecting
  flushRealtimeQueue()
  if (realtimeChannel) {
    supabase?.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
  onRealtimeEvent = null
}
