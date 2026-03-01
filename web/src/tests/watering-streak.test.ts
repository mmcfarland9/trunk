/**
 * Tests for deriveWateringStreak.
 * Covers consecutive days, missed days, 6am boundary, and empty events.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { deriveWateringStreak } from '../events/derive'
import type { TrunkEvent } from '../events/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a water event using explicit local-time components.
 * Avoids timezone string ambiguity.
 */
function waterAtLocal(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
  sproutId = 'sprout-1',
): TrunkEvent {
  return {
    type: 'sprout_watered',
    timestamp: new Date(year, month, day, hour, minute).toISOString(),
    sproutId,
    content: 'Progress',
  }
}

// ---------------------------------------------------------------------------
// No events
// ---------------------------------------------------------------------------

describe('deriveWateringStreak — no events', () => {
  it('returns 0/0 for empty events', () => {
    const result = deriveWateringStreak([])
    expect(result.current).toBe(0)
    expect(result.longest).toBe(0)
  })

  it('returns 0/0 for events with no watering', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T10:00:00Z',
        sproutId: 'sp-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
    ]
    const result = deriveWateringStreak(events)
    expect(result.current).toBe(0)
    expect(result.longest).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Single day
// ---------------------------------------------------------------------------

describe('deriveWateringStreak — single day', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('current=1, longest=1 when watered today', () => {
    const now = new Date(2026, 0, 15, 14, 0, 0) // Jan 15 2pm
    vi.setSystemTime(now)

    const events: TrunkEvent[] = [
      waterAtLocal(2026, 0, 15, 10), // 10am today
    ]

    const result = deriveWateringStreak(events, now)
    expect(result.current).toBe(1)
    expect(result.longest).toBe(1)
  })

  it('current=0, longest=1 when last watered 2 days ago', () => {
    const now = new Date(2026, 0, 17, 14, 0, 0) // Jan 17 2pm
    vi.setSystemTime(now)

    const events: TrunkEvent[] = [
      waterAtLocal(2026, 0, 15, 10), // Jan 15 10am
    ]

    const result = deriveWateringStreak(events, now)
    expect(result.current).toBe(0) // Not today or yesterday
    expect(result.longest).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Consecutive days
// ---------------------------------------------------------------------------

describe('deriveWateringStreak — consecutive days', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('counts 3 consecutive days', () => {
    const now = new Date(2026, 0, 15, 14, 0, 0) // Jan 15 2pm
    vi.setSystemTime(now)

    const events: TrunkEvent[] = [
      waterAtLocal(2026, 0, 13, 10), // Jan 13
      waterAtLocal(2026, 0, 14, 10), // Jan 14
      waterAtLocal(2026, 0, 15, 10), // Jan 15 (today)
    ]

    const result = deriveWateringStreak(events, now)
    expect(result.current).toBe(3)
    expect(result.longest).toBe(3)
  })

  it('counts 5 consecutive days ending yesterday', () => {
    const now = new Date(2026, 0, 16, 14, 0, 0) // Jan 16 2pm
    vi.setSystemTime(now)

    const events: TrunkEvent[] = [
      waterAtLocal(2026, 0, 11, 10),
      waterAtLocal(2026, 0, 12, 10),
      waterAtLocal(2026, 0, 13, 10),
      waterAtLocal(2026, 0, 14, 10),
      waterAtLocal(2026, 0, 15, 10),
      // Didn't water today (Jan 16)
    ]

    const result = deriveWateringStreak(events, now)
    expect(result.current).toBe(5) // Yesterday counts, walks back
    expect(result.longest).toBe(5)
  })

  it('multiple waterings on same day count as one day', () => {
    const now = new Date(2026, 0, 15, 20, 0, 0) // Jan 15 8pm
    vi.setSystemTime(now)

    const events: TrunkEvent[] = [
      waterAtLocal(2026, 0, 15, 7), // Morning
      waterAtLocal(2026, 0, 15, 12), // Noon
      waterAtLocal(2026, 0, 15, 18), // Evening
    ]

    const result = deriveWateringStreak(events, now)
    expect(result.current).toBe(1) // Only 1 day
    expect(result.longest).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Missed day resets streak
// ---------------------------------------------------------------------------

describe('deriveWateringStreak — missed day resets', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('gap breaks the current streak', () => {
    const now = new Date(2026, 0, 17, 14, 0, 0) // Jan 17 2pm
    vi.setSystemTime(now)

    const events: TrunkEvent[] = [
      waterAtLocal(2026, 0, 13, 10), // Jan 13
      waterAtLocal(2026, 0, 14, 10), // Jan 14
      // Jan 15 missed
      waterAtLocal(2026, 0, 16, 10), // Jan 16
      waterAtLocal(2026, 0, 17, 10), // Jan 17 (today)
    ]

    const result = deriveWateringStreak(events, now)
    expect(result.current).toBe(2) // Jan 16 + Jan 17
    expect(result.longest).toBe(2) // Both runs are 2
  })

  it('longest tracks historical best, current tracks recent', () => {
    const now = new Date(2026, 0, 20, 14, 0, 0) // Jan 20 2pm
    vi.setSystemTime(now)

    const events: TrunkEvent[] = [
      // First run: 5 consecutive days
      waterAtLocal(2026, 0, 5, 10),
      waterAtLocal(2026, 0, 6, 10),
      waterAtLocal(2026, 0, 7, 10),
      waterAtLocal(2026, 0, 8, 10),
      waterAtLocal(2026, 0, 9, 10),
      // Gap on Jan 10
      // Second run: 2 consecutive days ending today
      waterAtLocal(2026, 0, 19, 10),
      waterAtLocal(2026, 0, 20, 10),
    ]

    const result = deriveWateringStreak(events, now)
    expect(result.current).toBe(2) // Recent run
    expect(result.longest).toBe(5) // Historical best
  })
})

// ---------------------------------------------------------------------------
// 6am boundary
// ---------------------------------------------------------------------------

describe('deriveWateringStreak — 6am boundary', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('water at 5:59am counts as previous day', () => {
    const now = new Date(2026, 0, 16, 14, 0, 0) // Jan 16 2pm
    vi.setSystemTime(now)

    const events: TrunkEvent[] = [
      waterAtLocal(2026, 0, 15, 10), // Jan 15 10am — counts as Jan 15
      // Water at 5:59am Jan 16 — counts as Jan 15 (before 6am reset)
      waterAtLocal(2026, 0, 16, 5, 59),
    ]

    const result = deriveWateringStreak(events, now)
    // Both waters are on the same "day" (Jan 15 reset-to-reset)
    // The Jan 16 water at 5:59am is before the 6am reset, so it belongs to Jan 15
    // Today (Jan 16 2pm) has NOT been watered since 6am
    // Current streak: yesterday (Jan 15) = 1
    expect(result.current).toBe(1)
  })

  it('water at 6:01am counts as new day', () => {
    const now = new Date(2026, 0, 16, 14, 0, 0) // Jan 16 2pm
    vi.setSystemTime(now)

    const events: TrunkEvent[] = [
      waterAtLocal(2026, 0, 15, 10), // Jan 15 10am
      waterAtLocal(2026, 0, 16, 6, 1), // Jan 16 6:01am — new day
    ]

    const result = deriveWateringStreak(events, now)
    // Jan 15 and Jan 16 are consecutive days
    expect(result.current).toBe(2)
  })

  it('late night (11pm) and early morning (5am) count as same day', () => {
    const now = new Date(2026, 0, 16, 14, 0, 0) // Jan 16 2pm
    vi.setSystemTime(now)

    const events: TrunkEvent[] = [
      waterAtLocal(2026, 0, 15, 23), // Jan 15 11pm — day "Jan 15"
      waterAtLocal(2026, 0, 16, 5), // Jan 16 5am — still day "Jan 15" (before 6am)
    ]

    const result = deriveWateringStreak(events, now)
    // Both belong to Jan 15 (6am-6am window)
    // Today Jan 16 after 6am has no water
    // Current: yesterday (Jan 15) = 1
    expect(result.current).toBe(1)
  })

  it('water at 11:30pm then 6:30am next calendar day = 2 consecutive days', () => {
    const now = new Date(2026, 0, 16, 14, 0, 0) // Jan 16 2pm
    vi.setSystemTime(now)

    const events: TrunkEvent[] = [
      waterAtLocal(2026, 0, 15, 23, 30), // Jan 15 11:30pm — day "Jan 15"
      waterAtLocal(2026, 0, 16, 6, 30), // Jan 16 6:30am — day "Jan 16"
    ]

    const result = deriveWateringStreak(events, now)
    expect(result.current).toBe(2) // Two consecutive days
  })

  it('now before 6am: today is still yesterday for streak purposes', () => {
    // It's 4am on Jan 16 — the "day" is still Jan 15
    const now = new Date(2026, 0, 16, 4, 0, 0)
    vi.setSystemTime(now)

    const events: TrunkEvent[] = [
      waterAtLocal(2026, 0, 15, 10), // Jan 15 10am
    ]

    const result = deriveWateringStreak(events, now)
    // "Today" at 4am is still in the Jan 15 day (6am-6am)
    // The water at Jan 15 10am is in this same day
    expect(result.current).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Different sprouts
// ---------------------------------------------------------------------------

describe('deriveWateringStreak — different sprouts', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('waterings on different sprouts still count for streak', () => {
    const now = new Date(2026, 0, 15, 14, 0, 0)
    vi.setSystemTime(now)

    const events: TrunkEvent[] = [
      waterAtLocal(2026, 0, 13, 10, 0, 'sp-1'),
      waterAtLocal(2026, 0, 14, 10, 0, 'sp-2'),
      waterAtLocal(2026, 0, 15, 10, 0, 'sp-3'),
    ]

    const result = deriveWateringStreak(events, now)
    expect(result.current).toBe(3)
    expect(result.longest).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Long streaks
// ---------------------------------------------------------------------------

describe('deriveWateringStreak — long streaks', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('handles 30-day streak', () => {
    const now = new Date(2026, 0, 31, 14, 0, 0)
    vi.setSystemTime(now)

    const events: TrunkEvent[] = []
    for (let d = 2; d <= 31; d++) {
      events.push(waterAtLocal(2026, 0, d, 10))
    }

    const result = deriveWateringStreak(events, now)
    expect(result.current).toBe(30)
    expect(result.longest).toBe(30)
  })
})

// ---------------------------------------------------------------------------
// Edge: non-water events are ignored
// ---------------------------------------------------------------------------

describe('deriveWateringStreak — non-water events', () => {
  it('ignores sun, plant, harvest events', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T10:00:00Z',
        sproutId: 'sp-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
      {
        type: 'sun_shone',
        timestamp: '2026-01-02T10:00:00Z',
        twigId: 'branch-0-twig-0',
        twigLabel: 'Movement',
        content: 'Reflect',
      },
      {
        type: 'sprout_harvested',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sp-1',
        result: 5,
        capacityGained: 0.5,
      },
    ]

    const result = deriveWateringStreak(events)
    expect(result.current).toBe(0)
    expect(result.longest).toBe(0)
  })
})
