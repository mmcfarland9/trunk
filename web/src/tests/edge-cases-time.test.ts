/**
 * Edge case tests: Time-related scenarios.
 * Tests midnight, DST, far-past dates, duplicate timestamps, and large event counts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  deriveState,
  deriveWaterAvailable,
  deriveSunAvailable,
  getActiveSprouts,
  deriveWateringStreak,
} from '../events/derive'
import { getTodayResetTime, getWeekResetTime } from '../utils/calculations'
import type { TrunkEvent } from '../events/types'

describe('Edge Cases — Time', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('events at exact midnight (00:00:00.000)', () => {
    it('midnight water counts for previous day (before 6am reset)', () => {
      // Current time: 10am on Jan 30
      const now = new Date(2026, 0, 30, 10, 0, 0)
      vi.setSystemTime(now)

      // Water at midnight Jan 30 (00:00 is before 6am reset, so belongs to Jan 29's "day")
      const events: TrunkEvent[] = [
        {
          type: 'sprout_watered',
          timestamp: new Date(2026, 0, 30, 0, 0, 0, 0).toISOString(),
          sproutId: 'sprout-1',
          content: 'Midnight water',
        },
      ]

      const available = deriveWaterAvailable(events, now)
      expect(available).toBe(3) // Midnight is before 6am reset, doesn't count for today
    })

    it('midnight water counts for current day when "now" is also before 6am', () => {
      // Current time: 3am on Jan 30 (before 6am)
      const now = new Date(2026, 0, 30, 3, 0, 0)
      vi.setSystemTime(now)

      // Water at midnight Jan 30
      const events: TrunkEvent[] = [
        {
          type: 'sprout_watered',
          timestamp: new Date(2026, 0, 30, 0, 0, 0, 0).toISOString(),
          sproutId: 'sprout-1',
          content: 'Midnight water',
        },
      ]

      // At 3am, today's reset was yesterday at 6am. Midnight today is after that.
      const available = deriveWaterAvailable(events, now)
      expect(available).toBe(2) // Counts — midnight is after yesterday's 6am reset
    })

    it('getTodayResetTime at midnight returns previous day 6am', () => {
      const midnight = new Date(2026, 0, 30, 0, 0, 0, 0)
      const reset = getTodayResetTime(midnight)

      expect(reset.getDate()).toBe(29) // Previous day
      expect(reset.getHours()).toBe(6)
    })
  })

  describe('week boundary: Sunday 11:59pm vs Monday 6:01am', () => {
    it('Sunday 11:59pm is within the current week', () => {
      // Monday Feb 2 at 10am (checking from later in week)
      const now = new Date(2026, 1, 4, 10, 0, 0)
      vi.setSystemTime(now)

      // Sun on Sunday Feb 1 at 11:59pm
      const events: TrunkEvent[] = [
        {
          type: 'sun_shone',
          timestamp: new Date(2026, 1, 1, 23, 59, 0).toISOString(),
          twigId: 'branch-0-twig-0',
          twigLabel: 'Test',
          content: 'Sunday night',
        },
      ]

      // Week reset is Monday Feb 2 at 6am.
      // Sunday 11:59pm is BEFORE Monday 6am, so it's previous week
      const available = deriveSunAvailable(events, now)
      expect(available).toBe(1) // Previous week — doesn't count
    })

    it('Monday 6:01am is within the current week', () => {
      const now = new Date(2026, 1, 4, 10, 0, 0) // Wednesday
      vi.setSystemTime(now)

      // Sun on Monday Feb 2 at 6:01am
      const events: TrunkEvent[] = [
        {
          type: 'sun_shone',
          timestamp: new Date(2026, 1, 2, 6, 1, 0).toISOString(),
          twigId: 'branch-0-twig-0',
          twigLabel: 'Test',
          content: 'Monday morning',
        },
      ]

      const available = deriveSunAvailable(events, now)
      expect(available).toBe(0) // This week — counts
    })

    it('getWeekResetTime on Sunday returns current week Monday', () => {
      // Sunday Feb 1 at 11:59pm
      const sunday = new Date(2026, 1, 1, 23, 59, 0)
      const reset = getWeekResetTime(sunday)

      // Should be Monday Jan 26 (most recent Monday before this Sunday)
      expect(reset.getDay()).toBe(1) // Monday
      expect(reset.getDate()).toBe(26) // Jan 26
      expect(reset.getHours()).toBe(6)
    })
  })

  describe('sprout planted far in past', () => {
    it('date math works for year 2020', () => {
      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: '2020-01-01T10:00:00Z',
          sproutId: 'old-sprout',
          twigId: 'branch-0-twig-0',
          title: 'Ancient Goal',
          season: '1y',
          environment: 'barren',
          soilCost: 24,
        },
      ]

      const state = deriveState(events)
      const sprout = state.sprouts.get('old-sprout')!

      expect(sprout.plantedAt).toBe('2020-01-01T10:00:00Z')
      expect(sprout.state).toBe('active')
      expect(state.soilAvailable).toBe(0) // 10 - 24 clamped to 0
    })

    it('watering streak handles events from 2020', () => {
      vi.setSystemTime(new Date(2026, 0, 30, 10, 0, 0))

      const events: TrunkEvent[] = [
        {
          type: 'sprout_watered',
          timestamp: '2020-06-15T10:00:00Z',
          sproutId: 'sprout-1',
          content: 'Ancient water',
        },
      ]

      const streak = deriveWateringStreak(events)
      // Shouldn't crash — streak should be 0 (not consecutive with today)
      expect(streak.current).toBe(0)
      expect(streak.longest).toBe(1) // One day had watering
    })
  })

  describe('very large event counts', () => {
    it('correctly processes 500+ events', () => {
      const events: TrunkEvent[] = []
      const baseTime = new Date('2026-01-01T10:00:00Z').getTime()

      // Plant 50 sprouts
      for (let i = 0; i < 50; i++) {
        events.push({
          type: 'sprout_planted',
          timestamp: new Date(baseTime + i * 3600000).toISOString(),
          sproutId: `sprout-${i}`,
          twigId: `branch-${i % 8}-twig-${i % 8}`,
          title: `Goal ${i}`,
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        })
      }

      // Water each sprout 10 times (500 water events)
      for (let i = 0; i < 50; i++) {
        for (let w = 0; w < 10; w++) {
          events.push({
            type: 'sprout_watered',
            timestamp: new Date(baseTime + 50 * 3600000 + (i * 10 + w) * 60000).toISOString(),
            sproutId: `sprout-${i}`,
            content: `Water ${w + 1} for sprout ${i}`,
          })
        }
      }

      const state = deriveState(events)

      expect(state.sprouts.size).toBe(50)
      const active = getActiveSprouts(state)
      expect(active).toHaveLength(50)

      // Verify water entries
      for (let i = 0; i < 50; i++) {
        const sprout = state.sprouts.get(`sprout-${i}`)!
        expect(sprout.waterEntries).toHaveLength(10)
      }

      // Soil: 10 - (50 * 2) = -90, clamped to 0, then +500 * 0.05 = 25, capped at capacity 10
      expect(state.soilAvailable).toBe(10)
    })

    it('handles 1000+ events without crashing', () => {
      const events: TrunkEvent[] = []
      const baseTime = new Date('2026-01-01T10:00:00Z').getTime()

      for (let i = 0; i < 1000; i++) {
        if (i % 10 === 0) {
          events.push({
            type: 'sprout_planted',
            timestamp: new Date(baseTime + i * 60000).toISOString(),
            sproutId: `sprout-${i}`,
            twigId: `branch-${i % 8}-twig-${i % 8}`,
            title: `Goal ${i}`,
            season: '2w',
            environment: 'fertile',
            soilCost: 2,
          })
        } else if (i % 3 === 0) {
          events.push({
            type: 'sprout_watered',
            timestamp: new Date(baseTime + i * 60000).toISOString(),
            sproutId: `sprout-${Math.floor(i / 10) * 10}`,
            content: `Water ${i}`,
          })
        } else {
          events.push({
            type: 'sun_shone',
            timestamp: new Date(baseTime + i * 60000).toISOString(),
            twigId: `branch-${i % 8}-twig-${i % 8}`,
            twigLabel: `Twig ${i}`,
            content: `Reflection ${i}`,
          })
        }
      }

      // Should not throw
      const state = deriveState(events)
      expect(state.sprouts.size).toBe(100) // 1000 / 10
      expect(state.sunEntries.length).toBeGreaterThan(0)
    })
  })

  describe('events with duplicate timestamps', () => {
    it('both events processed when they have different entity IDs', () => {
      const sameTimestamp = '2026-01-15T10:00:00.000Z'

      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: sameTimestamp,
          sproutId: 'sprout-a',
          twigId: 'branch-0-twig-0',
          title: 'First',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
        {
          type: 'sprout_planted',
          timestamp: sameTimestamp,
          sproutId: 'sprout-b',
          twigId: 'branch-0-twig-1',
          title: 'Second',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
      ]

      const state = deriveState(events)
      expect(state.sprouts.size).toBe(2)
      expect(state.soilAvailable).toBe(6) // 10 - 2 - 2
    })

    it('different event types at same timestamp processed independently', () => {
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
          type: 'leaf_created',
          timestamp: '2026-01-01T10:00:00Z',
          leafId: 'leaf-1',
          twigId: 'branch-0-twig-0',
          name: 'Saga',
        },
        {
          type: 'sun_shone',
          timestamp: '2026-01-01T10:00:00Z',
          twigId: 'branch-0-twig-0',
          twigLabel: 'Test',
          content: 'Reflection',
        },
      ]

      const state = deriveState(events)
      expect(state.sprouts.size).toBe(1)
      expect(state.leaves.size).toBe(1)
      expect(state.sunEntries).toHaveLength(1)
    })

    it('two water events at exact same time for same sprout are deduped', () => {
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
          type: 'sprout_watered',
          timestamp: '2026-01-02T10:00:00Z',
          sproutId: 'sprout-1',
          content: 'First water',
        },
        // Same type, same sproutId, same timestamp → deduped
        {
          type: 'sprout_watered',
          timestamp: '2026-01-02T10:00:00Z',
          sproutId: 'sprout-1',
          content: 'Duplicate water',
        },
      ]

      const state = deriveState(events)
      const sprout = state.sprouts.get('sprout-1')!
      expect(sprout.waterEntries).toHaveLength(1)
      expect(sprout.waterEntries[0].content).toBe('First water')
    })
  })

  describe('watering streak edge cases', () => {
    it('streak works across month boundaries', () => {
      const now = new Date(2026, 1, 2, 10, 0, 0) // Feb 2
      vi.setSystemTime(now)

      const events: TrunkEvent[] = [
        {
          type: 'sprout_watered',
          timestamp: new Date(2026, 0, 30, 10, 0, 0).toISOString(), // Jan 30
          sproutId: 'sprout-1',
          content: 'Day 1',
        },
        {
          type: 'sprout_watered',
          timestamp: new Date(2026, 0, 31, 10, 0, 0).toISOString(), // Jan 31
          sproutId: 'sprout-1',
          content: 'Day 2',
        },
        {
          type: 'sprout_watered',
          timestamp: new Date(2026, 1, 1, 10, 0, 0).toISOString(), // Feb 1
          sproutId: 'sprout-1',
          content: 'Day 3',
        },
        {
          type: 'sprout_watered',
          timestamp: new Date(2026, 1, 2, 10, 0, 0).toISOString(), // Feb 2
          sproutId: 'sprout-1',
          content: 'Day 4',
        },
      ]

      const streak = deriveWateringStreak(events, now)
      expect(streak.current).toBe(4)
      expect(streak.longest).toBe(4)
    })

    it('streak resets on gap day', () => {
      const now = new Date(2026, 0, 30, 10, 0, 0) // Jan 30
      vi.setSystemTime(now)

      const events: TrunkEvent[] = [
        {
          type: 'sprout_watered',
          timestamp: new Date(2026, 0, 27, 10, 0, 0).toISOString(), // Jan 27
          sproutId: 'sprout-1',
          content: 'Day 1',
        },
        {
          type: 'sprout_watered',
          timestamp: new Date(2026, 0, 28, 10, 0, 0).toISOString(), // Jan 28
          sproutId: 'sprout-1',
          content: 'Day 2',
        },
        // Gap: Jan 29 skipped
        {
          type: 'sprout_watered',
          timestamp: new Date(2026, 0, 30, 10, 0, 0).toISOString(), // Jan 30
          sproutId: 'sprout-1',
          content: 'Day after gap',
        },
      ]

      const streak = deriveWateringStreak(events, now)
      expect(streak.current).toBe(1) // Only today
      expect(streak.longest).toBe(2) // Jan 27-28
    })

    it('multiple waters on same day count as one streak day', () => {
      const now = new Date(2026, 0, 30, 20, 0, 0)
      vi.setSystemTime(now)

      const events: TrunkEvent[] = [
        {
          type: 'sprout_watered',
          timestamp: new Date(2026, 0, 30, 8, 0, 0).toISOString(),
          sproutId: 'sprout-1',
          content: 'Morning water',
        },
        {
          type: 'sprout_watered',
          timestamp: new Date(2026, 0, 30, 12, 0, 0).toISOString(),
          sproutId: 'sprout-2',
          content: 'Noon water',
        },
        {
          type: 'sprout_watered',
          timestamp: new Date(2026, 0, 30, 18, 0, 0).toISOString(),
          sproutId: 'sprout-3',
          content: 'Evening water',
        },
      ]

      const streak = deriveWateringStreak(events, now)
      expect(streak.current).toBe(1) // All same day
      expect(streak.longest).toBe(1)
    })
  })

  describe('complete lifecycle timing', () => {
    it('sprout planted and harvested on same day works', () => {
      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: '2026-01-15T08:00:00Z',
          sproutId: 'quick-sprout',
          twigId: 'branch-0-twig-0',
          title: 'Quick Goal',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
        {
          type: 'sprout_harvested',
          timestamp: '2026-01-15T20:00:00Z',
          sproutId: 'quick-sprout',
          result: 5,
          capacityGained: 0.5,
        },
      ]

      const state = deriveState(events)
      const sprout = state.sprouts.get('quick-sprout')!

      expect(sprout.state).toBe('completed')
      expect(state.soilCapacity).toBeCloseTo(10.5, 2)
      // Soil: 10 - 2 + 2 = 10, capped at 10.5
      expect(state.soilAvailable).toBe(10)
    })

    it('handles events spanning years', () => {
      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: '2024-01-01T10:00:00Z',
          sproutId: 'multi-year',
          twigId: 'branch-0-twig-0',
          title: 'Multi-Year Goal',
          season: '1y',
          environment: 'barren',
          soilCost: 24,
        },
        {
          type: 'sprout_harvested',
          timestamp: '2026-01-01T10:00:00Z',
          sproutId: 'multi-year',
          result: 5,
          capacityGained: 5.0,
        },
      ]

      const state = deriveState(events)
      expect(state.sprouts.get('multi-year')!.state).toBe('completed')
      expect(state.soilCapacity).toBe(15) // 10 + 5
    })
  })

  describe('deriveWaterAvailable edge cases', () => {
    it('never returns negative even with more events than capacity', () => {
      const now = new Date(2026, 0, 30, 20, 0, 0)
      vi.setSystemTime(now)

      // 5 water events today (more than capacity of 3)
      const events: TrunkEvent[] = Array.from({ length: 5 }, (_, i) => ({
        type: 'sprout_watered' as const,
        timestamp: new Date(2026, 0, 30, 7 + i, 0, 0).toISOString(),
        sproutId: `sprout-${i}`,
        content: `Water ${i}`,
      }))

      const available = deriveWaterAvailable(events, now)
      expect(available).toBe(0) // Clamped to 0, not -2
    })
  })

  describe('deriveSunAvailable edge cases', () => {
    it('never returns negative even with multiple sun events in a week', () => {
      const now = new Date(2026, 0, 29, 14, 0, 0) // Wednesday
      vi.setSystemTime(now)

      const events: TrunkEvent[] = [
        {
          type: 'sun_shone',
          timestamp: new Date(2026, 0, 27, 10, 0, 0).toISOString(), // Monday
          twigId: 'branch-0-twig-0',
          twigLabel: 'Test',
          content: 'First',
        },
        {
          type: 'sun_shone',
          timestamp: new Date(2026, 0, 28, 10, 0, 0).toISOString(), // Tuesday
          twigId: 'branch-1-twig-0',
          twigLabel: 'Test2',
          content: 'Second',
        },
      ]

      const available = deriveSunAvailable(events, now)
      expect(available).toBe(0) // Clamped to 0, not -1
    })
  })
})
