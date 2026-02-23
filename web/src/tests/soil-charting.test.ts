/**
 * Tests for soil charting: computeRawSoilHistory, bucketSoilData, deriveSoilLog.
 *
 * Complements the partial coverage in derive.test.ts with focused edge cases
 * for all 7 bucket ranges and soil log derivation.
 */

import { describe, it, expect } from 'vitest'
import { computeRawSoilHistory, bucketSoilData, deriveSoilLog } from '../events/soil-charting'
import type { TrunkEvent } from '../events/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function plantEvent(overrides: Partial<TrunkEvent & { type: 'sprout_planted' }> = {}): TrunkEvent {
  return {
    type: 'sprout_planted',
    timestamp: '2026-01-01T10:00:00Z',
    sproutId: 'sprout-1',
    twigId: 'branch-0-twig-0',
    title: 'Test',
    season: '2w',
    environment: 'fertile',
    soilCost: 2,
    ...overrides,
  }
}

function waterEvent(overrides: Partial<TrunkEvent & { type: 'sprout_watered' }> = {}): TrunkEvent {
  return {
    type: 'sprout_watered',
    timestamp: '2026-01-02T10:00:00Z',
    sproutId: 'sprout-1',
    content: 'Progress',
    ...overrides,
  }
}

function harvestEvent(
  overrides: Partial<TrunkEvent & { type: 'sprout_harvested' }> = {},
): TrunkEvent {
  return {
    type: 'sprout_harvested',
    timestamp: '2026-01-15T10:00:00Z',
    sproutId: 'sprout-1',
    result: 5,
    capacityGained: 0.5,
    ...overrides,
  }
}

// ============================================================================
// computeRawSoilHistory
// ============================================================================

describe('computeRawSoilHistory', () => {
  it('returns empty for no events', () => {
    expect(computeRawSoilHistory([])).toHaveLength(0)
  })

  it('returns one snapshot per soil-changing event', () => {
    const events: TrunkEvent[] = [plantEvent(), waterEvent()]

    const history = computeRawSoilHistory(events)
    expect(history).toHaveLength(2)
  })

  it('ignores non-soil-changing events (leaf_created)', () => {
    const events: TrunkEvent[] = [
      {
        type: 'leaf_created',
        timestamp: '2026-01-01T10:00:00Z',
        leafId: 'leaf-1',
        twigId: 'branch-0-twig-0',
        name: 'Saga',
      },
    ]

    const history = computeRawSoilHistory(events)
    expect(history).toHaveLength(0)
  })

  it('tracks capacity + available after plant', () => {
    const history = computeRawSoilHistory([plantEvent({ soilCost: 3 })])

    expect(history).toHaveLength(1)
    expect(history[0].capacity).toBe(10)
    expect(history[0].available).toBe(7) // 10 - 3
  })

  it('tracks recovery after water', () => {
    const events: TrunkEvent[] = [plantEvent(), waterEvent()]
    const history = computeRawSoilHistory(events)

    expect(history[1].capacity).toBe(10)
    expect(history[1].available).toBeCloseTo(8.05) // 8 + 0.05
  })

  it('tracks capacity gain after harvest', () => {
    const events: TrunkEvent[] = [
      plantEvent({ soilCost: 2 }),
      harvestEvent({ capacityGained: 1.5 }),
    ]
    const history = computeRawSoilHistory(events)

    expect(history[1].capacity).toBe(11.5) // 10 + 1.5
    expect(history[1].available).toBe(10) // 8 + 2 (return) = 10, capped at 11.5
  })

  it('tracks soil return after uproot', () => {
    const events: TrunkEvent[] = [
      plantEvent({ soilCost: 4 }),
      {
        type: 'sprout_uprooted',
        timestamp: '2026-01-05T10:00:00Z',
        sproutId: 'sprout-1',
        soilReturned: 1,
      },
    ]
    const history = computeRawSoilHistory(events)

    expect(history[1].capacity).toBe(10) // unchanged
    expect(history[1].available).toBe(7) // 6 + 1
  })

  it('tracks soil recovery from sun', () => {
    const events: TrunkEvent[] = [
      plantEvent({ soilCost: 5 }),
      {
        type: 'sun_shone',
        timestamp: '2026-01-03T10:00:00Z',
        twigId: 'branch-0-twig-0',
        twigLabel: 'Movement',
        content: 'Reflection',
      },
    ]
    const history = computeRawSoilHistory(events)

    expect(history[1].capacity).toBe(10)
    expect(history[1].available).toBeCloseTo(5.35) // 5 + 0.35
  })

  it('sorts out-of-order events before replay', () => {
    const events: TrunkEvent[] = [
      waterEvent({ timestamp: '2026-01-02T10:00:00Z' }),
      plantEvent({ timestamp: '2026-01-01T10:00:00Z' }),
    ]
    const history = computeRawSoilHistory(events)

    // Plant should come first
    expect(history[0].available).toBe(8) // after plant
    expect(history[1].available).toBeCloseTo(8.05) // after water
  })

  it('clamps available to 0 minimum', () => {
    const events: TrunkEvent[] = [
      plantEvent({ sproutId: 'sp-1', soilCost: 6 }),
      plantEvent({
        sproutId: 'sp-2',
        soilCost: 6,
        timestamp: '2026-01-02T10:00:00Z',
      }),
    ]
    const history = computeRawSoilHistory(events)

    expect(history[0].available).toBe(4) // 10 - 6
    expect(history[1].available).toBe(0) // max(0, 4 - 6)
  })

  it('handles realistic multi-event sequence', () => {
    const events: TrunkEvent[] = [
      plantEvent({ soilCost: 5 }),
      waterEvent({ timestamp: '2026-01-02T10:00:00Z' }),
      {
        type: 'sun_shone',
        timestamp: '2026-01-03T10:00:00Z',
        twigId: 'branch-0-twig-0',
        twigLabel: 'Movement',
        content: 'Reflect',
      },
      harvestEvent({ capacityGained: 2 }),
    ]
    const history = computeRawSoilHistory(events)

    expect(history).toHaveLength(4)
    // After plant: cap=10, avail=5
    expect(history[0].available).toBe(5)
    // After water: cap=10, avail=5.05
    expect(history[1].available).toBeCloseTo(5.05)
    // After sun: cap=10, avail=5.40
    expect(history[2].available).toBeCloseTo(5.4)
    // After harvest: cap=12, avail=min(5.40+5, 12) = 10.40
    expect(history[3].capacity).toBe(12)
    expect(history[3].available).toBeCloseTo(10.4)
  })
})

