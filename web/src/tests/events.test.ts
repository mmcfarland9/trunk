/**
 * Tests for event-sourced state derivation.
 *
 * These tests prove that all state can be fully derived from the event log.
 * This is critical for cross-platform sync between web and iOS.
 */

import { describe, it, expect } from 'vitest'
import {
  deriveState,
  deriveWaterAvailable,
  deriveSunAvailable,
  getTodayResetTime,
  getWeekResetTime,
  getActiveSprouts,
  getCompletedSprouts,
  getSproutsForTwig,
  getLeavesForTwig,
  wasSproutWateredThisWeek,
} from '../events/derive'
import type { TrunkEvent } from '../events/types'

describe('State Derivation from Events', () => {
  describe('Empty event log', () => {
    it('should return starting capacity with no events', () => {
      const state = deriveState([])
      expect(state.soilCapacity).toBe(10) // Starting capacity
      expect(state.soilAvailable).toBe(10) // Full available
      expect(state.sprouts.size).toBe(0)
      expect(state.leaves.size).toBe(0)
      expect(state.sunEntries).toHaveLength(0)
    })
  })

  describe('Sprout lifecycle', () => {
    it('should create active sprout on sprout_planted event', () => {
      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: '2026-01-15T10:00:00Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          title: 'Learn TypeScript',
          season: '1m',
          environment: 'firm',
          soilCost: 5,
          leafId: 'leaf-1',
        },
      ]

      const state = deriveState(events)

      expect(state.sprouts.size).toBe(1)
      const sprout = state.sprouts.get('sprout-1')!
      expect(sprout.title).toBe('Learn TypeScript')
      expect(sprout.state).toBe('active')
      expect(sprout.plantedAt).toBe('2026-01-15T10:00:00Z')
      expect(sprout.leafId).toBe('leaf-1')
    })

    it('should deduct soil when planting', () => {
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
      expect(state.soilCapacity).toBe(10) // Unchanged
    })

    it('should add water entry on sprout_watered event', () => {
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
        {
          type: 'sprout_watered',
          timestamp: '2026-01-16T09:00:00Z',
          sproutId: 'sprout-1',
          content: 'Made good progress today',
          prompt: 'What did you work on?',
        },
      ]

      const state = deriveState(events)
      const sprout = state.sprouts.get('sprout-1')!
      expect(sprout.waterEntries).toHaveLength(1)
      expect(sprout.waterEntries[0].content).toBe('Made good progress today')
      expect(sprout.waterEntries[0].prompt).toBe('What did you work on?')
    })

    it('should recover soil on watering', () => {
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
        {
          type: 'sprout_watered',
          timestamp: '2026-01-16T09:00:00Z',
          sproutId: 'sprout-1',
          content: 'Progress',
        },
      ]

      const state = deriveState(events)
      // 10 - 2 (plant) + 0.05 (water) = 8.05
      expect(state.soilAvailable).toBeCloseTo(8.05, 2)
    })

    it('should complete sprout on sprout_harvested event', () => {
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
        {
          type: 'sprout_harvested',
          timestamp: '2026-01-30T10:00:00Z',
          sproutId: 'sprout-1',
          result: 4,
          reflection: 'Learned a lot!',
          capacityGained: 0.5,
        },
      ]

      const state = deriveState(events)
      const sprout = state.sprouts.get('sprout-1')!
      expect(sprout.state).toBe('completed')
      expect(sprout.result).toBe(4)
      expect(sprout.reflection).toBe('Learned a lot!')
      expect(sprout.harvestedAt).toBe('2026-01-30T10:00:00Z')
    })

    it('should return soil and gain capacity on harvest', () => {
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
        {
          type: 'sprout_harvested',
          timestamp: '2026-01-30T10:00:00Z',
          sproutId: 'sprout-1',
          result: 5,
          capacityGained: 0.5,
        },
      ]

      const state = deriveState(events)
      // Capacity: 10 + 0.5 = 10.5
      expect(state.soilCapacity).toBeCloseTo(10.5, 2)
      // Available: 10 - 2 (plant) + 2 (return) = 10, capped at capacity
      expect(state.soilAvailable).toBeCloseTo(10, 2)
    })

    it('should preserve sprout as uprooted on sprout_uprooted event', () => {
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
        {
          type: 'sprout_uprooted',
          timestamp: '2026-01-20T10:00:00Z',
          sproutId: 'sprout-1',
          soilReturned: 0.5,
        },
      ]

      const state = deriveState(events)
      expect(state.sprouts.has('sprout-1')).toBe(true)
      const sprout = state.sprouts.get('sprout-1')!
      expect(sprout.state).toBe('uprooted')
      expect(sprout.uprootedAt).toBe('2026-01-20T10:00:00Z')
      // 10 - 2 (plant) + 0.5 (return) = 8.5
      expect(state.soilAvailable).toBeCloseTo(8.5, 2)
    })

    it('should handle all harvest results 1-5 as completed (no failed state)', () => {
      const events: TrunkEvent[] = [
        // Plant 5 sprouts
        ...[1, 2, 3, 4, 5].map((n) => ({
          type: 'sprout_planted' as const,
          timestamp: `2026-01-15T${10 + n}:00:00Z`,
          sproutId: `sprout-${n}`,
          twigId: 'branch-0-twig-0',
          title: `Sprout ${n}`,
          season: '2w' as const,
          environment: 'fertile' as const,
          soilCost: 2,
        })),
        // Harvest with results 1-5
        ...[1, 2, 3, 4, 5].map((n) => ({
          type: 'sprout_harvested' as const,
          timestamp: `2026-01-30T${10 + n}:00:00Z`,
          sproutId: `sprout-${n}`,
          result: n,
          capacityGained: 0.1 * n,
        })),
      ]

      const state = deriveState(events)

      // All 5 should be completed, not failed
      for (let n = 1; n <= 5; n++) {
        const sprout = state.sprouts.get(`sprout-${n}`)!
        expect(sprout.state).toBe('completed')
        expect(sprout.result).toBe(n)
      }
    })
  })

  describe('Leaf lifecycle', () => {
    it('should create leaf on leaf_created event', () => {
      const events: TrunkEvent[] = [
        {
          type: 'leaf_created',
          timestamp: '2026-01-15T10:00:00Z',
          leafId: 'leaf-1',
          twigId: 'branch-0-twig-0',
          name: 'My Saga',
        },
      ]

      const state = deriveState(events)
      expect(state.leaves.size).toBe(1)
      const leaf = state.leaves.get('leaf-1')!
      expect(leaf.name).toBe('My Saga')
      expect(leaf.twigId).toBe('branch-0-twig-0')
      expect(leaf.createdAt).toBe('2026-01-15T10:00:00Z')
    })
  })

  describe('Sun/Shine lifecycle', () => {
    it('should add sun entry on sun_shone event', () => {
      const events: TrunkEvent[] = [
        {
          type: 'sun_shone',
          timestamp: '2026-01-15T10:00:00Z',
          twigId: 'branch-0-twig-0',
          twigLabel: 'Movement',
          content: 'Reflected on my fitness journey',
          prompt: 'What does this area of life mean to you?',
        },
      ]

      const state = deriveState(events)
      expect(state.sunEntries).toHaveLength(1)
      expect(state.sunEntries[0].content).toBe('Reflected on my fitness journey')
      expect(state.sunEntries[0].context.twigId).toBe('branch-0-twig-0')
      expect(state.sunEntries[0].context.twigLabel).toBe('Movement')
    })

    it('should recover soil on sun shine', () => {
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
        {
          type: 'sun_shone',
          timestamp: '2026-01-16T10:00:00Z',
          twigId: 'branch-0-twig-0',
          twigLabel: 'Movement',
          content: 'Reflection',
        },
      ]

      const state = deriveState(events)
      // 10 - 2 (plant) + 0.35 (sun) = 8.35
      expect(state.soilAvailable).toBeCloseTo(8.35, 2)
    })
  })

  describe('Complex scenarios', () => {
    it('should correctly derive state from a realistic event sequence', () => {
      const events: TrunkEvent[] = [
        // Week 1: Create a leaf and plant a sprout
        {
          type: 'leaf_created',
          timestamp: '2026-01-01T10:00:00Z',
          leafId: 'leaf-fitness',
          twigId: 'branch-0-twig-0',
          name: 'Fitness Journey',
        },
        {
          type: 'sprout_planted',
          timestamp: '2026-01-01T10:01:00Z',
          sproutId: 'sprout-running',
          twigId: 'branch-0-twig-0',
          title: 'Run 3x per week',
          season: '1m',
          environment: 'firm',
          soilCost: 5,
          leafId: 'leaf-fitness',
          bloomWither: 'Gave up',
          bloomBudding: 'Running 1-2x',
          bloomFlourish: 'Running 3x consistently',
        },
        // Week 1: Water the sprout
        {
          type: 'sprout_watered',
          timestamp: '2026-01-03T09:00:00Z',
          sproutId: 'sprout-running',
          content: 'Went for first run, felt good!',
        },
        // Week 1: Shine on the twig
        {
          type: 'sun_shone',
          timestamp: '2026-01-05T10:00:00Z',
          twigId: 'branch-0-twig-0',
          twigLabel: 'Movement',
          content: 'Movement is foundational to my wellbeing.',
        },
        // Week 2: Water again
        {
          type: 'sprout_watered',
          timestamp: '2026-01-10T09:00:00Z',
          sproutId: 'sprout-running',
          content: 'Ran 3 times this week!',
        },
        // End of month: Harvest
        {
          type: 'sprout_harvested',
          timestamp: '2026-02-01T10:00:00Z',
          sproutId: 'sprout-running',
          result: 4,
          reflection: 'Built a solid running habit. Ready for the next level.',
          capacityGained: 1.2,
        },
        // Start a new sprout on the same leaf
        {
          type: 'sprout_planted',
          timestamp: '2026-02-01T10:30:00Z',
          sproutId: 'sprout-5k',
          twigId: 'branch-0-twig-0',
          title: 'Train for 5K race',
          season: '3m',
          environment: 'barren',
          soilCost: 10,
          leafId: 'leaf-fitness',
        },
      ]

      const state = deriveState(events)

      // Verify leaves
      expect(state.leaves.size).toBe(1)
      expect(state.leaves.get('leaf-fitness')?.name).toBe('Fitness Journey')

      // Verify sprouts
      expect(state.sprouts.size).toBe(2)

      const running = state.sprouts.get('sprout-running')!
      expect(running.state).toBe('completed')
      expect(running.result).toBe(4)
      expect(running.waterEntries).toHaveLength(2)

      const fiveK = state.sprouts.get('sprout-5k')!
      expect(fiveK.state).toBe('active')
      expect(fiveK.leafId).toBe('leaf-fitness')

      // Verify soil
      // Start: 10
      // Plant running: 10 - 5 = 5
      // Water 1: 5 + 0.05 = 5.05
      // Sun: 5.05 + 0.35 = 5.40
      // Water 2: 5.40 + 0.05 = 5.45
      // Harvest: 5.45 + 5 (return) = 10.45, capped at capacity 10 + 1.2 = 11.2
      // Plant 5k: 10.45 - 10 = 0.45
      expect(state.soilCapacity).toBeCloseTo(11.2, 2)
      expect(state.soilAvailable).toBeCloseTo(0.45, 2)

      // Verify sun entries
      expect(state.sunEntries).toHaveLength(1)
    })
  })
})

