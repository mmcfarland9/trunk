import { supabase } from '../lib/supabase'
import { getAuthState } from './auth-service'
import { getEvents, appendEvents } from '../events/store'
import type { TrunkEvent } from '../events/types'
import type { SyncEvent } from './sync-types'
import { localToSyncPayload, syncToLocalEvent } from './sync-types'

const LAST_SYNC_KEY = 'trunk-last-sync'

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
