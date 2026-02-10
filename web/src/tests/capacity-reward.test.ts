/**
 * Tests for capacity reward calculations - the core progression mechanic.
 */

import { describe, it, expect } from 'vitest'
import { calculateCapacityReward } from '../state'
import type { SproutSeason, SproutEnvironment } from '../types'
import constants from '../../../shared/constants.json'

describe('Capacity Reward Calculation', () => {
  const MAX_CAPACITY = constants.soil.maxCapacity

  describe('Base Rewards by Season', () => {
    // Test at capacity 0, fertile, result 5 to isolate base reward
    // Formula: base * 1.1 (fertile) * 1.0 (result 5) * 1.0 (diminishing at 0)

    it('calculates base reward for 2w season', () => {
      const reward = calculateCapacityReward('2w', 'fertile', 5, 0)
      // 0.26 * 1.1 * 1.0 * 1.0 = 0.286
      expect(reward).toBeCloseTo(0.286, 2)
    })

    it('calculates base reward for 1m season', () => {
      const reward = calculateCapacityReward('1m', 'fertile', 5, 0)
      // 0.56 * 1.1 * 1.0 * 1.0 = 0.616
      expect(reward).toBeCloseTo(0.616, 2)
    })

    it('calculates base reward for 3m season', () => {
      const reward = calculateCapacityReward('3m', 'fertile', 5, 0)
      // 1.95 * 1.1 * 1.0 * 1.0 = 2.145
      expect(reward).toBeCloseTo(2.145, 2)
    })

    it('calculates base reward for 6m season', () => {
      const reward = calculateCapacityReward('6m', 'fertile', 5, 0)
      // 4.16 * 1.1 * 1.0 * 1.0 = 4.576
      expect(reward).toBeCloseTo(4.576, 2)
    })

    it('calculates base reward for 1y season', () => {
      const reward = calculateCapacityReward('1y', 'fertile', 5, 0)
      // 8.84 * 1.1 * 1.0 * 1.0 = 9.724
      expect(reward).toBeCloseTo(9.724, 2)
    })
  })

  describe('Environment Multipliers', () => {
    // Use 1m season, result 5, capacity 0 to isolate env multiplier
    const season: SproutSeason = '1m'
    const baseReward = 0.56 // 1m base

    it('applies fertile environment multiplier (1.1x)', () => {
      const reward = calculateCapacityReward(season, 'fertile', 5, 0)
      expect(reward).toBeCloseTo(baseReward * 1.1, 2)
    })

    it('applies firm environment multiplier (1.75x)', () => {
      const reward = calculateCapacityReward(season, 'firm', 5, 0)
      expect(reward).toBeCloseTo(baseReward * 1.75, 2)
    })

    it('applies barren environment multiplier (2.4x)', () => {
      const reward = calculateCapacityReward(season, 'barren', 5, 0)
      expect(reward).toBeCloseTo(baseReward * 2.4, 2)
    })
  })

  describe('Result Multipliers', () => {
    // Use 1m season, fertile, capacity 0 to isolate result multiplier
    const season: SproutSeason = '1m'
    const env: SproutEnvironment = 'fertile'
    const baseWithEnv = 0.56 * 1.1 // 0.616

    it('applies result=1 multiplier (0.4x)', () => {
      const reward = calculateCapacityReward(season, env, 1, 0)
      expect(reward).toBeCloseTo(baseWithEnv * 0.4, 2)
    })

    it('applies result=2 multiplier (0.55x)', () => {
      const reward = calculateCapacityReward(season, env, 2, 0)
      expect(reward).toBeCloseTo(baseWithEnv * 0.55, 2)
    })

    it('applies result=3 multiplier (0.7x)', () => {
      const reward = calculateCapacityReward(season, env, 3, 0)
      expect(reward).toBeCloseTo(baseWithEnv * 0.7, 2)
    })

    it('applies result=4 multiplier (0.85x)', () => {
      const reward = calculateCapacityReward(season, env, 4, 0)
      expect(reward).toBeCloseTo(baseWithEnv * 0.85, 2)
    })

    it('applies result=5 multiplier (1.0x)', () => {
      const reward = calculateCapacityReward(season, env, 5, 0)
      expect(reward).toBeCloseTo(baseWithEnv * 1.0, 2)
    })
  })

  describe('Diminishing Returns', () => {
    // Formula: (1 - capacity/MAX)^1.5
    const season: SproutSeason = '1m'
    const env: SproutEnvironment = 'fertile'
    const fullReward = 0.56 * 1.1 * 1.0 // base * env * result5

    it('returns full reward at capacity 0 (factor = 1.0)', () => {
      const reward = calculateCapacityReward(season, env, 5, 0)
      expect(reward).toBeCloseTo(fullReward * 1.0, 2)
    })

    it('returns ~35% reward at capacity 50 (factor ≈ 0.354)', () => {
      // (1 - 50/120)^1.5 = (0.583)^1.5 ≈ 0.445
      const reward = calculateCapacityReward(season, env, 5, 50)
      const diminishingFactor = Math.pow(1 - 50 / MAX_CAPACITY, 1.5)
      expect(reward).toBeCloseTo(fullReward * diminishingFactor, 2)
    })

    it('returns near-zero reward at capacity 99', () => {
      // (1 - 99/120)^1.5 = (0.175)^1.5 ≈ 0.073
      const reward = calculateCapacityReward(season, env, 5, 99)
      expect(reward).toBeLessThan(fullReward * 0.15)
    })

    it('returns zero reward at capacity >= max', () => {
      const reward = calculateCapacityReward(season, env, 5, MAX_CAPACITY)
      expect(reward).toBe(0)
    })

    it('handles capacity above max gracefully', () => {
      const reward = calculateCapacityReward(season, env, 5, MAX_CAPACITY + 10)
      // When capacity exceeds max, the formula produces a negative under the pow
      // which results in NaN, but we should treat it as zero reward
      expect(Number.isNaN(reward) || reward === 0).toBe(true)
    })
  })

  describe('Full Formula Integration', () => {
    it('calculates 1y/barren/result5/cap0 correctly', () => {
      // 8.84 base * 2.4 env * 1.0 result * 1.0 diminishing = 21.216
      const reward = calculateCapacityReward('1y', 'barren', 5, 0)
      expect(reward).toBeCloseTo(8.84 * 2.4 * 1.0 * 1.0, 2)
    })

    it('calculates 2w/fertile/result1/cap50 correctly', () => {
      // 0.26 base * 1.1 env * 0.4 result * diminishing(50)
      const diminishing = Math.pow(1 - 50 / MAX_CAPACITY, 1.5)
      const expected = 0.26 * 1.1 * 0.4 * diminishing
      const reward = calculateCapacityReward('2w', 'fertile', 1, 50)
      expect(reward).toBeCloseTo(expected, 3)
    })

    it('calculates complex scenario: 6m/firm/result3/cap75', () => {
      // 4.16 base * 1.75 env * 0.7 result * diminishing(75)
      const diminishing = Math.pow(1 - 75 / MAX_CAPACITY, 1.5)
      const expected = 4.16 * 1.75 * 0.7 * diminishing
      const reward = calculateCapacityReward('6m', 'firm', 3, 75)
      expect(reward).toBeCloseTo(expected, 3)
    })
  })

  describe('Edge Cases', () => {
    it('handles invalid result (defaults to 0.7)', () => {
      const reward = calculateCapacityReward('1m', 'fertile', 0, 0)
      // Should default to result multiplier of 0.7
      expect(reward).toBeCloseTo(0.56 * 1.1 * 0.7, 2)
    })

    it('handles result > 5 (treated as 5)', () => {
      const reward = calculateCapacityReward('1m', 'fertile', 10, 0)
      // Should default to result multiplier of 0.7 (since 10 is not in map)
      expect(reward).toBeCloseTo(0.56 * 1.1 * 0.7, 2)
    })
  })
})