describe('Water Availability Derivation', () => {
  it('should return full capacity with no water events', () => {
    const available = deriveWaterAvailable([])
    expect(available).toBe(3)
  })

  it('should deduct for each water event today', () => {
    // Use explicit local time for now
    const now = new Date(2026, 0, 30, 14, 0, 0) // Jan 30, 2026 2pm local
    // Create timestamps after 6am reset (9am and 12pm local)
    const water1 = new Date(2026, 0, 30, 9, 0, 0).toISOString()
    const water2 = new Date(2026, 0, 30, 12, 0, 0).toISOString()

    const events: TrunkEvent[] = [
      {
        type: 'sprout_watered',
        timestamp: water1,
        sproutId: 'sprout-1',
        content: 'First water',
      },
      {
        type: 'sprout_watered',
        timestamp: water2,
        sproutId: 'sprout-2',
        content: 'Second water',
      },
    ]

    const available = deriveWaterAvailable(events, now)
    expect(available).toBe(1) // 3 - 2
  })

  it('should not count waters from before 6am reset', () => {
    // Jan 30, 2026 2pm local
    const now = new Date(2026, 0, 30, 14, 0, 0)
    // Yesterday at 9pm (before today's 6am reset)
    const yesterdayWater = new Date(2026, 0, 29, 21, 0, 0).toISOString()
    // Today at 9am (after 6am reset)
    const todayWater = new Date(2026, 0, 30, 9, 0, 0).toISOString()

    const events: TrunkEvent[] = [
      {
        type: 'sprout_watered',
        timestamp: yesterdayWater,
        sproutId: 'sprout-1',
        content: 'Yesterday water',
      },
      {
        type: 'sprout_watered',
        timestamp: todayWater,
        sproutId: 'sprout-2',
        content: 'Today water',
      },
    ]

    const available = deriveWaterAvailable(events, now)
    expect(available).toBe(2) // Only 1 today counts
  })
})

