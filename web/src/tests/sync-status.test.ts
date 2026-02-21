/**
 * Tests for services/sync/status.ts
 * Tests detailed sync status derivation, failure tracking, and metadata subscriptions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../services/sync/pending-uploads', () => ({
  getPendingCount: vi.fn(() => 0),
}))

describe('sync status', () => {
  let getPendingCountMock: ReturnType<typeof vi.fn>

  // Fresh module imports per group to reset module-level state
  async function freshImport() {
    vi.resetModules()
    // Re-apply the mock after resetModules
    vi.doMock('../services/sync/pending-uploads', () => ({
      getPendingCount: getPendingCountMock,
    }))
    const status = await import('../services/sync/status')
    return status
  }

  beforeEach(() => {
    getPendingCountMock = vi.fn(() => 0)
  })

  describe('getDetailedSyncStatus', () => {
    it('returns syncing when currentStatus is syncing', async () => {
      const { setStatusDependencies, getDetailedSyncStatus } = await freshImport()
      setStatusDependencies(
        () => 'syncing',
        () => null,
      )
      expect(getDetailedSyncStatus()).toBe('syncing')
    })

    it('returns offline when currentStatus is error', async () => {
      const { setStatusDependencies, getDetailedSyncStatus } = await freshImport()
      setStatusDependencies(
        () => 'error',
        () => null,
      )
      expect(getDetailedSyncStatus()).toBe('offline')
    })

    it('returns pendingUpload when pending count > 0', async () => {
      getPendingCountMock.mockReturnValue(3)
      const { setStatusDependencies, getDetailedSyncStatus } = await freshImport()
      setStatusDependencies(
        () => 'success',
        () => null,
      )
      expect(getDetailedSyncStatus()).toBe('pendingUpload')
    })

    it('returns synced when status is success', async () => {
      const { setStatusDependencies, getDetailedSyncStatus } = await freshImport()
      setStatusDependencies(
        () => 'success',
        () => null,
      )
      expect(getDetailedSyncStatus()).toBe('synced')
    })

    it('returns synced when status is idle', async () => {
      const { setStatusDependencies, getDetailedSyncStatus } = await freshImport()
      setStatusDependencies(
        () => 'idle',
        () => null,
      )
      expect(getDetailedSyncStatus()).toBe('synced')
    })

    it('returns loading for unknown status values', async () => {
      const { setStatusDependencies, getDetailedSyncStatus } = await freshImport()
      setStatusDependencies(
        () => 'initializing',
        () => null,
      )
      expect(getDetailedSyncStatus()).toBe('loading')
    })

    it('returns synced by default (idle) when no dependencies are set', async () => {
      const { getDetailedSyncStatus } = await freshImport()
      // Default getCurrentSyncStatus returns 'idle'
      expect(getDetailedSyncStatus()).toBe('synced')
    })

    it('syncing takes precedence over pending uploads', async () => {
      getPendingCountMock.mockReturnValue(5)
      const { setStatusDependencies, getDetailedSyncStatus } = await freshImport()
      setStatusDependencies(
        () => 'syncing',
        () => null,
      )
      // syncing is checked before pending count
      expect(getDetailedSyncStatus()).toBe('syncing')
    })

    it('error takes precedence over pending uploads', async () => {
      getPendingCountMock.mockReturnValue(5)
      const { setStatusDependencies, getDetailedSyncStatus } = await freshImport()
      setStatusDependencies(
        () => 'error',
        () => null,
      )
      // error is checked before pending count
      expect(getDetailedSyncStatus()).toBe('offline')
    })
  })

  describe('setStatusDependencies', () => {
    it('allows injecting custom status getter', async () => {
      const { setStatusDependencies, getDetailedSyncStatus } = await freshImport()

      setStatusDependencies(
        () => 'syncing',
        () => null,
      )
      expect(getDetailedSyncStatus()).toBe('syncing')

      setStatusDependencies(
        () => 'error',
        () => null,
      )
      expect(getDetailedSyncStatus()).toBe('offline')
    })

    it('allows injecting custom timestamp getter used in metadata', async () => {
      const { setStatusDependencies, subscribeSyncMetadata } = await freshImport()
      const ts = '2026-02-15T10:00:00Z'
      setStatusDependencies(
        () => 'idle',
        () => ts,
      )

      let receivedMeta: any = null
      subscribeSyncMetadata((meta) => {
        receivedMeta = meta
      })

      expect(receivedMeta.lastConfirmedTimestamp).toBe(ts)
    })
  })

  describe('recordSyncFailure', () => {
    it('increments consecutiveFailures and sets error and timestamp', async () => {
      const { recordSyncFailure, subscribeSyncMetadata } = await freshImport()

      recordSyncFailure('connection timeout')

      let receivedMeta: any = null
      subscribeSyncMetadata((meta) => {
        receivedMeta = meta
      })

      expect(receivedMeta.consecutiveFailures).toBe(1)
      expect(receivedMeta.lastError).toBe('connection timeout')
      expect(receivedMeta.lastFailureAt).not.toBeNull()
    })

    it('increments consecutiveFailures on each call', async () => {
      const { recordSyncFailure, subscribeSyncMetadata } = await freshImport()

      recordSyncFailure('error 1')
      recordSyncFailure('error 2')
      recordSyncFailure('error 3')

      let receivedMeta: any = null
      subscribeSyncMetadata((meta) => {
        receivedMeta = meta
      })

      expect(receivedMeta.consecutiveFailures).toBe(3)
      expect(receivedMeta.lastError).toBe('error 3')
    })

    it('notifies listeners on each failure', async () => {
      const { recordSyncFailure, subscribeSyncMetadata } = await freshImport()

      const calls: any[] = []
      subscribeSyncMetadata((meta) => {
        calls.push({ ...meta })
      })

      // Initial call from subscribe
      expect(calls.length).toBe(1)
      expect(calls[0].consecutiveFailures).toBe(0)

      recordSyncFailure('first failure')
      expect(calls.length).toBe(2)
      expect(calls[1].consecutiveFailures).toBe(1)
      expect(calls[1].lastError).toBe('first failure')

      recordSyncFailure('second failure')
      expect(calls.length).toBe(3)
      expect(calls[2].consecutiveFailures).toBe(2)
      expect(calls[2].lastError).toBe('second failure')
    })

    it('sets lastFailureAt to an ISO timestamp', async () => {
      const { recordSyncFailure, subscribeSyncMetadata } = await freshImport()

      const before = new Date().toISOString()
      recordSyncFailure('test error')
      const after = new Date().toISOString()

      let receivedMeta: any = null
      subscribeSyncMetadata((meta) => {
        receivedMeta = meta
      })

      expect(receivedMeta.lastFailureAt).not.toBeNull()
      // Timestamp should be between before and after
      expect(receivedMeta.lastFailureAt >= before).toBe(true)
      expect(receivedMeta.lastFailureAt <= after).toBe(true)
    })
  })

  describe('resetSyncFailures', () => {
    it('clears error state and resets counter', async () => {
      const { recordSyncFailure, resetSyncFailures, subscribeSyncMetadata } = await freshImport()

      recordSyncFailure('some error')
      recordSyncFailure('another error')
      resetSyncFailures()

      let receivedMeta: any = null
      subscribeSyncMetadata((meta) => {
        receivedMeta = meta
      })

      expect(receivedMeta.consecutiveFailures).toBe(0)
      expect(receivedMeta.lastError).toBeNull()
      expect(receivedMeta.lastFailureAt).toBeNull()
    })

    it('does nothing when already at 0 failures (no notification)', async () => {
      const { resetSyncFailures, subscribeSyncMetadata } = await freshImport()

      const calls: any[] = []
      subscribeSyncMetadata((meta) => {
        calls.push({ ...meta })
      })

      // Initial call from subscribe
      expect(calls.length).toBe(1)

      // Reset when already at 0 - should not notify
      resetSyncFailures()
      expect(calls.length).toBe(1) // No additional notification
    })

    it('notifies listeners when resetting from non-zero state', async () => {
      const { recordSyncFailure, resetSyncFailures, subscribeSyncMetadata } = await freshImport()

      const calls: any[] = []
      subscribeSyncMetadata((meta) => {
        calls.push({ ...meta })
      })

      // Initial
      expect(calls.length).toBe(1)

      recordSyncFailure('error')
      expect(calls.length).toBe(2)

      resetSyncFailures()
      expect(calls.length).toBe(3)
      expect(calls[2].consecutiveFailures).toBe(0)
      expect(calls[2].lastError).toBeNull()
    })
  })

  describe('subscribeSyncMetadata', () => {
    it('calls listener immediately with current state', async () => {
      const { subscribeSyncMetadata } = await freshImport()

      let receivedMeta: any = null
      subscribeSyncMetadata((meta) => {
        receivedMeta = meta
      })

      expect(receivedMeta).not.toBeNull()
      expect(receivedMeta.status).toBe('synced') // default idle -> synced
      expect(receivedMeta.lastConfirmedTimestamp).toBeNull()
      expect(receivedMeta.pendingCount).toBe(0)
      expect(receivedMeta.lastError).toBeNull()
      expect(receivedMeta.consecutiveFailures).toBe(0)
      expect(receivedMeta.lastFailureAt).toBeNull()
    })

    it('returns unsubscribe function that removes listener', async () => {
      const { subscribeSyncMetadata, recordSyncFailure } = await freshImport()

      const calls: any[] = []
      const unsubscribe = subscribeSyncMetadata((meta) => {
        calls.push(meta)
      })

      // Initial call
      expect(calls.length).toBe(1)

      unsubscribe()

      // Should not receive further notifications
      recordSyncFailure('after unsubscribe')
      expect(calls.length).toBe(1) // Still 1
    })

    it('reflects injected dependencies in immediate callback', async () => {
      getPendingCountMock.mockReturnValue(2)
      const { setStatusDependencies, subscribeSyncMetadata } = await freshImport()
      setStatusDependencies(
        () => 'success',
        () => '2026-02-15T12:00:00Z',
      )

      let receivedMeta: any = null
      subscribeSyncMetadata((meta) => {
        receivedMeta = meta
      })

      // pendingUpload because pending > 0, even though status is success
      expect(receivedMeta.status).toBe('pendingUpload')
      expect(receivedMeta.lastConfirmedTimestamp).toBe('2026-02-15T12:00:00Z')
      expect(receivedMeta.pendingCount).toBe(2)
    })
  })

  describe('notifyMetadataListeners', () => {
    it('broadcasts to all listeners', async () => {
      const { subscribeSyncMetadata, notifyMetadataListeners } = await freshImport()

      const calls1: any[] = []
      const calls2: any[] = []
      subscribeSyncMetadata((meta) => calls1.push({ ...meta }))
      subscribeSyncMetadata((meta) => calls2.push({ ...meta }))

      // Each got initial call
      expect(calls1.length).toBe(1)
      expect(calls2.length).toBe(1)

      notifyMetadataListeners()

      expect(calls1.length).toBe(2)
      expect(calls2.length).toBe(2)
    })

    it('broadcasts current metadata state', async () => {
      const { setStatusDependencies, subscribeSyncMetadata, notifyMetadataListeners } =
        await freshImport()

      setStatusDependencies(
        () => 'syncing',
        () => '2026-02-15T08:00:00Z',
      )

      const calls: any[] = []
      subscribeSyncMetadata((meta) => calls.push({ ...meta }))

      // Initial state
      expect(calls[0].status).toBe('syncing')

      // Change status then notify
      setStatusDependencies(
        () => 'success',
        () => '2026-02-15T09:00:00Z',
      )
      notifyMetadataListeners()

      expect(calls.length).toBe(2)
      expect(calls[1].status).toBe('synced')
      expect(calls[1].lastConfirmedTimestamp).toBe('2026-02-15T09:00:00Z')
    })

    it('does nothing with no listeners', async () => {
      const { notifyMetadataListeners } = await freshImport()
      // Should not throw
      expect(() => notifyMetadataListeners()).not.toThrow()
    })
  })

  describe('multiple listeners', () => {
    it('all receive notifications and unsubscribe only removes one', async () => {
      const { subscribeSyncMetadata, recordSyncFailure } = await freshImport()

      const calls1: any[] = []
      const calls2: any[] = []
      const calls3: any[] = []

      const unsub1 = subscribeSyncMetadata((meta) => calls1.push({ ...meta }))
      subscribeSyncMetadata((meta) => calls2.push({ ...meta }))
      subscribeSyncMetadata((meta) => calls3.push({ ...meta }))

      // Each got initial call
      expect(calls1.length).toBe(1)
      expect(calls2.length).toBe(1)
      expect(calls3.length).toBe(1)

      // All receive a notification
      recordSyncFailure('test error')
      expect(calls1.length).toBe(2)
      expect(calls2.length).toBe(2)
      expect(calls3.length).toBe(2)

      // Unsubscribe only listener 1
      unsub1()

      recordSyncFailure('another error')
      expect(calls1.length).toBe(2) // No longer receiving
      expect(calls2.length).toBe(3) // Still receiving
      expect(calls3.length).toBe(3) // Still receiving
    })

    it('double unsubscribe is safe (no-op)', async () => {
      const { subscribeSyncMetadata, recordSyncFailure } = await freshImport()

      const calls: any[] = []
      const unsubscribe = subscribeSyncMetadata((meta) => calls.push(meta))

      unsubscribe()
      unsubscribe() // Should not throw or corrupt

      recordSyncFailure('test')
      expect(calls.length).toBe(1) // Only initial call
    })
  })
})
