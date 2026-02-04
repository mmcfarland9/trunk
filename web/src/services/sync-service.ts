import { supabase } from '../lib/supabase'
import { getAuthState } from './auth-service'
import { getEvents, appendEvents, replaceEvents } from '../events/store'
import type { TrunkEvent } from '../events/types'
import type { SyncEvent } from './sync-types'
import { localToSyncPayload, syncToLocalEvent } from './sync-types'
import type { RealtimeChannel } from '@supabase/supabase-js'

const LAST_SYNC_KEY = 'trunk-last-sync'
const CACHE_VERSION = 1
const CACHE_VERSION_KEY = 'trunk-cache-version'

/**
 * Check if cache version matches current version
 */
function isCacheValid(): boolean {
  const stored = localStorage.getItem(CACHE_VERSION_KEY)
  return stored === String(CACHE_VERSION)
}

/**
 * Update stored cache version to current
 */
function setCacheVersion(): void {
  localStorage.setItem(CACHE_VERSION_KEY, String(CACHE_VERSION))
}

/**
 * Clear cache version (forces full sync on next load)
 */
function clearCacheVersion(): void {
  localStorage.removeItem(CACHE_VERSION_KEY)
}

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
 * Pull ALL events from cloud (full sync, replaces local cache)
 * Use this on initial load to ensure we have the complete event log.
 *
 * IMPORTANT: Cloud is the single source of truth. This function:
 * 1. Clears local cache FIRST (prevents stale data issues)
 * 2. Pulls fresh from cloud
 * 3. Replaces local cache with cloud data
 */
export async function pullAllEvents(): Promise<{ pulled: number; error: string | null }> {
  if (!supabase) return { pulled: 0, error: 'Supabase not configured' }

  const { user } = getAuthState()
  if (!user) return { pulled: 0, error: 'Not authenticated' }

  // Clear local cache FIRST - cloud is source of truth
  // This prevents stale/corrupted local data from persisting
  clearLocalCache()

  try {
    const { data: syncEvents, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      return { pulled: 0, error: error.message }
    }

    if (syncEvents && syncEvents.length > 0) {
      const allEvents = (syncEvents as SyncEvent[]).map(syncToLocalEvent)

      // Replace local cache with cloud events
      replaceEvents(allEvents)

      // Update last sync timestamp
      const latest = syncEvents[syncEvents.length - 1].created_at
      localStorage.setItem(LAST_SYNC_KEY, latest)

      return { pulled: allEvents.length, error: null }
    }

    // No events in cloud = fresh start (cache already cleared above)
    replaceEvents([])
    return { pulled: 0, error: null }
  } catch (err) {
    return { pulled: 0, error: String(err) }
  }
}

/**
 * Clear local cache (events and sync timestamp)
 * Used to ensure cloud is always source of truth
 */
export function clearLocalCache(): void {
  localStorage.removeItem(LAST_SYNC_KEY)
  clearCacheVersion()
  replaceEvents([])
}
