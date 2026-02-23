/**
 * Edge case tests: Zero / empty state scenarios.
 * Verifies that all getters return safe defaults with no events.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  deriveState,
  deriveWaterAvailable,
  deriveSunAvailable,
  getActiveSprouts,
  getCompletedSprouts,
  getSproutsForTwig,
  getLeavesForTwig,
  getLeafById,
  getSproutsByLeaf,
  getAllWaterEntries,
  wasShoneThisWeek,
  wasSproutWateredThisWeek,
  wasSproutWateredToday,
  deriveWateringStreak,
} from '../events/derive'
import {
  initEventStore,
  getState,
  getEvents,
  getWaterAvailable,
  getSunAvailable,
  getSoilAvailable,
  getSoilCapacity,
  canAffordSoil,
  canAffordWater,
  canAffordSun,
  getWaterCapacity,
  getSunCapacity,
  getEventCount,
  exportEvents,
  clearEvents,
} from '../events/store'

describe('Edge Cases — Zero State', () => {
  describe('deriveState with empty event log', () => {
    it('returns starting soilCapacity of 10', () => {
      const state = deriveState([])
      expect(state.soilCapacity).toBe(10)
    })

    it('returns soilAvailable equal to soilCapacity', () => {
      const state = deriveState([])
      expect(state.soilAvailable).toBe(10)
      expect(state.soilAvailable).toBe(state.soilCapacity)
    })

    it('returns empty sprouts map', () => {
      const state = deriveState([])
      expect(state.sprouts.size).toBe(0)
    })

    it('returns empty leaves map', () => {
      const state = deriveState([])
      expect(state.leaves.size).toBe(0)
    })

    it('returns empty sunEntries', () => {
      const state = deriveState([])
      expect(state.sunEntries).toHaveLength(0)
    })

    it('returns empty indexes', () => {
      const state = deriveState([])
      expect(state.activeSproutsByTwig.size).toBe(0)
      expect(state.sproutsByTwig.size).toBe(0)
      expect(state.sproutsByLeaf.size).toBe(0)
      expect(state.leavesByTwig.size).toBe(0)
    })
  })

  describe('query functions with empty state', () => {
    it('getActiveSprouts returns empty array', () => {
      const state = deriveState([])
      expect(getActiveSprouts(state)).toEqual([])
    })

    it('getCompletedSprouts returns empty array', () => {
      const state = deriveState([])
      expect(getCompletedSprouts(state)).toEqual([])
    })

    it('getSproutsForTwig returns empty array for any twigId', () => {
      const state = deriveState([])
      expect(getSproutsForTwig(state, 'branch-0-twig-0')).toEqual([])
      expect(getSproutsForTwig(state, 'nonexistent')).toEqual([])
    })

    it('getLeavesForTwig returns empty array for any twigId', () => {
      const state = deriveState([])
      expect(getLeavesForTwig(state, 'branch-0-twig-0')).toEqual([])
      expect(getLeavesForTwig(state, 'nonexistent')).toEqual([])
    })

    it('getLeafById returns undefined for any leafId', () => {
      const state = deriveState([])
      expect(getLeafById(state, 'leaf-1')).toBeUndefined()
      expect(getLeafById(state, '')).toBeUndefined()
    })

    it('getSproutsByLeaf returns empty array for any leafId', () => {
      const state = deriveState([])
      expect(getSproutsByLeaf(state, 'leaf-1')).toEqual([])
    })

    it('getAllWaterEntries returns empty array', () => {
      const state = deriveState([])
      expect(getAllWaterEntries(state)).toEqual([])
    })

    it('getAllWaterEntries with callback returns empty array', () => {
      const state = deriveState([])
      const label = (id: string) => `Label: ${id}`
      expect(getAllWaterEntries(state, label)).toEqual([])
    })
  })

  describe('resource availability with no events', () => {
    it('deriveWaterAvailable returns full capacity (3)', () => {
      expect(deriveWaterAvailable([])).toBe(3)
    })

    it('deriveSunAvailable returns full capacity (1)', () => {
      expect(deriveSunAvailable([])).toBe(1)
    })

    it('wasShoneThisWeek returns false', () => {
      expect(wasShoneThisWeek([])).toBe(false)
    })

    it('wasSproutWateredThisWeek returns false for any sprout', () => {
      expect(wasSproutWateredThisWeek([], 'sprout-1')).toBe(false)
    })

    it('wasSproutWateredToday returns false for any sprout', () => {
      expect(wasSproutWateredToday([], 'sprout-1')).toBe(false)
    })

    it('deriveWateringStreak returns zero streak', () => {
      const streak = deriveWateringStreak([])
      expect(streak.current).toBe(0)
      expect(streak.longest).toBe(0)
    })
  })

  describe('event store with no localStorage', () => {
    beforeEach(() => {
      clearEvents()
    })

    it('initEventStore creates clean state with empty localStorage', () => {
      initEventStore()
      expect(getEvents()).toHaveLength(0)
      expect(getEventCount()).toBe(0)
    })

    it('getState returns default derived state after init', () => {
      initEventStore()
      const state = getState()
      expect(state.soilCapacity).toBe(10)
      expect(state.soilAvailable).toBe(10)
      expect(state.sprouts.size).toBe(0)
      expect(state.leaves.size).toBe(0)
    })

    it('resource getters return defaults after init', () => {
      initEventStore()
      expect(getSoilAvailable()).toBe(10)
      expect(getSoilCapacity()).toBe(10)
      expect(getWaterAvailable()).toBe(3)
      expect(getSunAvailable()).toBe(1)
      expect(getWaterCapacity()).toBe(3)
      expect(getSunCapacity()).toBe(1)
    })

    it('affordability checks are correct with no events', () => {
      initEventStore()
      expect(canAffordSoil(5)).toBe(true)
      expect(canAffordSoil(10)).toBe(true)
      expect(canAffordSoil(11)).toBe(false)
      expect(canAffordWater()).toBe(true)
      expect(canAffordSun()).toBe(true)
    })

    it('exportEvents returns empty array with no events', () => {
      initEventStore()
      expect(exportEvents()).toEqual([])
    })
  })
})