// ============================================================================
// bucketSoilData — all 7 ranges
// ============================================================================

describe('bucketSoilData — all ranges', () => {
  // Shared events spanning a wide timeframe for bucket tests
  const wideEvents: TrunkEvent[] = [
    plantEvent({ timestamp: '2025-01-15T10:00:00Z', soilCost: 3 }),
    waterEvent({ timestamp: '2025-03-01T10:00:00Z' }),
    harvestEvent({ timestamp: '2025-06-01T10:00:00Z', capacityGained: 1 }),
    plantEvent({
      sproutId: 'sp-2',
      timestamp: '2025-09-01T10:00:00Z',
      soilCost: 2,
    }),
  ]
  const wideHistory = computeRawSoilHistory(wideEvents)
  const now = new Date('2026-01-15T12:00:00Z')

  it('returns empty for empty history', () => {
    expect(bucketSoilData([], '1d', now)).toHaveLength(0)
    expect(bucketSoilData([], '1w', now)).toHaveLength(0)
    expect(bucketSoilData([], '1m', now)).toHaveLength(0)
    expect(bucketSoilData([], '3m', now)).toHaveLength(0)
    expect(bucketSoilData([], '6m', now)).toHaveLength(0)
    expect(bucketSoilData([], 'ytd', now)).toHaveLength(0)
    expect(bucketSoilData([], 'all', now)).toHaveLength(0)
  })

  it('1d range: generates hourly buckets (~24)', () => {
    const points = bucketSoilData(wideHistory, '1d', now)

    expect(points.length).toBeGreaterThanOrEqual(23)
    expect(points.length).toBeLessThanOrEqual(26)

    // All events are before the 1d window, so carry-forward values
    for (const p of points) {
      expect(p.capacity).toBe(11) // 10 + 1 (harvest)
    }
  })

  it('1w range: generates 6-hourly buckets (~28)', () => {
    const points = bucketSoilData(wideHistory, '1w', now)

    expect(points.length).toBeGreaterThanOrEqual(25)
    expect(points.length).toBeLessThanOrEqual(32)
  })

  it('1m range: generates daily buckets (~30)', () => {
    const points = bucketSoilData(wideHistory, '1m', now)

    expect(points.length).toBeGreaterThanOrEqual(28)
    expect(points.length).toBeLessThanOrEqual(33)
  })

  it('3m range: generates weekly buckets (~13)', () => {
    const points = bucketSoilData(wideHistory, '3m', now)

    expect(points.length).toBeGreaterThanOrEqual(12)
    expect(points.length).toBeLessThanOrEqual(16)
  })

  it('6m range: generates semimonthly buckets (~12)', () => {
    const points = bucketSoilData(wideHistory, '6m', now)

    expect(points.length).toBeGreaterThanOrEqual(10)
    expect(points.length).toBeLessThanOrEqual(16)
  })

  it('ytd range: generates semimonthly buckets from Jan 1', () => {
    const points = bucketSoilData(wideHistory, 'ytd', now)

    // Jan 1 to Jan 15 — only 1 semimonthly boundary (Jan 1) + end
    expect(points.length).toBeGreaterThanOrEqual(2)
    expect(points.length).toBeLessThanOrEqual(4)

    // First point should be on or after Jan 1
    expect(points[0].timestamp.getFullYear()).toBe(2026)
  })

  it('all range: generates adaptive buckets (~24)', () => {
    const points = bucketSoilData(wideHistory, 'all', now)

    expect(points.length).toBeGreaterThanOrEqual(20)
    expect(points.length).toBeLessThanOrEqual(28)

    // First point should be near the first event
    const firstEventTime = new Date('2025-01-15T10:00:00Z').getTime()
    const diff = Math.abs(points[0].timestamp.getTime() - firstEventTime)
    // Should be within a month of the first event
    expect(diff).toBeLessThan(30 * 86400000)
  })

  it('last point of every range is at or near now', () => {
    const ranges = ['1d', '1w', '1m', '3m', '6m', 'ytd', 'all'] as const

    for (const range of ranges) {
      const points = bucketSoilData(wideHistory, range, now)
      if (points.length > 0) {
        const lastTs = points[points.length - 1].timestamp.getTime()
        // Last point should be within 1 day of now
        expect(Math.abs(lastTs - now.getTime())).toBeLessThan(86400000)
      }
    }
  })
})

