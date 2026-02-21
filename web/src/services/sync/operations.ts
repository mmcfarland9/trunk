import { supabase } from '../../lib/supabase'
import { getAuthState } from '../auth-service'
import { getEvents, appendEvents, replaceEvents } from '../../events/store'
import type { TrunkEvent } from '../../events/types'
import type { SyncEvent } from '../sync-types'
import { localToSyncPayload, syncToLocalEvent, generateClientId } from '../sync-types'
import { isCacheValid, setCacheVersion, clearCacheVersion, invalidateOnSyncFailure } from './cache'
import {
  getPendingCount,
  getPendingIds,
  addPendingId,
  removePendingId,
  savePendingIds,
  hasPendingId,
} from './pending-uploads'
import {
  notifyMetadataListeners,
  setStatusDependencies,
  recordSyncFailure,
  resetSyncFailures,
} from './status'

const LAST_SYNC_KEY = 'trunk-last-sync'

// DR-3: AbortController-based request timeouts
// REVIEW: Timeout set to 15s. Could be 10s (aggressive) or 30s (lenient). AbortController cancels on timeout.
const SYNC_TIMEOUT_MS = 15_000

function createTimeoutSignal(): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS)
  return { signal: controller.signal, clear: () => clearTimeout(timeout) }
}

// DR-4: Debounced pending-uploads save
// REVIEW: Debounce interval 300ms. Batches rapid consecutive saves. Could be 100ms (responsive) or 500ms (fewer writes).
const SAVE_DEBOUNCE_MS = 300
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null

function debouncedSavePendingIds(): void {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer)
  saveDebounceTimer = setTimeout(() => {
    savePendingIds()
    saveDebounceTimer = null
  }, SAVE_DEBOUNCE_MS)
}

// DR-5: Exponential backoff for sync retries
// REVIEW: Backoff config — base 1s, max 30s, 3 retries with jitter. Could use shorter base (500ms) or more retries (5).
const BACKOFF_BASE_MS = 1000
const BACKOFF_MAX_MS = 30_000
const MAX_RETRIES = 3
let retryAttempt = 0
let lastRetryTime = 0

function getBackoffDelay(attempt: number): number {
  const delay = Math.min(BACKOFF_BASE_MS * 2 ** attempt, BACKOFF_MAX_MS)
  const jitter = Math.random() * delay * 0.2
  return delay + jitter
}

