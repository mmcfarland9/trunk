/**
 * Additional tests for event derivation functions.
 * Complements events.test.ts with edge cases and specific function tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  deriveState,
  deriveWaterAvailable,
  deriveSunAvailable,
  getSproutsForTwig,
  getLeavesForTwig,
  getActiveSprouts,
  getCompletedSprouts,
  toSprout,
  getLeafById,
  getSproutsByLeaf,
  wasShoneThisWeek,
  getAllWaterEntries,
  deriveSoilLog,
  computeRawSoilHistory,
  bucketSoilData,
} from '../events/derive'
import type { SoilChartRange } from '../events/derive'
import type { TrunkEvent } from '../events/types'

describe('Derive State - Soil Capacity', () => {
  it('calculates soil capacity from harvest events', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T10:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Test 1',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
      {
        type: 'sprout_harvested',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sprout-1',
        result: 5,
        capacityGained: 1.5,
      },
      {
        type: 'sprout_planted',
        timestamp: '2026-01-16T10:00:00Z',
        sproutId: 'sprout-2',
        twigId: 'branch-0-twig-0',
        title: 'Test 2',
        season: '2w',
        environment: 'firm',
        soilCost: 3,
      },
      {
        type: 'sprout_harvested',
        timestamp: '2026-01-30T10:00:00Z',
        sproutId: 'sprout-2',
        result: 4,
        capacityGained: 2.0,
      },
    ]

    const state = deriveState(events)

    // Starting 10 + 1.5 + 2.0 = 13.5
    expect(state.soilCapacity).toBeCloseTo(13.5, 2)
  })

  it('calculates soil available after spend and earn', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T10:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 5,
      },
      {
        type: 'sprout_watered',
        timestamp: '2026-01-02T10:00:00Z',
        sproutId: 'sprout-1',
        content: 'Progress',
      },
      {
        type: 'sun_shone',
        timestamp: '2026-01-03T10:00:00Z',
        twigId: 'branch-0-twig-0',
        twigLabel: 'Test',
        content: 'Reflection',
      },
    ]

    const state = deriveState(events)

    // 10 - 5 (plant) + 0.05 (water) + 0.35 (sun) = 5.40
    expect(state.soilAvailable).toBeCloseTo(5.4, 2)
  })
})

describe('Derive Water Available', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 3 - today\'s waters', () => {
    // Set time to 2pm on Jan 30
    const now = new Date(2026, 0, 30, 14, 0, 0)
    vi.setSystemTime(now)

    const events: TrunkEvent[] = [
      {
        type: 'sprout_watered',
        timestamp: new Date(2026, 0, 30, 9, 0, 0).toISOString(),
        sproutId: 'sprout-1',
        content: 'First',
      },
      {
        type: 'sprout_watered',
        timestamp: new Date(2026, 0, 30, 11, 0, 0).toISOString(),
        sproutId: 'sprout-2',
        content: 'Second',
      },
    ]

    const available = deriveWaterAvailable(events, now)
    expect(available).toBe(1) // 3 - 2 = 1
  })

  it('resets at 6am', () => {
    // Set time to 7am on Jan 30
    const now = new Date(2026, 0, 30, 7, 0, 0)
    vi.setSystemTime(now)

    const events: TrunkEvent[] = [
      // Watered yesterday at 10pm
      {
        type: 'sprout_watered',
        timestamp: new Date(2026, 0, 29, 22, 0, 0).toISOString(),
        sproutId: 'sprout-1',
        content: 'Yesterday late',
      },
      // Watered yesterday at 3am (technically same effective day)
      {
        type: 'sprout_watered',
        timestamp: new Date(2026, 0, 29, 3, 0, 0).toISOString(),
        sproutId: 'sprout-2',
        content: 'Very early',
      },
    ]

    const available = deriveWaterAvailable(events, now)
    expect(available).toBe(3) // All yesterday's waters don't count
  })
})

describe('Derive Sun Available', () => {
  it('returns 1 - this week\'s suns', () => {
    // Wednesday Jan 29, 2026 at 2pm
    const now = new Date('2026-01-29T14:00:00')

    const events: TrunkEvent[] = [
      {
        type: 'sun_shone',
        timestamp: '2026-01-27T10:00:00Z', // Monday
        twigId: 'branch-0-twig-0',
        twigLabel: 'Test',
        content: 'Reflection',
      },
    ]

    const available = deriveSunAvailable(events, now)
    expect(available).toBe(0) // 1 - 1 = 0
  })

  it('resets on Monday 6am', () => {
    // Wednesday Jan 29, 2026 at 2pm
    const now = new Date('2026-01-29T14:00:00')

    const events: TrunkEvent[] = [
      // Last Sunday (before this week's Monday reset)
      {
        type: 'sun_shone',
        timestamp: '2026-01-26T10:00:00Z',
        twigId: 'branch-0-twig-0',
        twigLabel: 'Test',
        content: 'Last week',
      },
    ]

    const available = deriveSunAvailable(events, now)
    expect(available).toBe(1) // Last week doesn't count
  })
})

describe('getSproutsForTwig', () => {
  it('filters by twigId', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T10:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'First Twig',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T11:00:00Z',
        sproutId: 'sprout-2',
        twigId: 'branch-0-twig-1',
        title: 'Second Twig',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T12:00:00Z',
        sproutId: 'sprout-3',
        twigId: 'branch-0-twig-0',
        title: 'First Twig Again',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
    ]

    const state = deriveState(events)
    const twig0Sprouts = getSproutsForTwig(state, 'branch-0-twig-0')

    expect(twig0Sprouts).toHaveLength(2)
    expect(twig0Sprouts.map(s => s.id)).toContain('sprout-1')
    expect(twig0Sprouts.map(s => s.id)).toContain('sprout-3')
  })
})

describe('getLeavesForTwig', () => {
  it('filters by twigId', () => {
    const events: TrunkEvent[] = [
      {
        type: 'leaf_created',
        timestamp: '2026-01-01T10:00:00Z',
        leafId: 'leaf-1',
        twigId: 'branch-0-twig-0',
        name: 'Saga 1',
      },
      {
        type: 'leaf_created',
        timestamp: '2026-01-01T11:00:00Z',
        leafId: 'leaf-2',
        twigId: 'branch-1-twig-0',
        name: 'Saga 2',
      },
      {
        type: 'leaf_created',
        timestamp: '2026-01-01T12:00:00Z',
        leafId: 'leaf-3',
        twigId: 'branch-0-twig-0',
        name: 'Saga 3',
      },
    ]

    const state = deriveState(events)
    const twig0Leaves = getLeavesForTwig(state, 'branch-0-twig-0')

    expect(twig0Leaves).toHaveLength(2)
    expect(twig0Leaves.map(l => l.name)).toContain('Saga 1')
    expect(twig0Leaves.map(l => l.name)).toContain('Saga 3')
  })
})

describe('getActiveSprouts', () => {
  it('returns only active sprouts', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T10:00:00Z',
        sproutId: 'active-1',
        twigId: 'branch-0-twig-0',
        title: 'Active 1',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T11:00:00Z',
        sproutId: 'completed-1',
        twigId: 'branch-0-twig-0',
        title: 'Completed 1',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
      {
        type: 'sprout_harvested',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'completed-1',
        result: 4,
        capacityGained: 0.5,
      },
    ]

    const state = deriveState(events)
    const active = getActiveSprouts(state)

    expect(active).toHaveLength(1)
    expect(active[0].id).toBe('active-1')
  })
})

describe('getCompletedSprouts', () => {
  it('returns only completed sprouts', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T10:00:00Z',
        sproutId: 'active-1',
        twigId: 'branch-0-twig-0',
        title: 'Active',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T11:00:00Z',
        sproutId: 'completed-1',
        twigId: 'branch-0-twig-0',
        title: 'Completed',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
      {
        type: 'sprout_harvested',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'completed-1',
        result: 5,
        capacityGained: 0.5,
      },
    ]

    const state = deriveState(events)
    const completed = getCompletedSprouts(state)

    expect(completed).toHaveLength(1)
    expect(completed[0].id).toBe('completed-1')
  })
})

describe('End Date Calculation (via toSprout)', () => {
  it('sprout endDate is calculated correctly for 2w season', () => {
    const plantedAt = '2026-01-01T10:00:00Z'
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: plantedAt,
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
    ]

    const state = deriveState(events)
    const derivedSprouts = getActiveSprouts(state)

    expect(derivedSprouts).toHaveLength(1)
    expect(derivedSprouts[0].plantedAt).toBe(plantedAt)

    // Convert to legacy Sprout to get endDate
    const sprout = toSprout(derivedSprouts[0])

    // 2w = 14 days, with end time set to 9am CST (15:00 UTC)
    const startDate = new Date(plantedAt)
    const expectedEnd = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000)
    expectedEnd.setUTCHours(15, 0, 0, 0)

    expect(sprout.endDate).toBe(expectedEnd.toISOString())
  })

  it('sprout endDate is calculated correctly for 1m season', () => {
    const plantedAt = '2026-01-01T10:00:00Z'
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: plantedAt,
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '1m',
        environment: 'fertile',
        soilCost: 3,
      },
    ]

    const state = deriveState(events)
    const derivedSprouts = getActiveSprouts(state)

    expect(derivedSprouts).toHaveLength(1)

    // Convert to legacy Sprout to get endDate
    const sprout = toSprout(derivedSprouts[0])

    // 1m = 30 days, with end time set to 9am CST (15:00 UTC)
    const startDate = new Date(plantedAt)
    const expectedEnd = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    expectedEnd.setUTCHours(15, 0, 0, 0)

    expect(sprout.endDate).toBe(expectedEnd.toISOString())
  })
})

describe('getLeafById', () => {
  it('returns leaf when found', () => {
    const events: TrunkEvent[] = [
      {
        type: 'leaf_created',
        timestamp: '2026-01-01T10:00:00Z',
        leafId: 'leaf-1',
        twigId: 'branch-0-twig-0',
        name: 'Test Saga',
      },
    ]

    const state = deriveState(events)
    const leaf = getLeafById(state, 'leaf-1')

    expect(leaf).toBeDefined()
    expect(leaf?.name).toBe('Test Saga')
    expect(leaf?.twigId).toBe('branch-0-twig-0')
  })

  it('returns undefined when leaf not found', () => {
    const state = deriveState([])
    const leaf = getLeafById(state, 'nonexistent')

    expect(leaf).toBeUndefined()
  })
})

describe('getSproutsByLeaf', () => {
  it('returns sprouts belonging to a leaf', () => {
    const events: TrunkEvent[] = [
      {
        type: 'leaf_created',
        timestamp: '2026-01-01T10:00:00Z',
        leafId: 'leaf-1',
        twigId: 'branch-0-twig-0',
        name: 'Test Saga',
      },
      {
        type: 'sprout_planted',
        timestamp: '2026-01-02T10:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'In Saga',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
        leafId: 'leaf-1',
      },
      {
        type: 'sprout_planted',
        timestamp: '2026-01-02T11:00:00Z',
        sproutId: 'sprout-2',
        twigId: 'branch-0-twig-0',
        title: 'Not In Saga',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
      {
        type: 'sprout_planted',
        timestamp: '2026-01-02T12:00:00Z',
        sproutId: 'sprout-3',
        twigId: 'branch-0-twig-0',
        title: 'Also In Saga',
        season: '1m',
        environment: 'firm',
        soilCost: 5,
        leafId: 'leaf-1',
      },
    ]

    const state = deriveState(events)
    const leafSprouts = getSproutsByLeaf(state, 'leaf-1')

    expect(leafSprouts).toHaveLength(2)
    expect(leafSprouts.map(s => s.title)).toContain('In Saga')
    expect(leafSprouts.map(s => s.title)).toContain('Also In Saga')
  })

  it('returns empty array when no sprouts belong to leaf', () => {
    const events: TrunkEvent[] = [
      {
        type: 'leaf_created',
        timestamp: '2026-01-01T10:00:00Z',
        leafId: 'leaf-1',
        twigId: 'branch-0-twig-0',
        name: 'Empty Saga',
      },
    ]

    const state = deriveState(events)
    const leafSprouts = getSproutsByLeaf(state, 'leaf-1')

    expect(leafSprouts).toHaveLength(0)
  })
})

describe('wasShoneThisWeek', () => {
  it('returns true when sun was shone this week', () => {
    // Wednesday Jan 29, 2026 at 2pm
    const now = new Date('2026-01-29T14:00:00')

    const events: TrunkEvent[] = [
      {
        type: 'sun_shone',
        timestamp: '2026-01-28T10:00:00Z', // Tuesday
        twigId: 'branch-0-twig-0',
        twigLabel: 'Test',
        content: 'Reflection',
      },
    ]

    expect(wasShoneThisWeek(events, now)).toBe(true)
  })

  it('returns false when no sun was shone this week', () => {
    // Wednesday Jan 29, 2026 at 2pm
    const now = new Date('2026-01-29T14:00:00')

    const events: TrunkEvent[] = [
      {
        type: 'sun_shone',
        timestamp: '2026-01-20T10:00:00Z', // Previous week
        twigId: 'branch-0-twig-0',
        twigLabel: 'Test',
        content: 'Old reflection',
      },
    ]

    expect(wasShoneThisWeek(events, now)).toBe(false)
  })

  it('returns false when no sun events exist', () => {
    const now = new Date('2026-01-29T14:00:00')
    expect(wasShoneThisWeek([], now)).toBe(false)
  })
})

describe('getAllWaterEntries', () => {
  it('returns all water entries across sprouts', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T10:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'First Sprout',
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
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T11:00:00Z',
        sproutId: 'sprout-2',
        twigId: 'branch-1-twig-0',
        title: 'Second Sprout',
        season: '1m',
        environment: 'firm',
        soilCost: 5,
      },
      {
        type: 'sprout_watered',
        timestamp: '2026-01-03T10:00:00Z',
        sproutId: 'sprout-2',
        content: 'Second water',
      },
    ]

    const state = deriveState(events)
    const entries = getAllWaterEntries(state)

    expect(entries).toHaveLength(2)
    // Should be sorted by timestamp descending
    expect(entries[0].content).toBe('Second water')
    expect(entries[1].content).toBe('First water')
  })

  it('uses getTwigLabel callback when provided', () => {
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
        content: 'Progress',
      },
    ]

    const state = deriveState(events)
    const getTwigLabel = (twigId: string) => `Custom label for ${twigId}`
    const entries = getAllWaterEntries(state, getTwigLabel)

    expect(entries[0].twigLabel).toBe('Custom label for branch-0-twig-0')
  })

  it('uses twigId as label when no callback provided', () => {
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
        content: 'Progress',
      },
    ]

    const state = deriveState(events)
    const entries = getAllWaterEntries(state)

    expect(entries[0].twigLabel).toBe('branch-0-twig-0')
  })

  it('returns empty array when no water entries', () => {
    const state = deriveState([])
    const entries = getAllWaterEntries(state)

    expect(entries).toHaveLength(0)
  })
})

describe('deriveSoilLog', () => {
  it('logs sprout_planted events', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T10:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Test Sprout',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
    ]

    const log = deriveSoilLog(events)

    expect(log).toHaveLength(1)
    expect(log[0].amount).toBe(-2)
    expect(log[0].reason).toBe('Planted sprout')
    expect(log[0].context).toBe('Test Sprout')
  })

  it('logs sprout_watered events', () => {
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
        content: 'Progress',
      },
    ]

    const log = deriveSoilLog(events)

    expect(log).toHaveLength(2)
    expect(log[1].amount).toBe(0.05)
    expect(log[1].reason).toBe('Watered sprout')
    expect(log[1].context).toBe('Test')
  })

  it('logs sprout_harvested events', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T10:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Harvested One',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
      {
        type: 'sprout_harvested',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sprout-1',
        result: 4,
        capacityGained: 1.5,
      },
    ]

    const log = deriveSoilLog(events)

    expect(log).toHaveLength(2)
    expect(log[1].amount).toBe(1.5)
    expect(log[1].reason).toBe('Harvested (4/5)')
    expect(log[1].context).toBe('Harvested One')
  })

  it('logs sprout_uprooted events', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T10:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Uprooted One',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
      {
        type: 'sprout_uprooted',
        timestamp: '2026-01-05T10:00:00Z',
        sproutId: 'sprout-1',
        soilReturned: 1,
      },
    ]

    const log = deriveSoilLog(events)

    expect(log).toHaveLength(2)
    expect(log[1].amount).toBe(1)
    expect(log[1].reason).toBe('Uprooted sprout')
    expect(log[1].context).toBe('Uprooted One')
  })

  it('logs sun_shone events', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sun_shone',
        timestamp: '2026-01-01T10:00:00Z',
        twigId: 'branch-0-twig-0',
        twigLabel: 'Movement',
        content: 'Deep reflection',
      },
    ]

    const log = deriveSoilLog(events)

    expect(log).toHaveLength(1)
    expect(log[0].amount).toBe(0.35)
    expect(log[0].reason).toBe('Sun reflection')
    expect(log[0].context).toBe('Movement')
  })

  it('returns empty array for no events', () => {
    const log = deriveSoilLog([])
    expect(log).toHaveLength(0)
  })

  it('handles mixed events in order', () => {
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
        content: 'Progress',
      },
      {
        type: 'sun_shone',
        timestamp: '2026-01-03T10:00:00Z',
        twigId: 'branch-0-twig-0',
        twigLabel: 'Movement',
        content: 'Reflection',
      },
      {
        type: 'sprout_harvested',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sprout-1',
        result: 5,
        capacityGained: 0.5,
      },
    ]

    const log = deriveSoilLog(events)

    expect(log).toHaveLength(4)
    expect(log[0].reason).toBe('Planted sprout')
    expect(log[1].reason).toBe('Watered sprout')
    expect(log[2].reason).toBe('Sun reflection')
    expect(log[3].reason).toBe('Harvested (5/5)')
  })
})

// ============================================================================
// Soil Chart Bucketing
// ============================================================================

describe('computeRawSoilHistory', () => {
  it('returns empty array for no events', () => {
    expect(computeRawSoilHistory([])).toHaveLength(0)
  })

  it('tracks soil changes from plant/water/harvest events', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T10:00:00Z',
        sproutId: 's1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
      {
        type: 'sprout_watered',
        timestamp: '2026-01-02T10:00:00Z',
        sproutId: 's1',
        content: 'Hi',
      },
    ]

    const history = computeRawSoilHistory(events)

    expect(history).toHaveLength(2)
    // After planting: capacity=10, available=8
    expect(history[0].capacity).toBe(10)
    expect(history[0].available).toBe(8)
    // After watering: capacity=10, available=8.05
    expect(history[1].capacity).toBe(10)
    expect(history[1].available).toBeCloseTo(8.05)
  })

  it('handles harvest with capacity gain and soil return', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T10:00:00Z',
        sproutId: 's1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
      {
        type: 'sprout_harvested',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 's1',
        result: 5,
        capacityGained: 0.5,
      },
    ]

    const history = computeRawSoilHistory(events)

    expect(history).toHaveLength(2)
    // After harvest: capacity=10.5, available=min(8+2, 10.5)=10
    expect(history[1].capacity).toBe(10.5)
    expect(history[1].available).toBe(10)
  })
})

describe('bucketSoilData', () => {
  it('returns empty array for empty history', () => {
    const result = bucketSoilData([], '1d', new Date('2026-01-15T12:00:00'))
    expect(result).toHaveLength(0)
  })

  it('generates hourly buckets for 1d range', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-14T16:12:00Z',
        sproutId: 's1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
    ]

    const rawHistory = computeRawSoilHistory(events)
    const now = new Date('2026-01-15T12:00:00Z')
    const points = bucketSoilData(rawHistory, '1d', now)

    // Should have ~24 hourly buckets (from Jan 14 12:00 to Jan 15 12:00)
    expect(points.length).toBeGreaterThanOrEqual(23)
    expect(points.length).toBeLessThanOrEqual(26)

    // All points should be evenly spaced (1 hour apart, except possibly the last)
    for (let i = 1; i < points.length - 1; i++) {
      const diff = points[i].timestamp.getTime() - points[i - 1].timestamp.getTime()
      expect(diff).toBe(3600000) // 1 hour in ms
    }
  })

  it('carries forward values for empty buckets', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-14T08:00:00Z',
        sproutId: 's1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
    ]

    const rawHistory = computeRawSoilHistory(events)
    const now = new Date('2026-01-15T12:00:00Z')
    const points = bucketSoilData(rawHistory, '1d', now)

    // The event is within the 1d window, so after it all points should show
    // capacity=10, available=8
    const pointsAfterEvent = points.filter(
      (p) => p.timestamp.getTime() >= new Date('2026-01-14T09:00:00Z').getTime()
    )
    for (const p of pointsAfterEvent) {
      expect(p.capacity).toBe(10)
      expect(p.available).toBe(8)
    }
  })

  it('generates daily buckets for 1m range', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T10:00:00Z',
        sproutId: 's1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
    ]

    const rawHistory = computeRawSoilHistory(events)
    const now = new Date('2026-01-31T12:00:00Z')
    const points = bucketSoilData(rawHistory, '1m', now)

    // Should have ~30-32 daily buckets
    expect(points.length).toBeGreaterThanOrEqual(28)
    expect(points.length).toBeLessThanOrEqual(33)
  })

  it('generates semimonthly buckets for 6m range', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2025-08-01T10:00:00Z',
        sproutId: 's1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
    ]

    const rawHistory = computeRawSoilHistory(events)
    const now = new Date('2026-01-31T12:00:00Z')
    const points = bucketSoilData(rawHistory, '6m', now)

    // 6 months ~ 12 semimonthly periods + final = ~13 points
    expect(points.length).toBeGreaterThanOrEqual(10)
    expect(points.length).toBeLessThanOrEqual(16)
  })

  it('uses adaptive bucketing for "all" range', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2025-01-01T10:00:00Z',
        sproutId: 's1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
    ]

    const rawHistory = computeRawSoilHistory(events)
    const now = new Date('2026-01-31T12:00:00Z')
    const points = bucketSoilData(rawHistory, 'all', now)

    // Should aim for ~24 nodes (+/- final boundary)
    expect(points.length).toBeGreaterThanOrEqual(20)
    expect(points.length).toBeLessThanOrEqual(28)
  })

  it('initializes carry-forward from events before range window', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2025-12-01T10:00:00Z',
        sproutId: 's1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
    ]

    const rawHistory = computeRawSoilHistory(events)
    const now = new Date('2026-01-15T12:00:00Z')
    // 1d range: Jan 14 12:00 to Jan 15 12:00 — event is before the window
    const points = bucketSoilData(rawHistory, '1d', now)

    // All points should carry forward the post-plant state (capacity=10, available=8)
    for (const p of points) {
      expect(p.capacity).toBe(10)
      expect(p.available).toBe(8)
    }
  })

  it('uses starting capacity when no events precede range', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-15T16:00:00Z',
        sproutId: 's1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
    ]

    const rawHistory = computeRawSoilHistory(events)
    const now = new Date('2026-01-15T20:00:00Z')
    const points = bucketSoilData(rawHistory, '1d', now)

    // First point (before the event) should show starting capacity
    expect(points[0].capacity).toBe(10)
    expect(points[0].available).toBe(10)

    // Later points after the event should show reduced available
    const lastPoint = points[points.length - 1]
    expect(lastPoint.available).toBe(8)
  })

  it('generates weekly buckets for 3m range', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2025-11-01T10:00:00Z',
        sproutId: 's1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
    ]

    const rawHistory = computeRawSoilHistory(events)
    const now = new Date('2026-01-31T12:00:00Z')
    const points = bucketSoilData(rawHistory, '3m', now)

    // 3 months ~ 13 weeks + final
    expect(points.length).toBeGreaterThanOrEqual(12)
    expect(points.length).toBeLessThanOrEqual(16)
  })
})
