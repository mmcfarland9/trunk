/**
 * Tests for services/sync/cache.ts
 * Tests cache version management, validity checks, and sync failure invalidation.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  isCacheValid,
  setCacheVersion,
  clearCacheVersion,
  invalidateOnSyncFailure,
  CACHE_VERSION,
  CACHE_VERSION_KEY,
} from '../services/sync/cache'

describe('sync cache', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('isCacheValid', () => {
    it('returns false when no version is set', () => {
      expect(isCacheValid()).toBe(false)
    })

    it('returns true after setCacheVersion is called', () => {
      setCacheVersion()
      expect(isCacheValid()).toBe(true)
    })

    it('returns false after clearCacheVersion is called', () => {
      setCacheVersion()
      expect(isCacheValid()).toBe(true)

      clearCacheVersion()
      expect(isCacheValid()).toBe(false)
    })

    it('returns false when stored version does not match current', () => {
      localStorage.setItem(CACHE_VERSION_KEY, '999')
      expect(isCacheValid()).toBe(false)
    })

    it('returns true when stored version matches current', () => {
      localStorage.setItem(CACHE_VERSION_KEY, String(CACHE_VERSION))
      expect(isCacheValid()).toBe(true)
    })
  })

  describe('setCacheVersion', () => {
    it('stores the current version as a string', () => {
      setCacheVersion()
      expect(localStorage.getItem(CACHE_VERSION_KEY)).toBe(String(CACHE_VERSION))
    })

    it('overwrites a previous version', () => {
      localStorage.setItem(CACHE_VERSION_KEY, '0')
      setCacheVersion()
      expect(localStorage.getItem(CACHE_VERSION_KEY)).toBe(String(CACHE_VERSION))
    })
  })

  describe('clearCacheVersion', () => {
    it('removes the cache version key from localStorage', () => {
      setCacheVersion()
      expect(localStorage.getItem(CACHE_VERSION_KEY)).not.toBeNull()

      clearCacheVersion()
      expect(localStorage.getItem(CACHE_VERSION_KEY)).toBeNull()
    })

    it('is a no-op when key does not exist', () => {
      expect(() => clearCacheVersion()).not.toThrow()
      expect(localStorage.getItem(CACHE_VERSION_KEY)).toBeNull()
    })
  })

  describe('invalidateOnSyncFailure', () => {
    it('clears the cache version (same as clearCacheVersion)', () => {
      setCacheVersion()
      expect(isCacheValid()).toBe(true)

      invalidateOnSyncFailure()
      expect(isCacheValid()).toBe(false)
      expect(localStorage.getItem(CACHE_VERSION_KEY)).toBeNull()
    })

    it('is safe to call when no version is set', () => {
      expect(() => invalidateOnSyncFailure()).not.toThrow()
    })
  })

  describe('localStorage key format', () => {
    it('uses the expected key name', () => {
      expect(CACHE_VERSION_KEY).toBe('trunk-cache-version')
    })

    it('stores under the correct key', () => {
      setCacheVersion()
      const stored = localStorage.getItem('trunk-cache-version')
      expect(stored).toBe(String(CACHE_VERSION))
    })
  })
})
