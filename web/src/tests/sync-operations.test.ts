/**
 * Tests for services/sync/operations.ts
 * Tests push, pull, retry, delete, and smart sync operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { TrunkEvent, SproutPlantedEvent } from '../events/types'

// Mock all dependencies before imports
vi.mock('../lib/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: () => false,
}))

vi.mock('../services/auth-service', () => ({
  getAuthState: vi.fn(() => ({
    user: null,
    session: null,
    loading: false,
  })),
}))

vi.mock('../events/store', () => ({
  getEvents: vi.fn(() => []),
  appendEvents: vi.fn(),
  replaceEvents: vi.fn(),
}))

vi.mock('../services/sync/cache', () => ({
  isCacheValid: vi.fn(() => false),
  setCacheVersion: vi.fn(),
  clearCacheVersion: vi.fn(),
  invalidateOnSyncFailure: vi.fn(),
}))

vi.mock('../services/sync/pending-uploads', () => ({
  getPendingCount: vi.fn(() => 0),
  getPendingIds: vi.fn(() => []),
  hasPendingId: vi.fn(() => false),
  addPendingId: vi.fn(),
  removePendingId: vi.fn(),
  savePendingIds: vi.fn(),
}))

vi.mock('../services/sync/status', () => ({
  notifyMetadataListeners: vi.fn(),
  setStatusDependencies: vi.fn(),
  recordSyncFailure: vi.fn(),
  resetSyncFailures: vi.fn(),
}))

// Helper event factories
function makePlantedEvent(overrides?: Partial<SproutPlantedEvent>): SproutPlantedEvent {
  return {
    type: 'sprout_planted',
    timestamp: '2026-02-15T10:00:00Z',
    sproutId: 'sprout-1',
    twigId: 'branch-0-twig-0',
    title: 'Test Sprout',
    season: '1m',
    environment: 'fertile',
    soilCost: 3,
    leafId: 'leaf-default',
    ...overrides,
  }
}

function makeSyncEvent(event: TrunkEvent, id: string, created_at?: string) {
  return {
    id,
    user_id: 'test-user-123',
    type: event.type,
    payload: event as unknown as Record<string, unknown>,
    client_id: `client-${id}`,
    client_timestamp: event.timestamp,
    created_at: created_at ?? event.timestamp,
  }
}

/** Build a mock Supabase with configurable terminal results */
function buildMockSupabase(opts?: {
  selectResult?: Promise<any>
  insertResult?: Promise<any>
  deleteResult?: Promise<any>
}) {
  const defaultSelect = Promise.resolve({ data: [], error: null })
  const defaultInsert = Promise.resolve({ error: null })
  const defaultDelete = Promise.resolve({ error: null })

  const selectEnd = opts?.selectResult ?? defaultSelect
  const insertEnd = opts?.insertResult ?? defaultInsert
  const deleteEnd = opts?.deleteResult ?? defaultDelete

  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            gt: vi.fn(() => ({
              abortSignal: vi.fn(() => selectEnd),
            })),
            abortSignal: vi.fn(() => selectEnd),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        abortSignal: vi.fn(() => insertEnd),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          abortSignal: vi.fn(() => deleteEnd),
        })),
      })),
    })),
  }
}

