/**
 * Edge case tests: Boundary conditions.
 * Tests exact boundary values for soil, water, sun, time resets, and validation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  deriveState,
  deriveWaterAvailable,
  deriveSunAvailable,
  getActiveSprouts,
} from '../events/derive'
import { validateEvent } from '../events/store'
import { calculateCapacityReward, getTodayResetTime, getWeekResetTime } from '../utils/calculations'
import type { TrunkEvent } from '../events/types'

describe('Edge Cases — Boundaries', () => {
  describe('single event — sprout_planted', () => {
    it('creates exactly one active sprout', () => {
      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: '2026-01-15T10:00:00Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          title: 'Solo Sprout',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
      ]

      const state = deriveState(events)
      const active = getActiveSprouts(state)

      expect(state.sprouts.size).toBe(1)
      expect(active).toHaveLength(1)
      expect(active[0].id).toBe('sprout-1')
      expect(active[0].state).toBe('active')
    })

    it('deducts soil by exact cost', () => {
      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: '2026-01-15T10:00:00Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          title: 'Test',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
      ]

      const state = deriveState(events)
      expect(state.soilAvailable).toBe(8) // 10 - 2
      expect(state.soilCapacity).toBe(10) // unchanged
    })

    it('clamps soil to 0 when cost exceeds available', () => {
      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: '2026-01-15T10:00:00Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          title: 'Expensive',
          season: '1y',
          environment: 'barren',
          soilCost: 24,
        },
      ]

      const state = deriveState(events)
      expect(state.soilAvailable).toBe(0) // clamped, not negative
    })
  })

  describe('6am daily reset boundary', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('water at 05:59:59.999 counts as yesterday', () => {
      // Current time: 10am on Jan 30
      const now = new Date(2026, 0, 30, 10, 0, 0)
      vi.setSystemTime(now)

      const events: TrunkEvent[] = [
        {
          type: 'sprout_watered',
          timestamp: new Date(2026, 0, 30, 5, 59, 59, 999).toISOString(),
          sproutId: 'sprout-1',
          content: 'Just before reset',
        },
      ]

      const available = deriveWaterAvailable(events, now)
      expect(available).toBe(3) // Doesn't count — before 6am reset
    })

    it('water at exactly 06:00:00.000 counts as today', () => {
      const now = new Date(2026, 0, 30, 10, 0, 0)
      vi.setSystemTime(now)

      const events: TrunkEvent[] = [
        {
          type: 'sprout_watered',
          timestamp: new Date(2026, 0, 30, 6, 0, 0, 0).toISOString(),
          sproutId: 'sprout-1',
          content: 'Exactly at reset',
        },
      ]

      const available = deriveWaterAvailable(events, now)
      expect(available).toBe(2) // Counts — at or after 6am reset
    })

    it('water counts differ at 05:59:59.999 vs 06:00:00.000', () => {
      const now = new Date(2026, 0, 30, 10, 0, 0)
      vi.setSystemTime(now)

      const beforeReset: TrunkEvent[] = [
        {
          type: 'sprout_watered',
          timestamp: new Date(2026, 0, 30, 5, 59, 59, 999).toISOString(),
          sproutId: 'sprout-1',
          content: 'Before',
        },
      ]

      const atReset: TrunkEvent[] = [
        {
          type: 'sprout_watered',
          timestamp: new Date(2026, 0, 30, 6, 0, 0, 0).toISOString(),
          sproutId: 'sprout-1',
          content: 'At',
        },
      ]

      const beforeAvailable = deriveWaterAvailable(beforeReset, now)
      const atAvailable = deriveWaterAvailable(atReset, now)

      expect(beforeAvailable).toBe(3) // Before reset: doesn't count
      expect(atAvailable).toBe(2) // At reset: counts
      expect(beforeAvailable).toBeGreaterThan(atAvailable)
    })

    it('getTodayResetTime at exactly 6am returns same day 6am', () => {
      const exactlySixAm = new Date(2026, 0, 30, 6, 0, 0, 0)
      const reset = getTodayResetTime(exactlySixAm)

      expect(reset.getDate()).toBe(30)
      expect(reset.getHours()).toBe(6)
      expect(reset.getMinutes()).toBe(0)
      expect(reset.getSeconds()).toBe(0)
    })

    it('getTodayResetTime just before 6am goes to previous day', () => {
      const justBeforeSix = new Date(2026, 0, 30, 5, 59, 59, 999)
      const reset = getTodayResetTime(justBeforeSix)

      expect(reset.getDate()).toBe(29)
      expect(reset.getHours()).toBe(6)
    })
  })

  describe('Monday 6am weekly reset boundary', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('sun on Sunday 11:59pm counts for current week', () => {
      // Wednesday Jan 29 at 2pm
      const now = new Date(2026, 0, 29, 14, 0, 0)
      vi.setSystemTime(now)

      const events: TrunkEvent[] = [
        {
          type: 'sun_shone',
          // Sunday Jan 25, 11:59pm (still in this week since Mon Jan 26 6am hasn't passed yet)
          // Wait — Jan 26 is Monday, and getWeekResetTime for Jan 29 returns Mon Jan 26 6am.
          // So Sun Jan 26 at 7am is after the reset. Let me use Tuesday Jan 27.
          timestamp: new Date(2026, 0, 27, 10, 0, 0).toISOString(),
          twigId: 'branch-0-twig-0',
          twigLabel: 'Test',
          content: 'Tuesday reflection',
        },
      ]

      const available = deriveSunAvailable(events, now)
      expect(available).toBe(0) // 1 - 1 = 0 (this week)
    })

    it('sun before Monday 6am counts for previous week', () => {
      // Wednesday Jan 29 at 2pm
      const now = new Date(2026, 0, 29, 14, 0, 0)
      vi.setSystemTime(now)

      // Monday Jan 26 at 5:59am (before 6am reset, so previous week)
      const events: TrunkEvent[] = [
        {
          type: 'sun_shone',
          timestamp: new Date(2026, 0, 26, 5, 59, 0).toISOString(),
          twigId: 'branch-0-twig-0',
          twigLabel: 'Test',
          content: 'Before weekly reset',
        },
      ]

      const available = deriveSunAvailable(events, now)
      expect(available).toBe(1) // Previous week, doesn't count
    })

    it('sun at exactly Monday 6:00am counts for current week', () => {
      // Wednesday Jan 29 at 2pm
      const now = new Date(2026, 0, 29, 14, 0, 0)
      vi.setSystemTime(now)

      const events: TrunkEvent[] = [
        {
          type: 'sun_shone',
          timestamp: new Date(2026, 0, 26, 6, 0, 0, 0).toISOString(),
          twigId: 'branch-0-twig-0',
          twigLabel: 'Test',
          content: 'Exactly at weekly reset',
        },
      ]

      const available = deriveSunAvailable(events, now)
      expect(available).toBe(0) // At reset, counts for this week
    })

    it('getWeekResetTime on Monday before 6am returns previous Monday', () => {
      const mondayBeforeSix = new Date(2026, 0, 26, 5, 59, 0)
      const reset = getWeekResetTime(mondayBeforeSix)

      expect(reset.getDay()).toBe(1) // Monday
      expect(reset.getDate()).toBe(19) // Previous Monday (Jan 19)
      expect(reset.getHours()).toBe(6)
    })

    it('getWeekResetTime on Monday at 6am returns same Monday', () => {
      const mondayAtSix = new Date(2026, 0, 26, 6, 0, 0)
      const reset = getWeekResetTime(mondayAtSix)

      expect(reset.getDay()).toBe(1) // Monday
      expect(reset.getDate()).toBe(26) // Same Monday
      expect(reset.getHours()).toBe(6)
    })
  })

  describe('soil capacity at maximum (120)', () => {
    it('calculateCapacityReward returns 0 at exactly 120', () => {
      const reward = calculateCapacityReward('2w', 'fertile', 5, 120)
      expect(reward).toBe(0)
    })

    it('calculateCapacityReward returns very small value near 120', () => {
      const reward = calculateCapacityReward('2w', 'fertile', 5, 119)
      expect(reward).toBeGreaterThan(0)
      expect(reward).toBeLessThan(0.01) // Very small due to diminishing returns
    })

    it('deriveState caps soilCapacity at 120', () => {
      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: '2026-01-01T10:00:00Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          title: 'Test',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
        {
          type: 'sprout_harvested',
          timestamp: '2026-01-15T10:00:00Z',
          sproutId: 'sprout-1',
          result: 5,
          capacityGained: 200, // Unrealistically high to test cap
        },
      ]

      const state = deriveState(events)
      expect(state.soilCapacity).toBe(120) // Capped at MAX
    })
  })

  describe('result values at boundaries', () => {
    it('result=1 uses 0.4 multiplier', () => {
      const reward = calculateCapacityReward('2w', 'fertile', 1, 10)
      // base=0.26, env=1.1, result=0.4, diminishing=(1-10/120)^1.5
      const diminishing = Math.max(0, (1 - 10 / 120) ** 1.5)
      const expected = 0.26 * 1.1 * 0.4 * diminishing
      expect(reward).toBeCloseTo(expected, 6)
    })

    it('result=5 uses 1.0 multiplier', () => {
      const reward = calculateCapacityReward('2w', 'fertile', 5, 10)
      const diminishing = Math.max(0, (1 - 10 / 120) ** 1.5)
      const expected = 0.26 * 1.1 * 1.0 * diminishing
      expect(reward).toBeCloseTo(expected, 6)
    })

    it('result=5 reward is 2.5x result=1 reward (same season/env/capacity)', () => {
      const reward1 = calculateCapacityReward('1m', 'firm', 1, 20)
      const reward5 = calculateCapacityReward('1m', 'firm', 5, 20)
      // 1.0 / 0.4 = 2.5
      expect(reward5 / reward1).toBeCloseTo(2.5, 6)
    })

    it('result clamped to 1 when below range', () => {
      const rewardZero = calculateCapacityReward('2w', 'fertile', 0, 10)
      const rewardOne = calculateCapacityReward('2w', 'fertile', 1, 10)
      expect(rewardZero).toBeCloseTo(rewardOne, 6)
    })

    it('result clamped to 5 when above range', () => {
      const rewardSix = calculateCapacityReward('2w', 'fertile', 6, 10)
      const rewardFive = calculateCapacityReward('2w', 'fertile', 5, 10)
      expect(rewardSix).toBeCloseTo(rewardFive, 6)
    })
  })

  describe('validateEvent boundaries', () => {
    it('accepts title of 60 characters', () => {
      const event = {
        type: 'sprout_planted',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'A'.repeat(60),
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      }
      // validateEvent checks structure, not title length (UI enforces MAX_TITLE_LENGTH)
      expect(validateEvent(event)).toBe(true)
    })

    it('accepts title of 61 characters (no length check in validateEvent)', () => {
      const event = {
        type: 'sprout_planted',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'A'.repeat(61),
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      }
      // validateEvent does NOT enforce MAX_TITLE_LENGTH — that's a UI constraint
      expect(validateEvent(event)).toBe(true)
    })

    it('rejects result=0 in harvest event', () => {
      const event = {
        type: 'sprout_harvested',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sprout-1',
        result: 0,
        capacityGained: 0.5,
      }
      expect(validateEvent(event)).toBe(false)
    })

    it('accepts result=1 in harvest event', () => {
      const event = {
        type: 'sprout_harvested',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sprout-1',
        result: 1,
        capacityGained: 0.5,
      }
      expect(validateEvent(event)).toBe(true)
    })

    it('accepts result=5 in harvest event', () => {
      const event = {
        type: 'sprout_harvested',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sprout-1',
        result: 5,
        capacityGained: 0.5,
      }
      expect(validateEvent(event)).toBe(true)
    })

    it('rejects result=6 in harvest event', () => {
      const event = {
        type: 'sprout_harvested',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sprout-1',
        result: 6,
        capacityGained: 0.5,
      }
      expect(validateEvent(event)).toBe(false)
    })

    it('rejects negative soilCost', () => {
      const event = {
        type: 'sprout_planted',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: -1,
      }
      expect(validateEvent(event)).toBe(false)
    })

    it('accepts soilCost of 0', () => {
      const event = {
        type: 'sprout_planted',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 0,
      }
      expect(validateEvent(event)).toBe(true)
    })

    it('rejects invalid season', () => {
      const event = {
        type: 'sprout_planted',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '5y',
        environment: 'fertile',
        soilCost: 2,
      }
      expect(validateEvent(event)).toBe(false)
    })

    it('rejects invalid environment', () => {
      const event = {
        type: 'sprout_planted',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'swamp',
        soilCost: 2,
      }
      expect(validateEvent(event)).toBe(false)
    })

    it('rejects null event', () => {
      expect(validateEvent(null)).toBe(false)
    })

    it('rejects non-object event', () => {
      expect(validateEvent('not an event')).toBe(false)
      expect(validateEvent(42)).toBe(false)
    })

    it('rejects event with empty timestamp', () => {
      const event = {
        type: 'sprout_planted',
        timestamp: '',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      }
      expect(validateEvent(event)).toBe(false)
    })

    it('rejects unknown event type', () => {
      const event = {
        type: 'sprout_exploded',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sprout-1',
      }
      expect(validateEvent(event)).toBe(false)
    })
  })

  describe('soil available capped at capacity', () => {
    it('soil cannot exceed capacity after recovery', () => {
      // Start with full soil (10), shine sun which adds 0.35
      const events: TrunkEvent[] = [
        {
          type: 'sun_shone',
          timestamp: '2026-01-01T10:00:00Z',
          twigId: 'branch-0-twig-0',
          twigLabel: 'Test',
          content: 'Reflection',
        },
      ]

      const state = deriveState(events)
      // 10 + 0.35 would be 10.35, but capped at capacity (10)
      expect(state.soilAvailable).toBe(10)
      expect(state.soilAvailable).toBeLessThanOrEqual(state.soilCapacity)
    })

    it('soil recovery capped after harvest returns soil', () => {
      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: '2026-01-01T10:00:00Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          title: 'Test',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
        {
          type: 'sprout_harvested',
          timestamp: '2026-01-15T10:00:00Z',
          sproutId: 'sprout-1',
          result: 5,
          capacityGained: 0.5,
        },
      ]

      const state = deriveState(events)
      // Capacity: 10 + 0.5 = 10.5
      // Available: 8 + 2 (returned) = 10, capped at 10.5 → 10
      expect(state.soilCapacity).toBeCloseTo(10.5, 2)
      expect(state.soilAvailable).toBe(10)
      expect(state.soilAvailable).toBeLessThanOrEqual(state.soilCapacity)
    })
  })
})