// C17: Guard against concurrent sync invocations
let currentSyncPromise: Promise<SyncResult> | null = null

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

  // DR-3: Request timeout
  const { signal, clear } = createTimeoutSignal()
  try {
    const lastSync = localStorage.getItem(LAST_SYNC_KEY)

    // DO-9: Defense-in-depth user_id filter alongside RLS
    let query = supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (lastSync) {
      query = query.gt('created_at', lastSync)
    }

    const { data: syncEvents, error } = await query.abortSignal(signal)

    if (error) {
      return { pulled: 0, error: error.message }
    }

    if (syncEvents && syncEvents.length > 0) {
      const newLocalEvents = (syncEvents as SyncEvent[])
        .map(syncToLocalEvent)
        .filter((e): e is TrunkEvent => e !== null)

      // C8: Merge with existing local events, dedup by client_id (primary) and timestamp+type (fallback)
      const existingEvents = getEvents()
      const existingClientIds = new Set(existingEvents.map((e) => e.client_id).filter(Boolean))
      // DO-10: Use timestamp+type for fallback dedup to match server's unique constraint
      const existingKeys = new Set(existingEvents.map((e) => `${e.timestamp}|${e.type}`))
      const uniqueNewEvents = newLocalEvents.filter((e) => {
        if (e.client_id && existingClientIds.has(e.client_id)) return false
        if (existingKeys.has(`${e.timestamp}|${e.type}`)) return false
        return true
      })

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
  } finally {
    clear()
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

  // DO-13: Immutable client_id assignment (no mutation of original event)
  const eventWithId = { ...event, client_id: event.client_id || generateClientId() }
  const clientId = eventWithId.client_id

  // DO-11: Idempotency guard — skip if already tracked as pending (retry will handle it)
  if (hasPendingId(clientId)) {
    return { error: null }
  }

  // Track as pending before attempting push
  addPendingId(clientId)
  // DR-4: Debounced save for rapid consecutive pushes
  debouncedSavePendingIds()
  notifyMetadataListeners()

  // DR-3: Request timeout
  const { signal, clear } = createTimeoutSignal()
  try {
    const syncPayload = localToSyncPayload(eventWithId, user.id)

    const { error } = await supabase.from('events').insert(syncPayload).abortSignal(signal)

    // 23505 = unique constraint violation (duplicate client_id)
    if (error && error.code !== '23505') {
      // Leave in pendingUploadIds for retry
      notifyMetadataListeners()
      return { error: error.message }
    }

    // Success or duplicate — remove from pending
    removePendingId(clientId)
    savePendingIds() // Immediate save on success
    notifyMetadataListeners()
    return { error: null }
  } catch (err) {
    // Leave in pendingUploadIds for retry
    notifyMetadataListeners()
    return { error: String(err) }
  } finally {
    clear()
  }
}

/**
 * Retry pushing events that previously failed to sync.
 * Iterates through pendingUploadIds, finds matching local events, and re-pushes.
 * DR-5: Uses exponential backoff between retry attempts.
 */
async function retryPendingUploads(): Promise<number> {
  if (getPendingCount() === 0) {
    retryAttempt = 0
    return 0
  }
  if (!supabase) return 0

  const { user } = getAuthState()
  if (!user) return 0

  // DR-5: Exponential backoff — skip if too soon since last retry
  const now = Date.now()
  if (retryAttempt > 0 && now - lastRetryTime < getBackoffDelay(retryAttempt - 1)) {
    return 0
  }
  lastRetryTime = now

  const events = getEvents()
  let pushed = 0

  for (const clientId of getPendingIds()) {
    // Find the local event whose stored client_id matches
    const event = events.find((e) => e.client_id === clientId)
    if (!event) {
      // Event no longer in local store — remove stale pending ID
      removePendingId(clientId)
      continue
    }

    // DR-3: Request timeout
    const { signal, clear } = createTimeoutSignal()
    try {
      const syncPayload = localToSyncPayload(event, user.id)
      const { error } = await supabase.from('events').insert(syncPayload).abortSignal(signal)

      if (!error || error.code === '23505') {
        // Success or already on server — remove from pending
        removePendingId(clientId)
        pushed++
      }
      // Other errors: leave in pendingUploadIds for next retry
    } catch {
      // Network error: leave in pendingUploadIds
    } finally {
      clear()
    }
  }

  savePendingIds()
  if (pushed > 0) {
    retryAttempt = 0
    notifyMetadataListeners()
  } else if (getPendingCount() > 0) {
    // DR-5: Increment backoff on failed retry (cap at MAX_RETRIES)
    retryAttempt = Math.min(retryAttempt + 1, MAX_RETRIES)
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

  // DR-3: Request timeout
  const { signal, clear } = createTimeoutSignal()
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('user_id', user.id)
      .abortSignal(signal)

    if (error) {
      return { error: error.message }
    }

    // Clear local cache after successful deletion
    clearLocalCache()

    return { error: null }
  } catch (err) {
    return { error: String(err) }
  } finally {
    clear()
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

  // C17: Guard against concurrent sync invocations
  if (currentSyncPromise) {
    return currentSyncPromise
  }

  const syncWork = async (): Promise<SyncResult> => {
    setSyncStatus('syncing')

    // Retry any previously failed pushes before pulling
    await retryPendingUploads()

    const cacheValid = isCacheValid()
    const mode = cacheValid ? 'incremental' : 'full'

    try {
      let result: { pulled: number; error: string | null }

      if (cacheValid) {
        // Incremental: pull only new events since last sync
        result = await pullEvents()
      } else {
        // C4: Preserve local pending events before full sync replacement
        const localEvents = getEvents()
        const pendingClientIds = new Set(getPendingIds())
        const pendingLocalEvents = localEvents.filter(
          (e) => e.client_id && pendingClientIds.has(e.client_id),
        )

        // Full: clear and pull everything
        // But don't clear cache until we have new data (fallback protection)
        // DR-3: Request timeout
        const { signal, clear } = createTimeoutSignal()
        let syncEvents: SyncEvent[]
        try {
          // DO-9: Defense-in-depth user_id filter alongside RLS
          const { data, error } = await supabase!
            .from('events')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .abortSignal(signal)

          if (error) {
            setSyncStatus('error')
            // DO-12: Invalidate cache on sync failure
            invalidateOnSyncFailure()
            // DR-6: Record failure for UI feedback
            recordSyncFailure(error.message)
            return { status: 'error', pulled: 0, error: error.message, mode }
          }

          syncEvents = (data ?? []) as SyncEvent[]
        } finally {
          clear()
        }

        // Success - now safe to replace cache
        const serverEvents = syncEvents
          .map(syncToLocalEvent)
          .filter((e): e is TrunkEvent => e !== null)

        // C4: Merge local pending events that aren't on the server yet
        const serverClientIds = new Set(serverEvents.map((e) => e.client_id).filter(Boolean))
        const uniquePending = pendingLocalEvents.filter((e) => !serverClientIds.has(e.client_id!))
        const mergedEvents = [...serverEvents, ...uniquePending]

        replaceEvents(mergedEvents)
        setCacheVersion()

        if (syncEvents.length > 0) {
          const latest = syncEvents[syncEvents.length - 1].created_at
          localStorage.setItem(LAST_SYNC_KEY, latest)
          lastConfirmedTimestamp = latest
        }

        result = { pulled: mergedEvents.length, error: null }
      }

      if (result.error) {
        setSyncStatus('error')
        // DO-12: Invalidate cache on sync failure
        invalidateOnSyncFailure()
        // DR-6: Record failure for UI feedback
        recordSyncFailure(result.error)
        return { status: 'error', pulled: 0, error: result.error, mode }
      }

      // Update cache version on successful incremental sync too
      if (cacheValid && result.pulled > 0) {
        setCacheVersion()
      }

      setSyncStatus('success')
      // DR-6: Reset failure tracking on success
      resetSyncFailures()
      return { status: 'success', pulled: result.pulled, error: null, mode }
    } catch (err) {
      setSyncStatus('error')
      // DO-12: Invalidate cache on sync failure
      invalidateOnSyncFailure()
      // DR-6: Record failure for UI feedback
      recordSyncFailure(String(err))
      return { status: 'error', pulled: 0, error: String(err), mode }
    }
  } // end syncWork

  currentSyncPromise = syncWork()
  try {
    return await currentSyncPromise
  } finally {
    currentSyncPromise = null
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
