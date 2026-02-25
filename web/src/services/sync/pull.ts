/**
 * Pull events from Supabase since last sync.
 */

import { supabase } from '../../lib/supabase'
import { getAuthState } from '../auth-service'
import { getEvents, appendEvents } from '../../events/store'
import type { TrunkEvent } from '../../events/types'
import type { SyncEvent } from '../sync-types'
import { syncToLocalEvent } from '../sync-types'
import { createTimeoutSignal } from './timeout'

export const LAST_SYNC_KEY = 'trunk-last-sync'

export async function pullEvents(): Promise<{
  pulled: number
  error: string | null
  latestTimestamp: string | null
}> {
  if (!supabase) return { pulled: 0, error: 'Supabase not configured', latestTimestamp: null }

  const { user } = getAuthState()
  if (!user) return { pulled: 0, error: 'Not authenticated', latestTimestamp: null }

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
      return { pulled: 0, error: error.message, latestTimestamp: null }
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

      // Return latest timestamp for caller to update sync state
      const latest = syncEvents[syncEvents.length - 1].created_at

      return { pulled: uniqueNewEvents.length, error: null, latestTimestamp: latest }
    }

    return { pulled: 0, error: null, latestTimestamp: null }
  } catch (err) {
    return { pulled: 0, error: String(err), latestTimestamp: null }
  } finally {
    clear()
  }
}
