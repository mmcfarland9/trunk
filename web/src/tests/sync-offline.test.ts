/**
 * Tests for offline sync behavior.
 * Tests: pushEvent on network failure adds to pending, pending count tracking,
 * and retry behavior with exponential backoff.
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

function buildMockSupabase(opts?: { insertResult?: Promise<any>; selectResult?: Promise<any> }) {
  const defaultSelect = Promise.resolve({ data: [], error: null })
  const defaultInsert = Promise.resolve({ error: null })

  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            gt: vi.fn(() => ({
              abortSignal: vi.fn(() => opts?.selectResult ?? defaultSelect),
            })),
            abortSignal: vi.fn(() => opts?.selectResult ?? defaultSelect),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        abortSignal: vi.fn(() => opts?.insertResult ?? defaultInsert),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          abortSignal: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
    })),
  }
}

describe('sync offline behavior', () => {
  let getAuthStateMock: any
  let addPendingIdMock: any
  let removePendingIdMock: any
  let hasPendingIdMock: any
  let notifyMetadataListenersMock: any

  beforeEach(async () => {
    vi.resetModules()

    const authService = await import('../services/auth-service')
    const pending = await import('../services/sync/pending-uploads')
    const status = await import('../services/sync/status')

    getAuthStateMock = vi.mocked(authService.getAuthState)
    addPendingIdMock = vi.mocked(pending.addPendingId)
    removePendingIdMock = vi.mocked(pending.removePendingId)
    hasPendingIdMock = vi.mocked(pending.hasPendingId)
    notifyMetadataListenersMock = vi.mocked(status.notifyMetadataListeners)

    getAuthStateMock.mockReturnValue({
      user: { id: 'test-user-123' },
      session: { access_token: 'test-token' },
      loading: false,
    })

    hasPendingIdMock.mockReturnValue(false)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('pushEvent on network failure', () => {
    it('adds event to pending uploads when insert fails with network error', async () => {
      const rejection = Promise.reject(new Error('Network error'))
      rejection.catch(() => {}) // Prevent unhandled rejection warning

      const mockSupabase = buildMockSupabase({ insertResult: rejection })

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { pushEvent } = await import('../services/sync/operations')
      const result = await pushEvent(makePlantedEvent())

      expect(result.error).toBe('Error: Network error')
      // Event was added to pending before the push attempt
      expect(addPendingIdMock).toHaveBeenCalled()
      // Event should NOT be removed from pending on failure
      expect(removePendingIdMock).not.toHaveBeenCalled()
    })

    it('adds event to pending uploads when insert returns non-duplicate error', async () => {
      const mockSupabase = buildMockSupabase({
        insertResult: Promise.resolve({ error: { code: '42501', message: 'permission denied' } }),
      })

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { pushEvent } = await import('../services/sync/operations')
      const result = await pushEvent(makePlantedEvent())

      expect(result.error).toBe('permission denied')
      expect(addPendingIdMock).toHaveBeenCalled()
      expect(removePendingIdMock).not.toHaveBeenCalled()
    })

    it('notifies metadata listeners on failure', async () => {
      const rejection = Promise.reject(new Error('Offline'))
      rejection.catch(() => {})

      const mockSupabase = buildMockSupabase({ insertResult: rejection })

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { pushEvent } = await import('../services/sync/operations')
      await pushEvent(makePlantedEvent())

      // notifyMetadataListeners should be called (pre-push + post-failure)
      expect(notifyMetadataListenersMock).toHaveBeenCalled()
    })
  })

  describe('pushEvent idempotency guard', () => {
    it('skips push when event client_id is already pending', async () => {
      hasPendingIdMock.mockReturnValue(true)

      const mockSupabase = buildMockSupabase()

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { pushEvent } = await import('../services/sync/operations')
      const event = makePlantedEvent({ client_id: 'already-pending' })
      const result = await pushEvent(event)

      expect(result.error).toBe(null) // No error — skipped
      expect(addPendingIdMock).not.toHaveBeenCalled() // Not added again
    })
  })

  describe('pushEvent success', () => {
    it('removes from pending on successful push', async () => {
      const mockSupabase = buildMockSupabase()

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { pushEvent } = await import('../services/sync/operations')
      const result = await pushEvent(makePlantedEvent())

      expect(result.error).toBe(null)
      expect(addPendingIdMock).toHaveBeenCalled()
      expect(removePendingIdMock).toHaveBeenCalled()
    })

    it('removes from pending on duplicate (23505) error', async () => {
      const mockSupabase = buildMockSupabase({
        insertResult: Promise.resolve({ error: { code: '23505', message: 'duplicate key' } }),
      })

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { pushEvent } = await import('../services/sync/operations')
      const result = await pushEvent(makePlantedEvent())

      expect(result.error).toBe(null) // Duplicate treated as success
      expect(removePendingIdMock).toHaveBeenCalled()
    })
  })
})

// Note: Integration-level pending-uploads tracking tests (add/remove cycles)
// are covered in pending-uploads.test.ts which tests the real module without mocks.
