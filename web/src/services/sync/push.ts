/**
 * Push a single event to Supabase.
 * Automatically tracks pending state: adds to pendingUploadIds before push,
 * removes on success or duplicate, leaves on failure.
 */

import { supabase } from '../../lib/supabase'
import { getAuthState } from '../auth-service'
import type { TrunkEvent } from '../../events/types'
import { localToSyncPayload, generateClientId } from '../sync-types'
import { hasPendingId, addPendingId, removePendingId, savePendingIds } from './pending-uploads'
import { notifyMetadataListeners } from './status'
import { createTimeoutSignal } from './timeout'

// DR-4: Debounced pending-uploads save
// REVIEW: Debounce interval 300ms. Batches rapid consecutive saves.
const SAVE_DEBOUNCE_MS = 300
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null

function debouncedSavePendingIds(): void {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer)
  saveDebounceTimer = setTimeout(() => {
    savePendingIds()
    saveDebounceTimer = null
  }, SAVE_DEBOUNCE_MS)
}

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