describe('Sun Availability Derivation', () => {
  it('should return full capacity with no sun events', () => {
    const available = deriveSunAvailable([])
    expect(available).toBe(1)
  })

  it('should deduct for sun event this week', () => {
    // Wednesday Jan 29, 2026
    const now = new Date('2026-01-29T14:00:00')
    const events: TrunkEvent[] = [
      // Monday this week
      {
        type: 'sun_shone',
        timestamp: '2026-01-27T10:00:00Z',
        twigId: 'branch-0-twig-0',
        twigLabel: 'Test',
        content: 'Reflection',
      },
    ]

    const available = deriveSunAvailable(events, now)
    expect(available).toBe(0) // 1 - 1
  })

  it('should not count sun from before Monday 6am reset', () => {
    // Wednesday Jan 29, 2026
    const now = new Date('2026-01-29T14:00:00')
    const events: TrunkEvent[] = [
      // Saturday last week (before Monday reset)
      {
        type: 'sun_shone',
        timestamp: '2026-01-25T10:00:00Z',
        twigId: 'branch-0-twig-0',
        twigLabel: 'Test',
        content: 'Last week',
      },
    ]

    const available = deriveSunAvailable(events, now)
    expect(available).toBe(1) // Last week doesn't count
  })
})

describe('Sprout Watered This Week', () => {
  it('should return false if never watered', () => {
    const result = wasSproutWateredThisWeek([], 'sprout-1')
    expect(result).toBe(false)
  })

  it('should return true if watered this week', () => {
    const now = new Date('2026-01-29T14:00:00')
    const events: TrunkEvent[] = [
      {
        type: 'sprout_watered',
        timestamp: '2026-01-28T10:00:00Z',
        sproutId: 'sprout-1',
        content: 'Watered',
      },
    ]

    const result = wasSproutWateredThisWeek(events, 'sprout-1', now)
    expect(result).toBe(true)
  })

  it('should return false if watered last week', () => {
    const now = new Date('2026-01-29T14:00:00')
    const events: TrunkEvent[] = [
      {
        type: 'sprout_watered',
        timestamp: '2026-01-20T10:00:00Z',
        sproutId: 'sprout-1',
        content: 'Watered',
      },
    ]

    const result = wasSproutWateredThisWeek(events, 'sprout-1', now)
    expect(result).toBe(false)
  })
})

