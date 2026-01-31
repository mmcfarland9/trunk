/**
 * Tests for soil state management - spending, recovering, and persistence.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// We need to test these functions in isolation, so we'll mock localStorage
// and import the functions fresh each time
describe('Soil State Management', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.resetModules()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('canAffordSoil', () => {
    it('returns true when available equals cost', async () => {
      const { canAffordSoil, getSoilAvailable } = await import('../state')
      const available = getSoilAvailable()
      expect(canAffordSoil(available)).toBe(true)
    })

    it('returns true when available exceeds cost', async () => {
      const { canAffordSoil } = await import('../state')
      expect(canAffordSoil(1)).toBe(true)
    })

    it('returns false when cost exceeds available', async () => {
      const { canAffordSoil } = await import('../state')
      expect(canAffordSoil(1000)).toBe(false)
    })

    it('returns true for zero cost', async () => {
      const { canAffordSoil } = await import('../state')
      expect(canAffordSoil(0)).toBe(true)
    })
  })

  describe('spendSoil', () => {
    it('decrements available soil', async () => {
      const { spendSoil, getSoilAvailable } = await import('../state')
      const before = getSoilAvailable()
      spendSoil(3, 'test')
      const after = getSoilAvailable()
      expect(after).toBe(before - 3)
    })

    it('returns true on successful spend', async () => {
      const { spendSoil } = await import('../state')
      const result = spendSoil(1, 'test')
      expect(result).toBe(true)
    })

    it('returns false when cannot afford', async () => {
      const { spendSoil } = await import('../state')
      const result = spendSoil(1000, 'test')
      expect(result).toBe(false)
    })

    it('does not decrement when cannot afford', async () => {
      const { spendSoil, getSoilAvailable } = await import('../state')
      const before = getSoilAvailable()
      spendSoil(1000, 'test')
      const after = getSoilAvailable()
      expect(after).toBe(before)
    })

    it('persists to storage', async () => {
      const { spendSoil } = await import('../state')
      spendSoil(1, 'test')

      // Check localStorage was updated
      const stored = localStorage.getItem('trunk-resources-v1')
      expect(stored).not.toBeNull()
      const parsed = JSON.parse(stored!)
      expect(parsed.soil.available).toBeDefined()
    })
  })

  describe('recoverSoil', () => {
    it('increments available soil', async () => {
      const { recoverSoil, spendSoil, getSoilAvailable } = await import('../state')

      // First spend some to have room to recover
      spendSoil(5, 'test')
      const beforeRecover = getSoilAvailable()

      recoverSoil(2, 0, 'test')
      const afterRecover = getSoilAvailable()

      expect(afterRecover).toBe(beforeRecover + 2)
    })

    it('clamps to capacity', async () => {
      const { recoverSoil, getSoilAvailable, getSoilCapacity } = await import('../state')
      const capacity = getSoilCapacity()

      // Try to recover way more than capacity
      recoverSoil(1000, 0, 'test')
      const after = getSoilAvailable()

      expect(after).toBeLessThanOrEqual(capacity)
    })

    it('adds capacity bonus', async () => {
      const { recoverSoil, getSoilCapacity, spendSoil } = await import('../state')
      const beforeCapacity = getSoilCapacity()

      // Spend some first so there's room
      spendSoil(5, 'test')

      // Recover with capacity bonus
      recoverSoil(2, 1, 'test')
      const afterCapacity = getSoilCapacity()

      expect(afterCapacity).toBe(beforeCapacity + 1)
    })
  })

  describe('recoverPartialSoil', () => {
    it('recovers fractional amount', async () => {
      const { recoverPartialSoil, spendSoil, getSoilAvailable } = await import('../state')

      // Spend some first
      spendSoil(5, 'test')
      const before = getSoilAvailable()

      // Recover 50% of 2 = 1
      recoverPartialSoil(2, 0.5, 'test')
      const after = getSoilAvailable()

      expect(after).toBeCloseTo(before + 1, 2)
    })

    it('clamps to capacity', async () => {
      const { recoverPartialSoil, getSoilAvailable, getSoilCapacity } = await import('../state')
      const capacity = getSoilCapacity()

      recoverPartialSoil(1000, 1.0, 'test')
      const after = getSoilAvailable()

      expect(after).toBeLessThanOrEqual(capacity)
    })
  })

  describe('getSoilAvailable and getSoilCapacity', () => {
    it('returns default values on fresh state', async () => {
      const { getSoilAvailable, getSoilCapacity } = await import('../state')

      // Default capacity is 10
      expect(getSoilCapacity()).toBe(10)
      // Default available equals capacity
      expect(getSoilAvailable()).toBe(10)
    })
  })

  describe('getMaxSoilCapacity', () => {
    it('returns the maximum soil capacity constant', async () => {
      const { getMaxSoilCapacity } = await import('../state')
      expect(getMaxSoilCapacity()).toBe(120)
    })
  })

  describe('getSoilRecoveryRate', () => {
    it('returns the water recovery rate', async () => {
      const { getSoilRecoveryRate } = await import('../state')
      expect(getSoilRecoveryRate()).toBe(0.05)
    })
  })

  describe('getSunRecoveryRate', () => {
    it('returns the sun recovery rate', async () => {
      const { getSunRecoveryRate } = await import('../state')
      expect(getSunRecoveryRate()).toBe(0.35)
    })
  })
})
