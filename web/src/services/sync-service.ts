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
 * Clear local cache (events and sync timestamp)
 * Used to ensure cloud is always source of truth
 */
export function clearLocalCache(): void {
  localStorage.removeItem(LAST_SYNC_KEY)
  clearCacheVersion()
  replaceEvents([])
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

export type SyncResult = {
  status: SyncStatus
  pulled: number
  error: string | null
  mode: 'incremental' | 'full'
}

let currentSyncStatus: SyncStatus = 'idle'
type SyncStatusListener = (status: SyncStatus) => void
const syncStatusListeners: SyncStatusListener[] = []

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  return currentSyncStatus
}

/**
 * Subscribe to sync status changes
 */
export function subscribeSyncStatus(listener: SyncStatusListener): () => void {
  syncStatusListeners.push(listener)
  listener(currentSyncStatus) // Immediate callback with current status
  return () => {
    const index = syncStatusListeners.indexOf(listener)
    if (index > -1) syncStatusListeners.splice(index, 1)
  }
}

function setSyncStatus(status: SyncStatus): void {
  currentSyncStatus = status
  syncStatusListeners.forEach(l => l(status))
}

/**
 * Smart sync: incremental if cache valid, full otherwise.
 * Uses cached data as fallback if network fails.
 */
export async function smartSync(): Promise<SyncResult> {
  if (!supabase) {
    return { status: 'error', pulled: 0, error: 'Supabase not configured', mode: 'full' }
  }

  const { user } = getAuthState()
  if (!user) {
    return { status: 'error', pulled: 0, error: 'Not authenticated', mode: 'full' }
  }

  setSyncStatus('syncing')

  const cacheValid = isCacheValid()
  const mode = cacheValid ? 'incremental' : 'full'

  try {
    let result: { pulled: number; error: string | null }

    if (cacheValid) {
      // Incremental: pull only new events since last sync
      result = await pullEvents()
    } else {
      // Full: clear and pull everything
      // But don't clear cache until we have new data (fallback protection)
      const { data: syncEvents, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        // Network failed - use existing cache as fallback
        console.warn('Sync failed, using cached data:', error.message)
        setSyncStatus('error')
        return { status: 'error', pulled: 0, error: error.message, mode }
      }

      // Success - now safe to replace cache
      const allEvents = (syncEvents as SyncEvent[]).map(syncToLocalEvent)
      replaceEvents(allEvents)
      setCacheVersion()

      if (syncEvents.length > 0) {
        const latest = syncEvents[syncEvents.length - 1].created_at
        localStorage.setItem(LAST_SYNC_KEY, latest)
      }

      result = { pulled: allEvents.length, error: null }
    }

    if (result.error) {
      setSyncStatus('error')
      return { status: 'error', pulled: 0, error: result.error, mode }
    }

    // Update cache version on successful incremental sync too
    if (cacheValid && result.pulled > 0) {
      setCacheVersion()
    }

    setSyncStatus('success')
    return { status: 'success', pulled: result.pulled, error: null, mode }
  } catch (err) {
    // Network error - use cached data as fallback
    console.warn('Sync exception, using cached data:', err)
    setSyncStatus('error')
    return { status: 'error', pulled: 0, error: String(err), mode }
  }
}
