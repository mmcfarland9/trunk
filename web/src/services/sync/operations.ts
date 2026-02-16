import { supabase } from '../../lib/supabase'
import { getAuthState } from '../auth-service'
import { getEvents, appendEvents, replaceEvents } from '../../events/store'
import type { TrunkEvent } from '../../events/types'
import type { SyncEvent } from '../sync-types'
import { localToSyncPayload, syncToLocalEvent, generateClientId } from '../sync-types'
import { isCacheValid, setCacheVersion, clearCacheVersion } from './cache'
import { getPendingCount, getPendingIds, addPendingId, removePendingId, savePendingIds } from './pending-uploads'
import { notifyMetadataListeners, setStatusDependencies } from './status'

const LAST_SYNC_KEY = 'trunk-last-sync'

/** The created_at of the most recently confirmed server event */
let lastConfirmedTimestamp: string | null = localStorage.getItem(LAST_SYNC_KEY)

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

export type SyncResult = {
  status: SyncStatus
  pulled: number
  error: string | null
  mode: 'incremental' | 'full'
}

let currentSyncStatus: SyncStatus = 'idle'

function setSyncStatus(status: SyncStatus): void {
  currentSyncStatus = status
  notifyMetadataListeners()
}

// Export these for status.ts to read (avoid circular dependency)
export function getCurrentSyncStatus(): string {
  return currentSyncStatus
}

export function getLastConfirmedTimestamp(): string | null {
  return lastConfirmedTimestamp
}

// Initialize status dependencies
setStatusDependencies(getCurrentSyncStatus, getLastConfirmedTimestamp)

/**
 * Pull events from Supabase since last sync
 */
async function pullEvents(): Promise<{ pulled: number; error: string | null }> {
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
      const newLocalEvents = (syncEvents as SyncEvent[])
        .map(syncToLocalEvent)
        .filter((e): e is TrunkEvent => e !== null)

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
      lastConfirmedTimestamp = latest

      return { pulled: uniqueNewEvents.length, error: null }
    }

    return { pulled: 0, error: null }
  } catch (err) {
    return { pulled: 0, error: String(err) }
  }
}

/**
 * Push a single event to Supabase.
 * Automatically tracks pending state: adds to pendingUploadIds before push,
 * removes on success or duplicate, leaves on failure.
 */
export async function pushEvent(event: TrunkEvent): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  const { user } = getAuthState()
  if (!user) return { error: 'Not authenticated' }

  const clientId = generateClientId(event)

  // Track as pending before attempting push
  addPendingId(clientId)
  savePendingIds()
  notifyMetadataListeners()

  try {
    const syncPayload = localToSyncPayload(event, user.id)

    const { error } = await supabase.from('events').insert(syncPayload)

    // 23505 = unique constraint violation (duplicate client_id)
    if (error && error.code !== '23505') {
      // Leave in pendingUploadIds for retry
      notifyMetadataListeners()
      return { error: error.message }
    }

    // Success or duplicate — remove from pending
    removePendingId(clientId)
    savePendingIds()
    notifyMetadataListeners()
    return { error: null }
  } catch (err) {
    // Leave in pendingUploadIds for retry
    notifyMetadataListeners()
    return { error: String(err) }
  }
}

/**
 * Retry pushing events that previously failed to sync.
 * Iterates through pendingUploadIds, finds matching local events, and re-pushes.
 */
async function retryPendingUploads(): Promise<number> {
  if (getPendingCount() === 0) return 0
  if (!supabase) return 0

  const { user } = getAuthState()
  if (!user) return 0

  const events = getEvents()
  let pushed = 0

  for (const clientId of getPendingIds()) {
    // Find the local event whose generated clientId matches
    const event = events.find(e => generateClientId(e) === clientId)
    if (!event) {
      // Event no longer in local store — remove stale pending ID
      removePendingId(clientId)
      continue
    }

    try {
      const syncPayload = localToSyncPayload(event, user.id)
      const { error } = await supabase.from('events').insert(syncPayload)

      if (!error || error.code === '23505') {
        // Success or already on server — remove from pending
        removePendingId(clientId)
        pushed++
      }
      // Other errors: leave in pendingUploadIds for next retry
    } catch {
      // Network error: leave in pendingUploadIds
    }
  }

  savePendingIds()
  if (pushed > 0) {
    notifyMetadataListeners()
  }
  return pushed
}

/**
 * Clear local cache (events and sync timestamp)
 * Used to ensure cloud is always source of truth
 */
function clearLocalCache(): void {
  localStorage.removeItem(LAST_SYNC_KEY)
  clearCacheVersion()
  replaceEvents([])
}

/**
 * Delete all events for the current user from Supabase
 * WARNING: This is destructive and cannot be undone
 */
export async function deleteAllEvents(): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  const { user } = getAuthState()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      return { error: error.message }
    }

    // Clear local cache after successful deletion
    clearLocalCache()

    return { error: null }
  } catch (err) {
    return { error: String(err) }
  }
}

/**
 * Force a full sync by invalidating cache and re-pulling everything.
 * Use to pick up server-side changes (e.g. deleted rows).
 */
export async function forceFullSync(): Promise<SyncResult> {
  localStorage.removeItem(LAST_SYNC_KEY)
  clearCacheVersion()
  return smartSync()
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

  // Retry any previously failed pushes before pulling
  const retried = await retryPendingUploads()

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
      const allEvents = (syncEvents as SyncEvent[])
        .map(syncToLocalEvent)
        .filter((e): e is TrunkEvent => e !== null)
      replaceEvents(allEvents)
      setCacheVersion()

      if (syncEvents.length > 0) {
        const latest = syncEvents[syncEvents.length - 1].created_at
        localStorage.setItem(LAST_SYNC_KEY, latest)
        lastConfirmedTimestamp = latest
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

    console.info(
      `Sync: Fetched ${result.pulled} remote changes, pushed ${retried} local changes, ${getPendingCount()} pending uploads remaining.`
    )

    setSyncStatus('success')
    return { status: 'success', pulled: result.pulled, error: null, mode }
  } catch (err) {
    // Network error - use cached data as fallback
    console.warn('Sync exception, using cached data:', err)
    setSyncStatus('error')
    return { status: 'error', pulled: 0, error: String(err), mode }
  }
}

/**
 * Sync when tab becomes visible again.
 * Call after auth is confirmed and initial sync is complete.
 */
export function startVisibilitySync(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      smartSync()
    }
  })
}
