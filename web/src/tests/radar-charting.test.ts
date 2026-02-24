/**
 * Tests for radar chart data computation.
 * Covers computeBranchEngagement with events across all, some, and no branches,
 * plus score normalization.
 */

import { describe, it, expect } from 'vitest'
import { computeBranchEngagement } from '../events/radar-charting'
import type { TrunkEvent } from '../events/types'
import { BRANCH_COUNT } from '../constants'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function plantEvent(branchIndex: number, twigIndex: number, sproutId: string): TrunkEvent {
  return {
    type: 'sprout_planted',
    timestamp: '2026-01-01T10:00:00Z',
    sproutId,
    twigId: `branch-${branchIndex}-twig-${twigIndex}`,
    title: `Sprout on B${branchIndex}`,
    season: '2w',
    environment: 'fertile',
    soilCost: 2,
  }
}

function waterEvent(sproutId: string): TrunkEvent {
  return {
    type: 'sprout_watered',
    timestamp: '2026-01-02T10:00:00Z',
    sproutId,
    content: 'Progress',
  }
}

function sunEvent(branchIndex: number, twigIndex: number): TrunkEvent {
  return {
    type: 'sun_shone',
    timestamp: '2026-01-03T10:00:00Z',
    twigId: `branch-${branchIndex}-twig-${twigIndex}`,
    twigLabel: `B${branchIndex} T${twigIndex}`,
    content: 'Reflection',
  }
}

function harvestEvent(sproutId: string): TrunkEvent {
  return {
    type: 'sprout_harvested',
    timestamp: '2026-01-15T10:00:00Z',
    sproutId,
    result: 4,
    capacityGained: 0.5,
  }
}

// ---------------------------------------------------------------------------
// No events
// ---------------------------------------------------------------------------

describe('computeBranchEngagement — no events', () => {
  it('returns 8 branches with zero scores', () => {
    const result = computeBranchEngagement([])

    expect(result).toHaveLength(BRANCH_COUNT)
    for (const branch of result) {
      expect(branch.score).toBe(0)
      expect(branch.rawTotal).toBe(0)
      expect(branch.planted).toBe(0)
      expect(branch.watered).toBe(0)
      expect(branch.sunReflections).toBe(0)
      expect(branch.harvested).toBe(0)
    }
  })

  it('assigns correct branchIndex to each entry', () => {
    const result = computeBranchEngagement([])

    for (let i = 0; i < BRANCH_COUNT; i++) {
      expect(result[i].branchIndex).toBe(i)
    }
  })

  it('assigns branch names from presets', () => {
    const result = computeBranchEngagement([])

    // Branch 0 is "CORE", Branch 1 is "BRAIN", etc.
    expect(result[0].branchName).toBe('CORE')
    expect(result[1].branchName).toBe('BRAIN')
    expect(result[7].branchName).toBe('FEET')
  })
})

// ---------------------------------------------------------------------------
// Events on a single branch
// ---------------------------------------------------------------------------

