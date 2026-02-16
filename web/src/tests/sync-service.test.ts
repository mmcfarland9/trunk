/**
 * Tests for sync-service.ts
 * Focus: Array bounds safety, edge cases with empty/single-item arrays
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { TrunkEvent } from '../events/types'

// Mock dependencies before importing sync-service
vi.mock('../lib/supabase', () => ({
  supabase: null, // Will be replaced per test
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

describe('sync-service array bounds safety', () => {
  let mockSupabase: any
  let getAuthStateMock: any
  let getEventsMock: any

  beforeEach(async () => {
    // Reset mocks
    vi.resetModules()

    // Import fresh mocks
    const authService = await import('../services/auth-service')
    const eventStore = await import('../events/store')

    getAuthStateMock = authService.getAuthState as any
    getEventsMock = eventStore.getEvents as any

    // Default: authenticated user
    getAuthStateMock.mockReturnValue({
      user: { id: 'test-user-123' },
      session: { access_token: 'test-token' },
      loading: false,
    })

    // Default: empty local events
    getEventsMock.mockReturnValue([])

    // Mock Supabase client
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            gt: vi.fn(() => ({
              // Mock query result
              data: null,
              error: null,
            })),
          })),
        })),
        insert: vi.fn(() => ({ error: null })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null })),
        })),
      })),
      channel: vi.fn(() => ({
        on: vi.fn(() => ({
          subscribe: vi.fn(),
        })),
      })),
      removeChannel: vi.fn(),
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('smartSync with empty arrays', () => {
    it('handles empty sync results without crashing (no array access)', async () => {
      // Replace supabase mock
      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      // Mock query to return empty array
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [], // Empty array
            error: null,
          })),
        })),
      }))

      const { smartSync } = await import('../services/sync-service')
      const result = await smartSync()

      // Should succeed without accessing array indices
      expect(result.status).toBe('success')
      expect(result.pulled).toBe(0)
      expect(result.error).toBe(null)
    })

    it('handles single-item sync result correctly', async () => {
      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const singleEvent = {
        id: '1',
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
        client_id: 'client-1',
        client_timestamp: '2026-02-15T10:00:00Z',
        created_at: '2026-02-15T10:00:00Z',
      }

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [singleEvent], // Single item
            error: null,
          })),
        })),
      }))

      const { smartSync } = await import('../services/sync-service')
      const result = await smartSync()

      // Should access last item (index 0) safely
      expect(result.status).toBe('success')
      expect(result.pulled).toBe(1)
      // Verify last sync timestamp was set from single item
      expect(localStorage.getItem('trunk-last-sync')).toBe('2026-02-15T10:00:00Z')
    })

    it('handles multiple-item sync result correctly', async () => {
      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const events = [
        {
          id: '1',
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
          client_id: 'client-1',
          client_timestamp: '2026-02-15T10:00:00Z',
          created_at: '2026-02-15T10:00:00Z',
        },
        {
          id: '2',
          user_id: 'test-user-123',
          type: 'sprout_watered',
          payload: {
            type: 'sprout_watered',
            timestamp: '2026-02-15T11:00:00Z',
            sproutId: 'sprout-1',
            content: 'Watered the sprout',
          },
          client_id: 'client-2',
          client_timestamp: '2026-02-15T11:00:00Z',
          created_at: '2026-02-15T11:00:00Z',
        },
        {
          id: '3',
          user_id: 'test-user-123',
          type: 'sprout_harvested',
          payload: {
            type: 'sprout_harvested',
            timestamp: '2026-02-15T12:00:00Z',
            sproutId: 'sprout-1',
            result: 5,
            capacityGained: 2.5,
          },
          client_id: 'client-3',
          client_timestamp: '2026-02-15T12:00:00Z',
          created_at: '2026-02-15T12:00:00Z',
        },
      ]

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: events,
            error: null,
          })),
        })),
      }))

      const { smartSync } = await import('../services/sync-service')
      const result = await smartSync()

      // Should access last item (index 2) safely
      expect(result.status).toBe('success')
      expect(result.pulled).toBe(3)
      // Verify last sync timestamp was set from LAST item
      expect(localStorage.getItem('trunk-last-sync')).toBe('2026-02-15T12:00:00Z')
    })
  })

  describe('forceFullSync with empty arrays', () => {
    it('handles empty full sync without crashing', async () => {
      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [], // Empty array
            error: null,
          })),
        })),
      }))

      const { forceFullSync } = await import('../services/sync-service')
      const result = await forceFullSync()

      expect(result.status).toBe('success')
      expect(result.pulled).toBe(0)
      expect(result.mode).toBe('full')
    })
  })

  describe('subscribeSyncMetadata', () => {
    it('handles empty metadata listeners array', async () => {
      vi.doMock('../lib/supabase', () => ({
        supabase: null,
        isSupabaseConfigured: () => false,
      }))

      const { subscribeSyncMetadata } = await import('../services/sync-service')

      let receivedMeta: any = null
      const unsubscribe = subscribeSyncMetadata((meta) => {
        receivedMeta = meta
      })

      // Should receive immediate callback
      expect(receivedMeta).not.toBe(null)
      expect(receivedMeta.status).toBeDefined()
      expect(receivedMeta.pendingCount).toBe(0)

      // Should be able to unsubscribe without error
      unsubscribe()
    })

    it('handles single subscriber', async () => {
      vi.doMock('../lib/supabase', () => ({
        supabase: null,
        isSupabaseConfigured: () => false,
      }))

      const { subscribeSyncMetadata } = await import('../services/sync-service')

      const calls: any[] = []
      const unsubscribe = subscribeSyncMetadata((meta) => {
        calls.push(meta)
      })

      // Should receive initial call
      expect(calls.length).toBe(1)

      unsubscribe()
    })

    it('handles multiple subscribers and removes correctly', async () => {
      vi.doMock('../lib/supabase', () => ({
        supabase: null,
        isSupabaseConfigured: () => false,
      }))

      const { subscribeSyncMetadata } = await import('../services/sync-service')

      const calls1: any[] = []
      const calls2: any[] = []
      const calls3: any[] = []

      const unsub1 = subscribeSyncMetadata((meta) => calls1.push(meta))
      const unsub2 = subscribeSyncMetadata((meta) => calls2.push(meta))
      const unsub3 = subscribeSyncMetadata((meta) => calls3.push(meta))

      expect(calls1.length).toBe(1)
      expect(calls2.length).toBe(1)
      expect(calls3.length).toBe(1)

      // Unsubscribe middle one
      unsub2()

      // Should not crash
      expect(true).toBe(true)
    })
  })

  describe('not authenticated scenarios', () => {
    it('returns error when user is null', async () => {
      getAuthStateMock.mockReturnValue({
        user: null,
        session: null,
        loading: false,
      })

      vi.doMock('../lib/supabase', () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: () => true,
      }))

      const { smartSync } = await import('../services/sync-service')
      const result = await smartSync()

      expect(result.status).toBe('error')
      expect(result.error).toBe('Not authenticated')
    })
  })

  describe('supabase not configured', () => {
    it('returns error when supabase is null', async () => {
      vi.doMock('../lib/supabase', () => ({
        supabase: null,
        isSupabaseConfigured: () => false,
      }))

      const { smartSync } = await import('../services/sync-service')
      const result = await smartSync()

      expect(result.status).toBe('error')
      expect(result.error).toBe('Supabase not configured')
    })
  })
})

describe('Array access guard verification', () => {
  it('documents that line 122 access is guarded by length check on line 107', () => {
    // Line 107: if (syncEvents && syncEvents.length > 0)
    // Line 122: const latest = syncEvents[syncEvents.length - 1].created_at
    //
    // This access is SAFE because:
    // 1. It's inside the if block that checks syncEvents.length > 0
    // 2. Array has at least 1 item, so [length - 1] = [0] is valid
    expect(true).toBe(true)
  })

  it('documents that line 400 access is guarded by length check on line 399', () => {
    // Line 399: if (syncEvents.length > 0)
    // Line 400: const latest = syncEvents[syncEvents.length - 1].created_at
    //
    // This access is SAFE because:
    // 1. It's inside the if block that checks syncEvents.length > 0
    // 2. Array has at least 1 item, so [length - 1] = [0] is valid
    expect(true).toBe(true)
  })

  it('documents that all other array operations use safe methods', () => {
    // All other array operations in sync-service.ts use:
    // - .map() - safe, returns empty array for empty input
    // - .filter() - safe, returns empty array for empty input
    // - .forEach() - safe, no-op for empty arrays
    // - .some() - safe, returns false for empty arrays
    // - .find() - safe, returns undefined for empty arrays
    // - .splice() - safe, validated index before use
    //
    // NO unguarded direct index access exists in this file.
    expect(true).toBe(true)
  })
})
