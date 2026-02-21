/**
 * Tests for services/sync/pending-uploads.ts
 * Tests the pending upload ID set management, persistence, and deduplication.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('pending-uploads', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('addPendingId / getPendingCount', () => {
    it('starts at 0 and increases count when IDs are added', async () => {
      const { getPendingCount, addPendingId } = await import('../services/sync/pending-uploads')

      expect(getPendingCount()).toBe(0)

      addPendingId('id-1')
      expect(getPendingCount()).toBe(1)

      addPendingId('id-2')
      expect(getPendingCount()).toBe(2)

      addPendingId('id-3')
      expect(getPendingCount()).toBe(3)
    })
  })

  describe('hasPendingId', () => {
    it('returns false for absent ID and true for present ID', async () => {
      const { hasPendingId, addPendingId } = await import('../services/sync/pending-uploads')

      expect(hasPendingId('id-1')).toBe(false)

      addPendingId('id-1')
      expect(hasPendingId('id-1')).toBe(true)
      expect(hasPendingId('id-2')).toBe(false)
    })
  })

  describe('removePendingId', () => {
    it('reduces count and hasPendingId returns false after removal', async () => {
      const { getPendingCount, hasPendingId, addPendingId, removePendingId } = await import(
        '../services/sync/pending-uploads'
      )

      addPendingId('id-1')
      addPendingId('id-2')
      expect(getPendingCount()).toBe(2)

      removePendingId('id-1')
      expect(getPendingCount()).toBe(1)
      expect(hasPendingId('id-1')).toBe(false)
      expect(hasPendingId('id-2')).toBe(true)
    })

    it('does nothing when removing an ID that does not exist', async () => {
      const { getPendingCount, removePendingId } = await import('../services/sync/pending-uploads')

      expect(getPendingCount()).toBe(0)
      removePendingId('nonexistent')
      expect(getPendingCount()).toBe(0)
    })
  })

  describe('getPendingIds', () => {
    it('returns array of all current IDs', async () => {
      const { getPendingIds, addPendingId } = await import('../services/sync/pending-uploads')

      expect(getPendingIds()).toEqual([])

      addPendingId('id-a')
      addPendingId('id-b')
      addPendingId('id-c')

      const ids = getPendingIds()
      expect(ids).toHaveLength(3)
      expect(ids).toContain('id-a')
      expect(ids).toContain('id-b')
      expect(ids).toContain('id-c')
    })

    it('returns a copy, not the internal set', async () => {
      const { getPendingIds, addPendingId, getPendingCount } = await import(
        '../services/sync/pending-uploads'
      )

      addPendingId('id-1')
      const ids = getPendingIds()

      // Mutating the returned array should not affect internal state
      ids.push('id-injected')
      expect(getPendingCount()).toBe(1)
    })
  })

  describe('savePendingIds', () => {
    it('writes to localStorage as JSON array', async () => {
      const { addPendingId, savePendingIds } = await import('../services/sync/pending-uploads')

      addPendingId('id-x')
      addPendingId('id-y')

      savePendingIds()

      const stored = localStorage.getItem('trunk-pending-uploads')
      expect(stored).not.toBeNull()

      const parsed = JSON.parse(stored!)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed).toHaveLength(2)
      expect(parsed).toContain('id-x')
      expect(parsed).toContain('id-y')
    })

    it('handles localStorage errors gracefully', async () => {
      const { addPendingId, savePendingIds } = await import('../services/sync/pending-uploads')

      addPendingId('id-1')

      // Temporarily make setItem throw
      const originalSetItem = localStorage.setItem
      localStorage.setItem = () => {
        throw new Error('QuotaExceededError')
      }

      // Should not throw
      expect(() => savePendingIds()).not.toThrow()

      localStorage.setItem = originalSetItem
    })
  })

  describe('loadPendingIds on module init', () => {
    it('loads existing IDs from localStorage', async () => {
      // Pre-populate localStorage before module loads
      localStorage.setItem(
        'trunk-pending-uploads',
        JSON.stringify(['saved-1', 'saved-2', 'saved-3']),
      )

      const { getPendingCount, hasPendingId, getPendingIds } = await import(
        '../services/sync/pending-uploads'
      )

      expect(getPendingCount()).toBe(3)
      expect(hasPendingId('saved-1')).toBe(true)
      expect(hasPendingId('saved-2')).toBe(true)
      expect(hasPendingId('saved-3')).toBe(true)
      expect(getPendingIds()).toContain('saved-1')
    })

    it('handles corrupt localStorage data gracefully', async () => {
      // Store invalid JSON
      localStorage.setItem('trunk-pending-uploads', '{not valid json[')

      const { getPendingCount } = await import('../services/sync/pending-uploads')

      // Should not throw, and should start with 0 pending
      expect(getPendingCount()).toBe(0)
    })

    it('handles non-array JSON in localStorage gracefully', async () => {
      // Store valid JSON that is not an array
      localStorage.setItem('trunk-pending-uploads', JSON.stringify({ id: 'not-an-array' }))

      const { getPendingCount } = await import('../services/sync/pending-uploads')

      // The code checks Array.isArray, so non-array is ignored
      expect(getPendingCount()).toBe(0)
    })

    it('handles missing localStorage key', async () => {
      // Do not set anything in localStorage
      const { getPendingCount } = await import('../services/sync/pending-uploads')

      expect(getPendingCount()).toBe(0)
    })
  })

  describe('deduplication', () => {
    it('adding same ID twice does not increase count (Set behavior)', async () => {
      const { getPendingCount, addPendingId, getPendingIds } = await import(
        '../services/sync/pending-uploads'
      )

      addPendingId('dup-id')
      expect(getPendingCount()).toBe(1)

      addPendingId('dup-id')
      expect(getPendingCount()).toBe(1)

      // Only one entry in the IDs array
      expect(getPendingIds()).toEqual(['dup-id'])
    })

    it('adding multiple unique IDs then duplicates keeps correct count', async () => {
      const { getPendingCount, addPendingId } = await import('../services/sync/pending-uploads')

      addPendingId('a')
      addPendingId('b')
      addPendingId('c')
      addPendingId('a') // duplicate
      addPendingId('b') // duplicate

      expect(getPendingCount()).toBe(3)
    })
  })
})
