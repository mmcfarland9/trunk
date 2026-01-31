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
} from '../events/derive'
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

  it('resets on Sunday 6am', () => {
    // Wednesday Jan 29, 2026 at 2pm
    const now = new Date('2026-01-29T14:00:00')

    const events: TrunkEvent[] = [
      // Last Saturday (before this week's Sunday reset)
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
