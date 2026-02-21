/**
 * Tests for services/sync/realtime.ts
 * Tests realtime subscription, deduplication, payload validation, and cleanup.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Capture the realtime callback so we can invoke it in tests
let realtimeCallback: any

// Channel-like object returned by subscribe() — must be truthy so
// realtimeChannel is set and unsubscribeFromRealtime() can detect it.
const channelHandle = { id: 'mock-channel' }

const mockChannel = {
  on: vi.fn((_event: string, _filter: any, cb: any) => {
    realtimeCallback = cb
    return {
      subscribe: vi.fn((statusCb?: (status: string) => void) => {
        statusCb?.('SUBSCRIBED')
        return channelHandle
      }),
    }
  }),
}

const mockSupabaseObj = {
  channel: vi.fn(() => mockChannel),
  removeChannel: vi.fn(),
}

vi.mock('../lib/supabase', () => {
  const mod: any = { supabase: null }
  return mod
})

vi.mock('../services/auth-service', () => ({
  getAuthState: vi.fn(() => ({
    user: { id: 'user-1' },
    session: { access_token: 'token' },
    loading: false,
  })),
}))

vi.mock('../events/store', () => ({
  getEvents: vi.fn(() => []),
  appendEvents: vi.fn(),
}))

vi.mock('../services/sync-types', () => ({
  syncToLocalEvent: vi.fn(() => null),
}))

import * as supabaseMod from '../lib/supabase'
import { subscribeToRealtime, unsubscribeFromRealtime } from '../services/sync/realtime'
import { getAuthState } from '../services/auth-service'
import { getEvents, appendEvents } from '../events/store'
import { syncToLocalEvent } from '../services/sync-types'

const getAuthStateMock = vi.mocked(getAuthState)
const getEventsMock = vi.mocked(getEvents)
const appendEventsMock = vi.mocked(appendEvents)
const syncToLocalEventMock = vi.mocked(syncToLocalEvent)

describe('realtime subscription', () => {
  beforeEach(() => {
    realtimeCallback = undefined

    // Reset channel mock
    mockChannel.on.mockClear()
    mockChannel.on.mockImplementation((_event: string, _filter: any, cb: any) => {
      realtimeCallback = cb
      return {
        subscribe: vi.fn((statusCb?: (status: string) => void) => {
          statusCb?.('SUBSCRIBED')
          return channelHandle
        }),
      }
    })

    // Reset supabase mock methods
    mockSupabaseObj.channel.mockClear()
    mockSupabaseObj.channel.mockReturnValue(mockChannel)
    mockSupabaseObj.removeChannel.mockClear()

    // Set supabase export to our mock object
    ;(supabaseMod as any).supabase = mockSupabaseObj

    // Default: authenticated user
    getAuthStateMock.mockReturnValue({
      user: { id: 'user-1' } as any,
      session: { access_token: 'token' } as any,
      loading: false,
    })

    getEventsMock.mockReturnValue([])
    syncToLocalEventMock.mockReturnValue(null)
    appendEventsMock.mockClear()
  })

  afterEach(() => {
    // Clean up module-level state
    unsubscribeFromRealtime()
    vi.clearAllMocks()
  })

  describe('subscribeToRealtime', () => {
    it('does nothing when supabase is null', () => {
      ;(supabaseMod as any).supabase = null

      const onEvent = vi.fn()
      subscribeToRealtime(onEvent)

      expect(mockSupabaseObj.channel).not.toHaveBeenCalled()
      expect(onEvent).not.toHaveBeenCalled()
    })

    it('does nothing when user is null', () => {
      getAuthStateMock.mockReturnValue({
        user: null,
        session: null,
        loading: false,
      })

      const onEvent = vi.fn()
      subscribeToRealtime(onEvent)

      expect(mockSupabaseObj.channel).not.toHaveBeenCalled()
    })

    it('creates channel with correct filter for user', () => {
      const onEvent = vi.fn()
      subscribeToRealtime(onEvent)

      expect(mockSupabaseObj.channel).toHaveBeenCalledWith('events-realtime')
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: 'user_id=eq.user-1',
        },
        expect.any(Function),
      )
    })

    it('unsubscribes existing channel before resubscribing', () => {
      // First subscription creates a channel
      subscribeToRealtime(vi.fn())

      // Second subscription should remove the first channel before creating a new one
      subscribeToRealtime(vi.fn())

      expect(mockSupabaseObj.removeChannel).toHaveBeenCalledTimes(1)
      expect(mockSupabaseObj.channel).toHaveBeenCalledTimes(2)
    })
  })

  describe('realtime callback', () => {
    it('validates payload shape and rejects invalid', () => {
      const onEvent = vi.fn()
      subscribeToRealtime(onEvent)

      // Invoke the callback with an invalid payload (missing required fields)
      realtimeCallback({ new: { type: 'sprout_planted' } })

      expect(syncToLocalEventMock).not.toHaveBeenCalled()
      expect(appendEventsMock).not.toHaveBeenCalled()
    })

    it('deduplicates by client_id', () => {
      const localEvent = {
        type: 'sprout_watered',
        timestamp: '2026-02-20T10:00:00Z',
        sproutId: 'sprout-1',
        content: 'Worked on it',
        client_id: 'client-abc',
      }

      syncToLocalEventMock.mockReturnValue(localEvent as any)

      getEventsMock.mockReturnValue([
        {
          type: 'sprout_watered',
          timestamp: '2026-02-20T09:00:00Z',
          sproutId: 'sprout-1',
          content: 'Earlier',
          client_id: 'client-abc',
        },
      ] as any)

      const onEvent = vi.fn()
      subscribeToRealtime(onEvent)

      realtimeCallback({
        new: {
          type: 'sprout_watered',
          client_id: 'client-abc',
          user_id: 'user-1',
          created_at: '2026-02-20T10:00:00Z',
          payload: {},
          client_timestamp: '2026-02-20T10:00:00Z',
        },
      })

      expect(appendEventsMock).not.toHaveBeenCalled()
    })

    it('deduplicates by timestamp', () => {
      const localEvent = {
        type: 'sprout_watered',
        timestamp: '2026-02-20T10:00:00Z',
        sproutId: 'sprout-1',
        content: 'Worked on it',
      }

      syncToLocalEventMock.mockReturnValue(localEvent as any)

      getEventsMock.mockReturnValue([
        {
          type: 'sprout_planted',
          timestamp: '2026-02-20T10:00:00Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          title: 'Test',
          season: '1m',
          environment: 'fertile',
          soilCost: 3,
          client_id: 'different-client',
        },
      ] as any)

      const onEvent = vi.fn()
      subscribeToRealtime(onEvent)

      realtimeCallback({
        new: {
          type: 'sprout_watered',
          client_id: 'new-client-id',
          user_id: 'user-1',
          created_at: '2026-02-20T10:00:00Z',
          payload: {},
          client_timestamp: '2026-02-20T10:00:00Z',
        },
      })

      expect(appendEventsMock).not.toHaveBeenCalled()
    })

    it('applies new event via appendEvents when not a duplicate', () => {
      const localEvent = {
        type: 'sprout_watered',
        timestamp: '2026-02-20T12:00:00Z',
        sproutId: 'sprout-1',
        content: 'New entry',
        client_id: 'new-client-id',
      }

      syncToLocalEventMock.mockReturnValue(localEvent as any)
      getEventsMock.mockReturnValue([])

      const onEvent = vi.fn()
      subscribeToRealtime(onEvent)

      realtimeCallback({
        new: {
          type: 'sprout_watered',
          client_id: 'new-client-id',
          user_id: 'user-1',
          created_at: '2026-02-20T12:00:00Z',
          payload: {},
          client_timestamp: '2026-02-20T12:00:00Z',
        },
      })

      // appendEvents is called directly in the callback (not gated by onRealtimeEvent)
      expect(appendEventsMock).toHaveBeenCalledWith([localEvent])
    })

    it('skips when syncToLocalEvent returns null', () => {
      syncToLocalEventMock.mockReturnValue(null)

      const onEvent = vi.fn()
      subscribeToRealtime(onEvent)

      realtimeCallback({
        new: {
          type: 'sprout_watered',
          client_id: 'some-client',
          user_id: 'user-1',
          created_at: '2026-02-20T10:00:00Z',
          payload: {},
          client_timestamp: '2026-02-20T10:00:00Z',
        },
      })

      expect(appendEventsMock).not.toHaveBeenCalled()
    })
  })

  describe('unsubscribeFromRealtime', () => {
    it('removes channel and nullifies callback', () => {
      const onEvent = vi.fn()
      subscribeToRealtime(onEvent)

      // Clear any calls from the internal unsubscribe during subscribe
      mockSupabaseObj.removeChannel.mockClear()

      unsubscribeFromRealtime()

      expect(mockSupabaseObj.removeChannel).toHaveBeenCalled()
    })

    it('does nothing when no channel exists', () => {
      // Clear any calls from afterEach cleanup of prior test
      mockSupabaseObj.removeChannel.mockClear()

      unsubscribeFromRealtime()

      expect(mockSupabaseObj.removeChannel).not.toHaveBeenCalled()
    })
  })

  describe('isValidSyncEventShape', () => {
    // isValidSyncEventShape is not exported, but we test it indirectly
    // through the realtime callback which calls it on payload.new

    it('accepts a valid sync event shape', () => {
      const localEvent = {
        type: 'sprout_planted',
        timestamp: '2026-02-20T10:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '1m',
        environment: 'fertile',
        soilCost: 3,
        client_id: 'valid-client',
      }

      syncToLocalEventMock.mockReturnValue(localEvent as any)
      getEventsMock.mockReturnValue([])

      const onEvent = vi.fn()
      subscribeToRealtime(onEvent)

      realtimeCallback({
        new: {
          type: 'sprout_planted',
          client_id: 'valid-client',
          user_id: 'user-1',
          created_at: '2026-02-20T10:00:00Z',
          payload: {},
          client_timestamp: '2026-02-20T10:00:00Z',
        },
      })

      // syncToLocalEvent should have been called because shape is valid
      expect(syncToLocalEventMock).toHaveBeenCalled()
    })

    it('rejects null payload', () => {
      const onEvent = vi.fn()
      subscribeToRealtime(onEvent)

      realtimeCallback({ new: null })

      expect(syncToLocalEventMock).not.toHaveBeenCalled()
      expect(appendEventsMock).not.toHaveBeenCalled()
    })

    it('rejects non-object payload', () => {
      const onEvent = vi.fn()
      subscribeToRealtime(onEvent)

      realtimeCallback({ new: 'not-an-object' })

      expect(syncToLocalEventMock).not.toHaveBeenCalled()
    })

    it('rejects payload missing type field', () => {
      const onEvent = vi.fn()
      subscribeToRealtime(onEvent)

      realtimeCallback({
        new: {
          client_id: 'c1',
          user_id: 'u1',
          created_at: '2026-02-20T10:00:00Z',
        },
      })

      expect(syncToLocalEventMock).not.toHaveBeenCalled()
    })

    it('rejects payload missing client_id field', () => {
      const onEvent = vi.fn()
      subscribeToRealtime(onEvent)

      realtimeCallback({
        new: {
          type: 'sprout_watered',
          user_id: 'u1',
          created_at: '2026-02-20T10:00:00Z',
        },
      })

      expect(syncToLocalEventMock).not.toHaveBeenCalled()
    })

    it('rejects payload missing user_id field', () => {
      const onEvent = vi.fn()
      subscribeToRealtime(onEvent)

      realtimeCallback({
        new: {
          type: 'sprout_watered',
          client_id: 'c1',
          created_at: '2026-02-20T10:00:00Z',
        },
      })

      expect(syncToLocalEventMock).not.toHaveBeenCalled()
    })

    it('rejects payload missing created_at field', () => {
      const onEvent = vi.fn()
      subscribeToRealtime(onEvent)

      realtimeCallback({
        new: {
          type: 'sprout_watered',
          client_id: 'c1',
          user_id: 'u1',
        },
      })

      expect(syncToLocalEventMock).not.toHaveBeenCalled()
    })
  })
})
