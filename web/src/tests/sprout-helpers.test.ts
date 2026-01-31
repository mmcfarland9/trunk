/**
 * Tests for sprout and leaf helper functions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  generateSproutId,
  generateLeafId,
  getSproutsByState,
  getActiveSprouts,
  getHistorySprouts,
  getSproutsByLeaf,
} from '../state'
import type { Sprout } from '../types'

describe('ID Generation', () => {
  describe('generateSproutId', () => {
    it('creates unique IDs', () => {
      const ids = new Set<string>()
      for (let i = 0; i < 1000; i++) {
        ids.add(generateSproutId())
      }
      expect(ids.size).toBe(1000)
    })

    it('includes sprout prefix', () => {
      const id = generateSproutId()
      expect(id).toMatch(/^sprout-/)
    })

    it('includes timestamp component', () => {
      const before = Date.now()
      const id = generateSproutId()
      const after = Date.now()

      // Extract timestamp from ID (format: sprout-{timestamp}-{random})
      const parts = id.split('-')
      const timestamp = parseInt(parts[1], 10)

      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
    })

    it('includes random component', () => {
      const id1 = generateSproutId()
      const id2 = generateSproutId()

      // Even with same timestamp, random part should differ
      const random1 = id1.split('-')[2]
      const random2 = id2.split('-')[2]

      // They could theoretically be the same, but it's extremely unlikely
      // Just check they're both present and have expected length
      expect(random1).toBeDefined()
      expect(random1.length).toBeGreaterThan(0)
    })
  })

  describe('generateLeafId', () => {
    it('creates unique IDs', () => {
      const ids = new Set<string>()
      for (let i = 0; i < 1000; i++) {
        ids.add(generateLeafId())
      }
      expect(ids.size).toBe(1000)
    })

    it('includes leaf prefix', () => {
      const id = generateLeafId()
      expect(id).toMatch(/^leaf-/)
    })

    it('includes timestamp component', () => {
      const before = Date.now()
      const id = generateLeafId()
      const after = Date.now()

      const parts = id.split('-')
      const timestamp = parseInt(parts[1], 10)

      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
    })
  })
})

describe('Sprout State Filtering', () => {
  const baseSprout: Omit<Sprout, 'id' | 'state'> = {
    title: 'Test Sprout',
    season: '1m',
    environment: 'fertile',
    soilCost: 3,
    createdAt: new Date().toISOString(),
  }

  const sprouts: Sprout[] = [
    { ...baseSprout, id: '1', state: 'active' },
    { ...baseSprout, id: '2', state: 'active' },
    { ...baseSprout, id: '3', state: 'completed', result: 4 },
    { ...baseSprout, id: '4', state: 'completed', result: 2 },
    { ...baseSprout, id: '5', state: 'completed', result: 5 },
  ]

  describe('getSproutsByState', () => {
    it('filters by active state', () => {
      const active = getSproutsByState(sprouts, 'active')
      expect(active.length).toBe(2)
      expect(active.every(s => s.state === 'active')).toBe(true)
    })

    it('filters by completed state', () => {
      const completed = getSproutsByState(sprouts, 'completed')
      expect(completed.length).toBe(3)
      expect(completed.every(s => s.state === 'completed')).toBe(true)
    })

    it('returns empty array when no matches', () => {
      const activeOnly: Sprout[] = [
        { ...baseSprout, id: '1', state: 'active' },
      ]
      const completed = getSproutsByState(activeOnly, 'completed')
      expect(completed.length).toBe(0)
    })

    it('returns empty array for empty input', () => {
      const result = getSproutsByState([], 'active')
      expect(result.length).toBe(0)
    })
  })

  describe('getActiveSprouts', () => {
    it('returns only active sprouts', () => {
      const active = getActiveSprouts(sprouts)
      expect(active.length).toBe(2)
      expect(active.every(s => s.state === 'active')).toBe(true)
    })

    it('returns empty array when no active sprouts', () => {
      const completedOnly: Sprout[] = [
        { ...baseSprout, id: '1', state: 'completed', result: 3 },
      ]
      const active = getActiveSprouts(completedOnly)
      expect(active.length).toBe(0)
    })
  })

  describe('getHistorySprouts', () => {
    it('returns only completed sprouts', () => {
      const history = getHistorySprouts(sprouts)
      expect(history.length).toBe(3)
      expect(history.every(s => s.state === 'completed')).toBe(true)
    })

    it('returns empty array when no completed sprouts', () => {
      const activeOnly: Sprout[] = [
        { ...baseSprout, id: '1', state: 'active' },
      ]
      const history = getHistorySprouts(activeOnly)
      expect(history.length).toBe(0)
    })
  })

  describe('Combined filtering', () => {
    it('active and history correctly partition all sprouts', () => {
      const active = getActiveSprouts(sprouts)
      const history = getHistorySprouts(sprouts)

      expect(active.length + history.length).toBe(sprouts.length)
    })

    it('no sprout appears in both active and history', () => {
      const active = getActiveSprouts(sprouts)
      const history = getHistorySprouts(sprouts)

      const activeIds = new Set(active.map(s => s.id))
      const historyIds = new Set(history.map(s => s.id))

      for (const id of activeIds) {
        expect(historyIds.has(id)).toBe(false)
      }
    })
  })
})

describe('Leaf Filtering', () => {
  const baseSprout: Omit<Sprout, 'id' | 'state' | 'leafId'> = {
    title: 'Test Sprout',
    season: '1m',
    environment: 'fertile',
    soilCost: 3,
    createdAt: new Date().toISOString(),
  }

  describe('getSproutsByLeaf', () => {
    it('filters sprouts by leafId', () => {
      const sprouts: Sprout[] = [
        { ...baseSprout, id: '1', state: 'active', leafId: 'leaf-1' },
        { ...baseSprout, id: '2', state: 'active', leafId: 'leaf-1' },
        { ...baseSprout, id: '3', state: 'active', leafId: 'leaf-2' },
        { ...baseSprout, id: '4', state: 'active' }, // No leafId
      ]

      const leaf1Sprouts = getSproutsByLeaf(sprouts, 'leaf-1')

      expect(leaf1Sprouts.length).toBe(2)
      expect(leaf1Sprouts.every(s => s.leafId === 'leaf-1')).toBe(true)
    })

    it('returns empty array when no matches', () => {
      const sprouts: Sprout[] = [
        { ...baseSprout, id: '1', state: 'active', leafId: 'leaf-1' },
      ]

      const result = getSproutsByLeaf(sprouts, 'leaf-nonexistent')

      expect(result.length).toBe(0)
    })

    it('does not include sprouts without leafId', () => {
      const sprouts: Sprout[] = [
        { ...baseSprout, id: '1', state: 'active' }, // No leafId
        { ...baseSprout, id: '2', state: 'active', leafId: undefined },
      ]

      const result = getSproutsByLeaf(sprouts, 'leaf-1')

      expect(result.length).toBe(0)
    })

    it('handles empty input array', () => {
      const result = getSproutsByLeaf([], 'leaf-1')
      expect(result.length).toBe(0)
    })
  })
})
