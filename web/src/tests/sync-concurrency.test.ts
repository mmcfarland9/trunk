/**
 * Tests for sync concurrency guards and pending event preservation.
 * C17: concurrent sync guard — second call returns same promise.
 * C4: pending events are preserved during full sync.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SproutPlantedEvent } from '../events/types'

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
    ...overrides,
  }
}

function buildMockSupabase(opts?: { selectResult?: Promise<any> }) {
  const defaultSelect = Promise.resolve({ data: [], error: null })
  const selectEnd = opts?.selectResult ?? defaultSelect

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
        abortSignal: vi.fn(() => Promise.resolve({ error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          abortSignal: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
    })),
  }
}

describe('sync concurrency', () => {
  let getAuthStateMock: any
  let getEventsMock: any
  let isCacheValidMock: any
  let getPendingCountMock: any
  let getPendingIdsMock: any
  let replaceEventsMock: any

  beforeEach(async () => {
    vi.resetModules()

    const authService = await import('../services/auth-service')
    const eventStore = await import('../events/store')
    const cache = await import('../services/sync/cache')
    const pending = await import('../services/sync/pending-uploads')

    getAuthStateMock = vi.mocked(authService.getAuthState)
    getEventsMock = vi.mocked(eventStore.getEvents)
    replaceEventsMock = vi.mocked(eventStore.replaceEvents)
    isCacheValidMock = vi.mocked(cache.isCacheValid)
    getPendingCountMock = vi.mocked(pending.getPendingCount)
    getPendingIdsMock = vi.mocked(pending.getPendingIds)

    getAuthStateMock.mockReturnValue({
      user: { id: 'test-user-123' },
      session: { access_token: 'test-token' },
      loading: false,
    })

    getEventsMock.mockReturnValue([])
    isCacheValidMock.mockReturnValue(false)
    getPendingCountMock.mockReturnValue(0)
    getPendingIdsMock.mockReturnValue([])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('C17: concurrent sync guard', () => {
    it('second smartSync call returns same promise as first', async () => {
      let resolveSelect!: (value: any) => void
      const selectPromise = new Promise((resolve) => {
        resolveSelect = resolve
      })

      const mockSupabase = buildMockSupabase({ selectResult: selectPromise })

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { smartSync } = await import('../services/sync/operations')

      // Start two syncs concurrently
      const sync1 = smartSync()
      const sync2 = smartSync()

      // Resolve the select query
      resolveSelect({ data: [], error: null })

      const [result1, result2] = await Promise.all([sync1, sync2])

      // Both should return the same result (same promise)
      expect(result1).toBe(result2)
      expect(result1.status).toBe('success')
    })

    it('allows a new sync after the first completes', async () => {
      const mockSupabase = buildMockSupabase()

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { smartSync } = await import('../services/sync/operations')

      const result1 = await smartSync()
      expect(result1.status).toBe('success')

      // Second sync should work independently
      const result2 = await smartSync()
      expect(result2.status).toBe('success')
    })
  })

  describe('C4: pending event preservation', () => {
    it('preserves locally pending events during full sync', async () => {
      isCacheValidMock.mockReturnValue(false)
      getPendingCountMock.mockReturnValue(1)
      getPendingIdsMock.mockReturnValue(['pending-client-1'])

      const pendingEvent = makePlantedEvent({ client_id: 'pending-client-1' })
      getEventsMock.mockReturnValue([pendingEvent])

      // Server returns different events (the pending one hasn't synced yet)
      const serverSyncEvent = {
        id: 'server-1',
        user_id: 'test-user-123',
        type: 'leaf_created',
        payload: {
          type: 'leaf_created',
          timestamp: '2026-02-14T10:00:00Z',
          leafId: 'leaf-1',
          twigId: 'branch-0-twig-0',
          name: 'Fitness',
        },
        client_id: 'server-client-1',
        client_timestamp: '2026-02-14T10:00:00Z',
        created_at: '2026-02-14T10:00:00Z',
      }

      const mockSupabase = buildMockSupabase({
        selectResult: Promise.resolve({ data: [serverSyncEvent], error: null }),
      })

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { smartSync } = await import('../services/sync/operations')
      const result = await smartSync()

      expect(result.status).toBe('success')

      // replaceEvents should have been called with merged events
      // (server events + locally pending events not on server)
      expect(replaceEventsMock).toHaveBeenCalledTimes(1)
      const replacedWith = replaceEventsMock.mock.calls[0][0]

      // Should include both the server event and the pending local event
      expect(replacedWith.length).toBeGreaterThanOrEqual(2)

      // The pending event should be present (client_id 'pending-client-1')
      const hasPending = replacedWith.some((e: any) => e.client_id === 'pending-client-1')
      expect(hasPending).toBe(true)
    })

    it('does not duplicate pending events already on server', async () => {
      isCacheValidMock.mockReturnValue(false)
      getPendingCountMock.mockReturnValue(1)
      getPendingIdsMock.mockReturnValue(['shared-client-id'])

      const pendingEvent = makePlantedEvent({ client_id: 'shared-client-id' })
      getEventsMock.mockReturnValue([pendingEvent])

      // Server already has this event (same client_id)
      const serverSyncEvent = {
        id: 'server-1',
        user_id: 'test-user-123',
        type: 'sprout_planted',
        payload: {
          type: 'sprout_planted',
          timestamp: '2026-02-15T10:00:00Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          title: 'Test Sprout',
          season: '1m',
          environment: 'fertile',
          soilCost: 3,
        },
        client_id: 'shared-client-id',
        client_timestamp: '2026-02-15T10:00:00Z',
        created_at: '2026-02-15T10:00:00Z',
      }

      const mockSupabase = buildMockSupabase({
        selectResult: Promise.resolve({ data: [serverSyncEvent], error: null }),
      })

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { smartSync } = await import('../services/sync/operations')
      await smartSync()

      // The pending event should NOT be duplicated — server already has it
      const replacedWith = replaceEventsMock.mock.calls[0][0]
      const matchingEvents = replacedWith.filter((e: any) => e.client_id === 'shared-client-id')
      expect(matchingEvents).toHaveLength(1)
    })
  })
})