// ============================================================================
// deriveSoilLog — edge cases
// ============================================================================

describe('deriveSoilLog — edge cases', () => {
  it('returns empty for no events', () => {
    expect(deriveSoilLog([])).toHaveLength(0)
  })

  it('water event for unknown sprout has no context', () => {
    const events: TrunkEvent[] = [waterEvent({ sproutId: 'unknown' })]

    const log = deriveSoilLog(events)

    expect(log).toHaveLength(1)
    expect(log[0].amount).toBe(0.05)
    expect(log[0].context).toBeUndefined()
  })

  it('harvest event for unknown sprout has no context', () => {
    const events: TrunkEvent[] = [
      harvestEvent({ sproutId: 'unknown', result: 3, capacityGained: 0.8 }),
    ]

    const log = deriveSoilLog(events)

    expect(log).toHaveLength(1)
    expect(log[0].amount).toBe(0.8)
    expect(log[0].reason).toBe('Harvested (3/5)')
    expect(log[0].context).toBeUndefined()
  })

  it('uproot event for unknown sprout has no context', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_uprooted',
        timestamp: '2026-01-05T10:00:00Z',
        sproutId: 'unknown',
        soilReturned: 1,
      },
    ]

    const log = deriveSoilLog(events)

    expect(log).toHaveLength(1)
    expect(log[0].amount).toBe(1)
    expect(log[0].context).toBeUndefined()
  })

  it('preserves event order (not sorted)', () => {
    const events: TrunkEvent[] = [
      plantEvent({ sproutId: 'sp-1', title: 'First', timestamp: '2026-01-05T10:00:00Z' }),
      plantEvent({ sproutId: 'sp-2', title: 'Second', timestamp: '2026-01-01T10:00:00Z' }),
    ]

    const log = deriveSoilLog(events)

    // deriveSoilLog does NOT sort — preserves input order
    expect(log[0].context).toBe('First')
    expect(log[1].context).toBe('Second')
  })

  it('log entry amounts match expected soil constants', () => {
    const events: TrunkEvent[] = [
      plantEvent({ soilCost: 7 }),
      waterEvent(),
      {
        type: 'sun_shone',
        timestamp: '2026-01-03T10:00:00Z',
        twigId: 'branch-0-twig-0',
        twigLabel: 'Movement',
        content: 'Reflect',
      },
      harvestEvent({ result: 4, capacityGained: 1.2 }),
      {
        type: 'sprout_uprooted',
        timestamp: '2026-01-20T10:00:00Z',
        sproutId: 'sprout-1',
        soilReturned: 0.5,
      },
    ]

    const log = deriveSoilLog(events)

    expect(log[0].amount).toBe(-7) // plant
    expect(log[1].amount).toBe(0.05) // water
    expect(log[2].amount).toBe(0.35) // sun
    expect(log[3].amount).toBe(1.2) // harvest (capacityGained)
    expect(log[4].amount).toBe(0.5) // uproot
  })
})