describe('Helper Functions', () => {
  describe('getTodayResetTime', () => {
    it('should return 6am today if after 6am', () => {
      const now = new Date('2026-01-30T14:00:00')
      const reset = getTodayResetTime(now)
      expect(reset.getHours()).toBe(6)
      expect(reset.getDate()).toBe(30)
    })

    it('should return 6am yesterday if before 6am', () => {
      const now = new Date('2026-01-30T04:00:00')
      const reset = getTodayResetTime(now)
      expect(reset.getHours()).toBe(6)
      expect(reset.getDate()).toBe(29)
    })
  })

  describe('getWeekResetTime', () => {
    it('should return last Monday 6am', () => {
      // Thursday Jan 29, 2026 at 2pm local
      const now = new Date(2026, 0, 29, 14, 0, 0)
      const reset = getWeekResetTime(now)
      expect(reset.getDay()).toBe(1) // Monday
      expect(reset.getHours()).toBe(6)
      expect(reset.getDate()).toBe(26) // Jan 26 is the Monday before Thursday Jan 29
    })
  })

  describe('State query helpers', () => {
    const events: TrunkEvent[] = [
      {
        type: 'leaf_created',
        timestamp: '2026-01-01T10:00:00Z',
        leafId: 'leaf-1',
        twigId: 'branch-0-twig-0',
        name: 'Saga 1',
      },
      {
        type: 'sprout_planted',
        timestamp: '2026-01-02T10:00:00Z',
        sproutId: 'sprout-active',
        twigId: 'branch-0-twig-0',
        title: 'Active',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
      {
        type: 'sprout_planted',
        timestamp: '2026-01-02T11:00:00Z',
        sproutId: 'sprout-completed',
        twigId: 'branch-0-twig-0',
        title: 'Completed',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
      {
        type: 'sprout_harvested',
        timestamp: '2026-01-20T10:00:00Z',
        sproutId: 'sprout-completed',
        result: 5,
        capacityGained: 0.5,
      },
      {
        type: 'sprout_planted',
        timestamp: '2026-01-02T12:00:00Z',
        sproutId: 'sprout-other-twig',
        twigId: 'branch-1-twig-0',
        title: 'Other Twig',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
    ]

    it('getActiveSprouts should return only active sprouts', () => {
      const state = deriveState(events)
      const active = getActiveSprouts(state)
      expect(active).toHaveLength(2)
      expect(active.every((s) => s.state === 'active')).toBe(true)
    })

    it('getCompletedSprouts should return only completed sprouts', () => {
      const state = deriveState(events)
      const completed = getCompletedSprouts(state)
      expect(completed).toHaveLength(1)
      expect(completed[0].id).toBe('sprout-completed')
    })

    it('getSproutsForTwig should filter by twig', () => {
      const state = deriveState(events)
      const twigSprouts = getSproutsForTwig(state, 'branch-0-twig-0')
      expect(twigSprouts).toHaveLength(2)
    })

    it('getLeavesForTwig should filter by twig', () => {
      const state = deriveState(events)
      const twigLeaves = getLeavesForTwig(state, 'branch-0-twig-0')
      expect(twigLeaves).toHaveLength(1)
      expect(twigLeaves[0].name).toBe('Saga 1')
    })
  })
})