describe('sync operations', () => {
  let mockSupabase: any
  let getAuthStateMock: any
  let getEventsMock: any
  let isCacheValidMock: any
  let getPendingCountMock: any
  let getPendingIdsMock: any
  let addPendingIdMock: any
  let removePendingIdMock: any
  let savePendingIdsMock: any
  let setCacheVersionMock: any
  let clearCacheVersionMock: any
  let replaceEventsMock: any
  let _appendEventsMock: any
  let _notifyMetadataListenersMock: any

  beforeEach(async () => {
    vi.resetModules()

    const authService = await import('../services/auth-service')
    const eventStore = await import('../events/store')
    const cache = await import('../services/sync/cache')
    const pending = await import('../services/sync/pending-uploads')
    const status = await import('../services/sync/status')

    getAuthStateMock = vi.mocked(authService.getAuthState)
    getEventsMock = vi.mocked(eventStore.getEvents)
    replaceEventsMock = vi.mocked(eventStore.replaceEvents)
    _appendEventsMock = vi.mocked(eventStore.appendEvents)
    isCacheValidMock = vi.mocked(cache.isCacheValid)
    setCacheVersionMock = vi.mocked(cache.setCacheVersion)
    clearCacheVersionMock = vi.mocked(cache.clearCacheVersion)
    getPendingCountMock = vi.mocked(pending.getPendingCount)
    getPendingIdsMock = vi.mocked(pending.getPendingIds)
    addPendingIdMock = vi.mocked(pending.addPendingId)
    removePendingIdMock = vi.mocked(pending.removePendingId)
    savePendingIdsMock = vi.mocked(pending.savePendingIds)
    _notifyMetadataListenersMock = vi.mocked(status.notifyMetadataListeners)

    // Default: authenticated user
    getAuthStateMock.mockReturnValue({
      user: { id: 'test-user-123' },
      session: { access_token: 'test-token' },
      loading: false,
    })

    getEventsMock.mockReturnValue([])
    isCacheValidMock.mockReturnValue(false)
    getPendingCountMock.mockReturnValue(0)
    getPendingIdsMock.mockReturnValue([])

    // Default supabase mock
    // Chain: .select().eq('user_id',...).order().gt()?.abortSignal()
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              gt: vi.fn(() => ({
                abortSignal: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
              abortSignal: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        })),
        insert: vi.fn(() => ({
          abortSignal: vi.fn(() => Promise.resolve({ error: null })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            abortSignal: vi.fn(() => Promise.resolve({ error: null })),
          })),
        })),
      })),
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('pushEvent', () => {
    it('returns error when supabase is not configured', async () => {
      vi.doMock('../lib/supabase', () => ({
        supabase: null,
        isSupabaseConfigured: () => false,
      }))

      const { pushEvent } = await import('../services/sync/operations')
      const result = await pushEvent(makePlantedEvent())

      expect(result.error).toBe('Supabase not configured')
    })

    it('returns error when not authenticated', async () => {
      getAuthStateMock.mockReturnValue({ user: null, session: null, loading: false })

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { pushEvent } = await import('../services/sync/operations')
      const result = await pushEvent(makePlantedEvent())

      expect(result.error).toBe('Not authenticated')
    })

    it('successfully pushes an event', async () => {
      mockSupabase = buildMockSupabase()

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { pushEvent } = await import('../services/sync/operations')
      const result = await pushEvent(makePlantedEvent())

      expect(result.error).toBe(null)
      expect(addPendingIdMock).toHaveBeenCalled()
      expect(removePendingIdMock).toHaveBeenCalled()
      // DR-4: pre-push save is debounced, post-success save is immediate = 1 immediate call
      expect(savePendingIdsMock).toHaveBeenCalledTimes(1)
    })

    it('handles duplicate event (23505 error) gracefully', async () => {
      mockSupabase = buildMockSupabase({
        insertResult: Promise.resolve({ error: { code: '23505', message: 'duplicate key' } }),
      })

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { pushEvent } = await import('../services/sync/operations')
      const result = await pushEvent(makePlantedEvent())

      expect(result.error).toBe(null) // Duplicate is not an error
      expect(removePendingIdMock).toHaveBeenCalled()
    })

    it('leaves event in pending on non-duplicate error', async () => {
      mockSupabase = buildMockSupabase({
        insertResult: Promise.resolve({ error: { code: '42501', message: 'permission denied' } }),
      })

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { pushEvent } = await import('../services/sync/operations')
      const result = await pushEvent(makePlantedEvent())

      expect(result.error).toBe('permission denied')
      expect(removePendingIdMock).not.toHaveBeenCalled()
    })

    it('handles network exception during push', async () => {
      const rejection = Promise.reject(new Error('Network error'))
      rejection.catch(() => {}) // Prevent unhandled rejection warning
      mockSupabase = buildMockSupabase({ insertResult: rejection })

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { pushEvent } = await import('../services/sync/operations')
      const result = await pushEvent(makePlantedEvent())

      expect(result.error).toBe('Error: Network error')
      expect(removePendingIdMock).not.toHaveBeenCalled()
    })
  })

  describe('deleteAllEvents', () => {
    it('returns error when supabase is not configured', async () => {
      vi.doMock('../lib/supabase', () => ({
        supabase: null,
        isSupabaseConfigured: () => false,
      }))

      const { deleteAllEvents } = await import('../services/sync/operations')
      const result = await deleteAllEvents()

      expect(result.error).toBe('Supabase not configured')
    })

    it('returns error when not authenticated', async () => {
      getAuthStateMock.mockReturnValue({ user: null, session: null, loading: false })

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { deleteAllEvents } = await import('../services/sync/operations')
      const result = await deleteAllEvents()

      expect(result.error).toBe('Not authenticated')
    })

    it('successfully deletes all events and clears local cache', async () => {
      mockSupabase = buildMockSupabase()

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { deleteAllEvents } = await import('../services/sync/operations')
      const result = await deleteAllEvents()

      expect(result.error).toBe(null)
      expect(replaceEventsMock).toHaveBeenCalledWith([])
      expect(clearCacheVersionMock).toHaveBeenCalled()
    })

    it('returns error on supabase delete failure', async () => {
      mockSupabase = buildMockSupabase({
        deleteResult: Promise.resolve({ error: { message: 'delete failed' } }),
      })

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { deleteAllEvents } = await import('../services/sync/operations')
      const result = await deleteAllEvents()

      expect(result.error).toBe('delete failed')
    })

    it('handles network exception during delete', async () => {
      const rejection = Promise.reject(new Error('Network error'))
      rejection.catch(() => {}) // Prevent unhandled rejection warning
      mockSupabase = buildMockSupabase({ deleteResult: rejection })

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { deleteAllEvents } = await import('../services/sync/operations')
      const result = await deleteAllEvents()

      expect(result.error).toBe('Error: Network error')
    })
  })

  describe('smartSync - incremental mode', () => {
    it('uses incremental sync when cache is valid', async () => {
      isCacheValidMock.mockReturnValue(true)
      // Set last sync so pullEvents() calls .gt() on the query
      localStorage.setItem('trunk-last-sync', '2026-02-14T00:00:00Z')

      const event = makePlantedEvent()
      const syncEvent = makeSyncEvent(event, '1')

      mockSupabase = buildMockSupabase({
        selectResult: Promise.resolve({ data: [syncEvent], error: null }),
      })

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { smartSync } = await import('../services/sync/operations')
      const result = await smartSync()

      expect(result.mode).toBe('incremental')
      expect(result.status).toBe('success')
      expect(result.pulled).toBe(1)
      expect(setCacheVersionMock).toHaveBeenCalled()
    })

    it('pulls zero events when no lastSync exists (first incremental)', async () => {
      isCacheValidMock.mockReturnValue(true)
      // No last sync set - pullEvents will query without .gt()

      mockSupabase = buildMockSupabase()

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { smartSync } = await import('../services/sync/operations')
      const result = await smartSync()

      expect(result.mode).toBe('incremental')
      expect(result.status).toBe('success')
      expect(result.pulled).toBe(0)
    })

    it('deduplicates events by timestamp during incremental pull', async () => {
      isCacheValidMock.mockReturnValue(true)
      localStorage.setItem('trunk-last-sync', '2026-02-14T00:00:00Z')

      const event = makePlantedEvent()
      const syncEvent = makeSyncEvent(event, '1')

      // Local events already have this timestamp
      getEventsMock.mockReturnValue([event])

      mockSupabase = buildMockSupabase({
        selectResult: Promise.resolve({ data: [syncEvent], error: null }),
      })

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { smartSync } = await import('../services/sync/operations')
      const result = await smartSync()

      expect(result.pulled).toBe(0) // Duplicate was filtered
    })

    it('handles pull error during incremental sync', async () => {
      isCacheValidMock.mockReturnValue(true)
      localStorage.setItem('trunk-last-sync', '2026-02-14T00:00:00Z')

      mockSupabase = buildMockSupabase({
        selectResult: Promise.resolve({ data: null, error: { message: 'query failed' } }),
      })

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { smartSync } = await import('../services/sync/operations')
      const result = await smartSync()

      expect(result.status).toBe('error')
      expect(result.error).toBe('query failed')
    })
  })

  describe('smartSync - full mode', () => {
    it('uses full sync when cache is invalid', async () => {
      isCacheValidMock.mockReturnValue(false)

      mockSupabase = buildMockSupabase()

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { smartSync } = await import('../services/sync/operations')
      const result = await smartSync()

      expect(result.mode).toBe('full')
      expect(result.status).toBe('success')
    })

    it('replaces events during full sync', async () => {
      isCacheValidMock.mockReturnValue(false)

      const event = makePlantedEvent()
      const syncEvent = makeSyncEvent(event, '1')

      mockSupabase = buildMockSupabase({
        selectResult: Promise.resolve({ data: [syncEvent], error: null }),
      })

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { smartSync } = await import('../services/sync/operations')
      const result = await smartSync()

      expect(result.pulled).toBe(1)
      expect(replaceEventsMock).toHaveBeenCalled()
      expect(setCacheVersionMock).toHaveBeenCalled()
    })

    it('handles query error during full sync and falls back to cache', async () => {
      isCacheValidMock.mockReturnValue(false)

      mockSupabase = buildMockSupabase({
        selectResult: Promise.resolve({ data: null, error: { message: 'connection error' } }),
      })

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { smartSync } = await import('../services/sync/operations')
      const result = await smartSync()

      expect(result.status).toBe('error')
      expect(result.error).toBe('connection error')
      expect(replaceEventsMock).not.toHaveBeenCalled()
    })

    it('handles exception during full sync', async () => {
      isCacheValidMock.mockReturnValue(false)

      const rejection = Promise.reject(new Error('fetch failed'))
      rejection.catch(() => {}) // Prevent unhandled rejection warning
      mockSupabase = buildMockSupabase({ selectResult: rejection })

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { smartSync } = await import('../services/sync/operations')
      const result = await smartSync()

      expect(result.status).toBe('error')
      expect(result.error).toContain('fetch failed')
    })
  })

  describe('smartSync - retry pending uploads', () => {
    it('retries pending uploads before pulling', async () => {
      isCacheValidMock.mockReturnValue(false)
      getPendingCountMock.mockReturnValue(1)

      const event = makePlantedEvent()
      getPendingIdsMock.mockReturnValue(['pending-client-1'])
      getEventsMock.mockReturnValue([event])

      mockSupabase = buildMockSupabase()

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      // Need the generateClientId to match
      vi.doMock('../services/sync-types', async () => {
        const actual = await vi.importActual('../services/sync-types')
        return {
          ...actual,
          generateClientId: vi.fn(() => 'pending-client-1'),
        }
      })

      const { smartSync } = await import('../services/sync/operations')
      const result = await smartSync()

      expect(result.status).toBe('success')
    })

    it('removes stale pending IDs when event not found locally', async () => {
      isCacheValidMock.mockReturnValue(false)
      getPendingCountMock.mockReturnValue(1)
      getPendingIdsMock.mockReturnValue(['stale-client-id'])
      getEventsMock.mockReturnValue([]) // No matching event

      mockSupabase = buildMockSupabase()

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { smartSync } = await import('../services/sync/operations')
      await smartSync()

      expect(removePendingIdMock).toHaveBeenCalledWith('stale-client-id')
    })
  })

  describe('forceFullSync', () => {
    it('clears cache version and last sync before syncing', async () => {
      mockSupabase = buildMockSupabase()

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { forceFullSync } = await import('../services/sync/operations')
      const result = await forceFullSync()

      expect(result.mode).toBe('full')
      expect(clearCacheVersionMock).toHaveBeenCalled()
    })
  })

  describe('getCurrentSyncStatus and getLastConfirmedTimestamp', () => {
    it('exports status getters', async () => {
      vi.doMock('../lib/supabase', () => ({
        supabase: null,
        isSupabaseConfigured: () => false,
      }))

      const { getCurrentSyncStatus, getLastConfirmedTimestamp } = await import(
        '../services/sync/operations'
      )

      expect(getCurrentSyncStatus()).toBe('idle')
      expect(getLastConfirmedTimestamp()).toBe(null)
    })
  })

  describe('startVisibilitySync', () => {
    it('registers visibilitychange listener', async () => {
      vi.doMock('../lib/supabase', () => ({
        supabase: null,
        isSupabaseConfigured: () => false,
      }))

      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')

      const { startVisibilitySync } = await import('../services/sync/operations')
      startVisibilitySync()

      expect(addEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))

      addEventListenerSpy.mockRestore()
    })
  })
})
