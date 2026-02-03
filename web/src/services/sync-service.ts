import { supabase } from '../lib/supabase'
import { getAuthState } from './auth-service'
import { getEvents, appendEvents } from '../events/store'
import { rebuildFromEvents } from '../events/rebuild'
import type { TrunkEvent } from '../events/types'
import type { SyncEvent } from './sync-types'
import { localToSyncPayload, syncToLocalEvent } from './sync-types'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { STORAGE_KEY } from '../constants'
import { CURRENT_SCHEMA_VERSION } from '../state/migrations'

const LAST_SYNC_KEY = 'trunk-last-sync'

// Track the current realtime subscription
let realtimeChannel: RealtimeChannel | null = null
let onRealtimeEvent: ((event: TrunkEvent) => void) | null = null

/**
 * Pull events from Supabase since last sync
 */
export async function pullEvents(): Promise<{ pulled: number; error: string | null }> {
  if (!supabase) return { pulled: 0, error: 'Supabase not configured' }

  const { user } = getAuthState()
  if (!user) return { pulled: 0, error: 'Not authenticated' }

  try {
    const lastSync = localStorage.getItem(LAST_SYNC_KEY)

    let query = supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: true })

    if (lastSync) {
      query = query.gt('created_at', lastSync)
    }

    const { data: syncEvents, error } = await query

    if (error) {
      return { pulled: 0, error: error.message }
    }

    if (syncEvents && syncEvents.length > 0) {
      const newLocalEvents = (syncEvents as SyncEvent[]).map(syncToLocalEvent)

      // Merge with existing local events, avoiding duplicates by timestamp
      const existingEvents = getEvents()
      const existingTimestamps = new Set(existingEvents.map(e => e.timestamp))
      const uniqueNewEvents = newLocalEvents.filter(e => !existingTimestamps.has(e.timestamp))

      if (uniqueNewEvents.length > 0) {
        appendEvents(uniqueNewEvents)
      }

      // Update last sync timestamp
      const latest = syncEvents[syncEvents.length - 1].created_at
      localStorage.setItem(LAST_SYNC_KEY, latest)

      return { pulled: uniqueNewEvents.length, error: null }
    }

    return { pulled: 0, error: null }
  } catch (err) {
    return { pulled: 0, error: String(err) }
  }
}

/**
 * Push a single event to Supabase
 */
export async function pushEvent(event: TrunkEvent): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  const { user } = getAuthState()
  if (!user) return { error: 'Not authenticated' }

  try {
    const syncPayload = localToSyncPayload(event, user.id)

    const { error } = await supabase.from('events').insert(syncPayload)

    // 23505 = unique constraint violation (duplicate client_id)
    if (error && error.code !== '23505') {
      return { error: error.message }
    }

    return { error: null }
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * Push all local events to Supabase (initial migration)
 */
export async function uploadAllLocalEvents(): Promise<{ uploaded: number; error: string | null }> {
  if (!supabase) return { uploaded: 0, error: 'Supabase not configured' }

  const { user } = getAuthState()
  if (!user) return { uploaded: 0, error: 'Not authenticated' }

  const events = getEvents()
  if (events.length === 0) {
    return { uploaded: 0, error: null }
  }

  try {
    const syncPayloads = events.map(e => localToSyncPayload(e, user.id))

    // Insert in batches of 100 to avoid payload size limits
    const batchSize = 100
    let uploaded = 0

    for (let i = 0; i < syncPayloads.length; i += batchSize) {
      const batch = syncPayloads.slice(i, i + batchSize)
      const { error } = await supabase.from('events').insert(batch)

      // Ignore duplicate errors
      if (error && error.code !== '23505') {
        return { uploaded, error: error.message }
      }

      uploaded += batch.length
    }

    return { uploaded, error: null }
  } catch (err) {
    return { uploaded: 0, error: String(err) }
  }
}

/**
 * Check if we have pending local events to sync
 */
export function hasPendingSync(): boolean {
  const lastSync = localStorage.getItem(LAST_SYNC_KEY)
  if (!lastSync) return getEvents().length > 0

  const events = getEvents()
  return events.some(e => e.timestamp > lastSync)
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
        const syncEvent = payload.new as SyncEvent
        const localEvent = syncToLocalEvent(syncEvent)

        // Check if we already have this event (we pushed it ourselves)
        const existingEvents = getEvents()
        const alreadyExists = existingEvents.some(e => e.timestamp === localEvent.timestamp)

        if (!alreadyExists) {
          // New event from another device - apply it
          appendEvents([localEvent])
          onRealtimeEvent?.(localEvent)
          console.log('Realtime: received event from another device', localEvent.type)
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Realtime: connected')
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
    console.log('Realtime: disconnected')
  }
  onRealtimeEvent = null
}

/**
 * Rebuild nodeState from all events in the store.
 * This syncs the event-sourced data into the legacy localStorage format
 * so the UI can display it properly.
 */
export function rebuildNodeStateFromEvents(): void {
  const events = getEvents()
  if (events.length === 0) return

  // Rebuild state from events (copy to mutable array)
  const { nodes, sunLog } = rebuildFromEvents([...events])

  // Load existing state to preserve labels/notes not in events
  let existingNodes: Record<string, unknown> = {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      existingNodes = parsed?.nodes || {}
    }
  } catch {
    // Ignore parse errors
  }

  // Merge: events provide sprouts/leaves, preserve existing labels/notes
  const mergedNodes: Record<string, unknown> = { ...existingNodes }

  for (const [nodeId, nodeData] of Object.entries(nodes)) {
    const existing = (existingNodes[nodeId] || {}) as Record<string, unknown>
    mergedNodes[nodeId] = {
      label: existing.label || nodeData.label || '',
      note: existing.note || nodeData.note || '',
      ...(nodeData.sprouts && nodeData.sprouts.length > 0 ? { sprouts: nodeData.sprouts } : {}),
      ...(nodeData.leaves && nodeData.leaves.length > 0 ? { leaves: nodeData.leaves } : {}),
    }
  }

  // Save merged state to localStorage
  const data = JSON.stringify({
    _version: CURRENT_SCHEMA_VERSION,
    nodes: mergedNodes,
    sunLog,
    soilLog: [], // soilLog will be derived from events too
  })

  localStorage.setItem(STORAGE_KEY, data)
  console.log('Rebuilt nodeState from events:', Object.keys(nodes).length, 'twigs with data')
}
