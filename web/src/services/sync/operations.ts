/**
 * Sync orchestrator — coordinates pull, push, and retry modules.
 */

import { supabase } from '../../lib/supabase'
import { getAuthState } from '../auth-service'
import { getEvents, replaceEvents } from '../../events/store'
import type { TrunkEvent } from '../../events/types'
import type { SyncEvent } from '../sync-types'
import { syncToLocalEvent } from '../sync-types'
import { isCacheValid, setCacheVersion, clearCacheVersion, invalidateOnSyncFailure } from './cache'
import { getPendingIds } from './pending-uploads'
import {
  notifyMetadataListeners,
  setStatusDependencies,
  recordSyncFailure,
  resetSyncFailures,
} from './status'
import { createTimeoutSignal } from './timeout'
import { pullEvents, LAST_SYNC_KEY } from './pull'
import { retryPendingUploads } from './retry'

// Re-export pushEvent so existing imports from operations continue to work
export { pushEvent } from './push'

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
        const pullResult = await pullEvents()
        if (pullResult.latestTimestamp) {
          localStorage.setItem(LAST_SYNC_KEY, pullResult.latestTimestamp)
          lastConfirmedTimestamp = pullResult.latestTimestamp
        }
        result = { pulled: pullResult.pulled, error: pullResult.error }
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