describe('computeBranchEngagement — single branch', () => {
  it('counts planted events', () => {
    const events: TrunkEvent[] = [plantEvent(0, 0, 'sp-1'), plantEvent(0, 1, 'sp-2')]

    const result = computeBranchEngagement(events)

    expect(result[0].planted).toBe(2)
    expect(result[0].rawTotal).toBe(2)
    expect(result[0].score).toBe(1) // max branch = 1.0
  })

  it('counts watered events via sproutId lookup', () => {
    const events: TrunkEvent[] = [plantEvent(0, 0, 'sp-1'), waterEvent('sp-1'), waterEvent('sp-1')]

    const result = computeBranchEngagement(events)

    expect(result[0].watered).toBe(2)
    expect(result[0].planted).toBe(1)
    expect(result[0].rawTotal).toBe(3)
  })

  it('counts sun reflections', () => {
    const events: TrunkEvent[] = [sunEvent(2, 0), sunEvent(2, 3)]

    const result = computeBranchEngagement(events)

    expect(result[2].sunReflections).toBe(2)
    expect(result[2].rawTotal).toBe(2)
    expect(result[2].score).toBe(1)
  })

  it('counts harvested events via sproutId lookup', () => {
    const events: TrunkEvent[] = [plantEvent(3, 0, 'sp-1'), harvestEvent('sp-1')]

    const result = computeBranchEngagement(events)

    expect(result[3].harvested).toBe(1)
    expect(result[3].planted).toBe(1)
    expect(result[3].rawTotal).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Events across multiple branches
// ---------------------------------------------------------------------------

describe('computeBranchEngagement — multiple branches', () => {
  it('distributes counts to correct branches', () => {
    const events: TrunkEvent[] = [
      plantEvent(0, 0, 'sp-1'), // Branch 0
      plantEvent(1, 0, 'sp-2'), // Branch 1
      plantEvent(7, 0, 'sp-3'), // Branch 7
      sunEvent(3, 0), // Branch 3
      waterEvent('sp-1'), // Branch 0
      harvestEvent('sp-2'), // Branch 1
    ]

    const result = computeBranchEngagement(events)

    // Branch 0: 1 planted + 1 watered = 2
    expect(result[0].rawTotal).toBe(2)
    // Branch 1: 1 planted + 1 harvested = 2
    expect(result[1].rawTotal).toBe(2)
    // Branch 3: 1 sun = 1
    expect(result[3].rawTotal).toBe(1)
    // Branch 7: 1 planted = 1
    expect(result[7].rawTotal).toBe(1)
    // Others: 0
    expect(result[2].rawTotal).toBe(0)
    expect(result[4].rawTotal).toBe(0)
    expect(result[5].rawTotal).toBe(0)
    expect(result[6].rawTotal).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Events across all branches
// ---------------------------------------------------------------------------

describe('computeBranchEngagement — all branches', () => {
  it('handles events on all 8 branches', () => {
    const events: TrunkEvent[] = []

    for (let i = 0; i < BRANCH_COUNT; i++) {
      events.push(plantEvent(i, 0, `sp-${i}`))
    }

    const result = computeBranchEngagement(events)

    for (let i = 0; i < BRANCH_COUNT; i++) {
      expect(result[i].planted).toBe(1)
      expect(result[i].rawTotal).toBe(1)
    }
  })
})

// ---------------------------------------------------------------------------
// Score normalization
// ---------------------------------------------------------------------------

describe('computeBranchEngagement — score normalization', () => {
  it('normalizes max branch to 1.0', () => {
    const events: TrunkEvent[] = [
      // Branch 0: 2 plants (2+2=4) + 2 waters (0.1) + 1 sun (0.35) = 4.45 weighted
      plantEvent(0, 0, 'sp-1'),
      plantEvent(0, 1, 'sp-2'),
      waterEvent('sp-1'),
      waterEvent('sp-2'),
      sunEvent(0, 0),
      // Branch 1: 1 plant (2) + 1 water (0.05) = 2.05 weighted
      plantEvent(1, 0, 'sp-3'),
      waterEvent('sp-3'),
    ]

    const result = computeBranchEngagement(events)

    expect(result[0].score).toBe(1) // max
    expect(result[0].rawTotal).toBe(5)

    // Weighted: 2.05 / 4.45 ≈ 0.4607
    expect(result[1].score).toBeCloseTo(2.05 / 4.45)
    expect(result[1].rawTotal).toBe(2)
  })

  it('all scores are 0 when no events', () => {
    const result = computeBranchEngagement([])

    for (const branch of result) {
      expect(branch.score).toBe(0)
    }
  })

  it('all scores are 1.0 when all branches have equal activity', () => {
    const events: TrunkEvent[] = []

    for (let i = 0; i < BRANCH_COUNT; i++) {
      events.push(plantEvent(i, 0, `sp-${i}`))
    }

    const result = computeBranchEngagement(events)

    for (const branch of result) {
      expect(branch.score).toBe(1) // all equal = all 1.0
    }
  })

  it('scores range from 0 to 1', () => {
    const events: TrunkEvent[] = [
      // Heavily use branch 0
      plantEvent(0, 0, 'sp-1'),
      plantEvent(0, 1, 'sp-2'),
      plantEvent(0, 2, 'sp-3'),
      waterEvent('sp-1'),
      waterEvent('sp-2'),
      waterEvent('sp-3'),
      sunEvent(0, 0),
      sunEvent(0, 1),
      harvestEvent('sp-1'),
      harvestEvent('sp-2'),
      // Lightly use branch 1
      plantEvent(1, 0, 'sp-4'),
      // Leave branches 2-7 empty
    ]

    const result = computeBranchEngagement(events)

    for (const branch of result) {
      expect(branch.score).toBeGreaterThanOrEqual(0)
      expect(branch.score).toBeLessThanOrEqual(1)
    }

    expect(result[0].score).toBe(1) // max
    expect(result[1].score).toBeGreaterThan(0)
    expect(result[1].score).toBeLessThan(1)
    // Empty branches
    for (let i = 2; i < BRANCH_COUNT; i++) {
      expect(result[i].score).toBe(0)
    }
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('computeBranchEngagement — edge cases', () => {
  it('water for unknown sprout is ignored', () => {
    const events: TrunkEvent[] = [waterEvent('nonexistent')]

    const result = computeBranchEngagement(events)

    // No branch gets the count since sprout twigId unknown
    for (const branch of result) {
      expect(branch.watered).toBe(0)
    }
  })

  it('harvest for unknown sprout is ignored', () => {
    const events: TrunkEvent[] = [harvestEvent('nonexistent')]

    const result = computeBranchEngagement(events)

    for (const branch of result) {
      expect(branch.harvested).toBe(0)
    }
  })

  it('ignores uprooted events (not tracked)', () => {
    const events: TrunkEvent[] = [
      plantEvent(0, 0, 'sp-1'),
      {
        type: 'sprout_uprooted',
        timestamp: '2026-01-05T10:00:00Z',
        sproutId: 'sp-1',
        soilReturned: 1,
      },
    ]

    const result = computeBranchEngagement(events)

    // Only planted counted, uproot is not tracked
    expect(result[0].rawTotal).toBe(1)
    expect(result[0].planted).toBe(1)
  })

  it('ignores leaf_created events', () => {
    const events: TrunkEvent[] = [
      {
        type: 'leaf_created',
        timestamp: '2026-01-01T10:00:00Z',
        leafId: 'leaf-1',
        twigId: 'branch-0-twig-0',
        name: 'Saga',
      },
    ]

    const result = computeBranchEngagement(events)

    for (const branch of result) {
      expect(branch.rawTotal).toBe(0)
    }
  })

  it('handles invalid twigId gracefully', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T10:00:00Z',
        sproutId: 'sp-1',
        twigId: 'invalid-twig-id',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
    ]

    const result = computeBranchEngagement(events)

    // Invalid twigId should be silently ignored
    for (const branch of result) {
      expect(branch.rawTotal).toBe(0)
    }
  })
})
