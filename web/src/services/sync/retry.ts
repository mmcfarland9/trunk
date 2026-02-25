/**
 * Retry pushing events that previously failed to sync.
 * DR-5: Uses exponential backoff between retry attempts.
 */

import { supabase } from '../../lib/supabase'
import { getAuthState } from '../auth-service'
import { getEvents } from '../../events/store'
import { localToSyncPayload } from '../sync-types'
import { getPendingCount, getPendingIds, removePendingId, savePendingIds } from './pending-uploads'
import { notifyMetadataListeners } from './status'
import { createTimeoutSignal } from './timeout'

// DR-5: Exponential backoff for sync retries
// REVIEW: Backoff config — base 1s, max 30s, 3 retries with jitter.
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

export async function retryPendingUploads(): Promise<number> {
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
