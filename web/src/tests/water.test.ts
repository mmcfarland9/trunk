/**
 * Tests for water system - daily resource management.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { getTodayResetTime, getNextWaterReset, getWaterCapacity, getWeekResetTime } from '../state'
import { wasSproutWateredThisWeek } from '../events'
import type { TrunkEvent } from '../events'

describe('Water Reset Time', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getTodayResetTime', () => {
    it('returns 6am today when current time is after 6am', () => {
      // Set time to 10am on Jan 15, 2024
      const now = new Date(2024, 0, 15, 10, 0, 0)
      vi.setSystemTime(now)

      const reset = getTodayResetTime()

      expect(reset.getFullYear()).toBe(2024)
      expect(reset.getMonth()).toBe(0) // January
      expect(reset.getDate()).toBe(15)
      expect(reset.getHours()).toBe(6)
      expect(reset.getMinutes()).toBe(0)
      expect(reset.getSeconds()).toBe(0)
    })

    it('returns 6am yesterday when current time is before 6am', () => {
      // Set time to 3am on Jan 15, 2024
      const now = new Date(2024, 0, 15, 3, 0, 0)
      vi.setSystemTime(now)

      const reset = getTodayResetTime()

      expect(reset.getFullYear()).toBe(2024)
      expect(reset.getMonth()).toBe(0) // January
      expect(reset.getDate()).toBe(14) // Yesterday
      expect(reset.getHours()).toBe(6)
      expect(reset.getMinutes()).toBe(0)
    })

    it('returns 6am today when time is exactly 6am', () => {
      // Set time to exactly 6am on Jan 15, 2024
      const now = new Date(2024, 0, 15, 6, 0, 0)
      vi.setSystemTime(now)

      const reset = getTodayResetTime()

      expect(reset.getDate()).toBe(15) // Today
      expect(reset.getHours()).toBe(6)
    })

    it('handles month boundary correctly (before 6am on 1st)', () => {
      // Set time to 2am on Feb 1, 2024
      const now = new Date(2024, 1, 1, 2, 0, 0)
      vi.setSystemTime(now)

      const reset = getTodayResetTime()

      expect(reset.getMonth()).toBe(0) // January
      expect(reset.getDate()).toBe(31) // Last day of January
    })

    it('handles year boundary correctly (before 6am on Jan 1)', () => {
      // Set time to 2am on Jan 1, 2024
      const now = new Date(2024, 0, 1, 2, 0, 0)
      vi.setSystemTime(now)

      const reset = getTodayResetTime()

      expect(reset.getFullYear()).toBe(2023) // Last year
      expect(reset.getMonth()).toBe(11) // December
      expect(reset.getDate()).toBe(31)
    })
  })

  describe('getNextWaterReset', () => {
    it('returns tomorrow 6am when after 6am today', () => {
      // Set time to 10am on Jan 15, 2024
      const now = new Date(2024, 0, 15, 10, 0, 0)
      vi.setSystemTime(now)

      const nextReset = getNextWaterReset()

      expect(nextReset.getDate()).toBe(16) // Tomorrow
      expect(nextReset.getHours()).toBe(6)
    })

    it('returns today 6am when before 6am', () => {
      // Set time to 3am on Jan 15, 2024
      const now = new Date(2024, 0, 15, 3, 0, 0)
      vi.setSystemTime(now)

      const nextReset = getNextWaterReset()

      expect(nextReset.getDate()).toBe(15) // Today
      expect(nextReset.getHours()).toBe(6)
    })
  })
})

describe('Water Availability', () => {
  it('returns correct water capacity', () => {
    expect(getWaterCapacity()).toBe(3)
  })
})

describe('wasSproutWateredThisWeek (events-based)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false when no water events exist', () => {
    const events: TrunkEvent[] = []
    expect(wasSproutWateredThisWeek(events, 'sprout-1')).toBe(false)
  })

  it('returns false when water event is for different sprout', () => {
    const now = new Date(2024, 0, 17, 10, 0, 0) // Wednesday
    vi.setSystemTime(now)

    const events: TrunkEvent[] = [
      {
        type: 'sprout_watered',
        timestamp: new Date(2024, 0, 16, 10, 0, 0).toISOString(), // Tuesday
        sproutId: 'other-sprout',
        content: 'reflection',
      },
    ]

    expect(wasSproutWateredThisWeek(events, 'sprout-1', now)).toBe(false)
  })

  it('returns true when sprout has recent water event this week', () => {
    // Set time to Wednesday 10am
    const now = new Date(2024, 0, 17, 10, 0, 0)
    vi.setSystemTime(now)

    getWeekResetTime() // Monday 6am = Jan 15

    const events: TrunkEvent[] = [
      {
        type: 'sprout_watered',
        timestamp: new Date(2024, 0, 16, 10, 0, 0).toISOString(), // Tuesday
        sproutId: 'sprout-1',
        content: 'Test reflection',
      },
    ]

    expect(wasSproutWateredThisWeek(events, 'sprout-1', now)).toBe(true)
  })

  it('returns false when water event is from last week', () => {
    // Set time to Wednesday 10am
    const now = new Date(2024, 0, 17, 10, 0, 0) // Wednesday Jan 17
    vi.setSystemTime(now)

    const events: TrunkEvent[] = [
      {
        type: 'sprout_watered',
        timestamp: new Date(2024, 0, 10, 10, 0, 0).toISOString(), // Last Wednesday Jan 10
        sproutId: 'sprout-1',
        content: 'Old reflection',
      },
    ]

    expect(wasSproutWateredThisWeek(events, 'sprout-1', now)).toBe(false)
  })

  it('returns true when at least one water event is from this week', () => {
    const now = new Date(2024, 0, 17, 10, 0, 0) // Wednesday
    vi.setSystemTime(now)

    const events: TrunkEvent[] = [
      {
        type: 'sprout_watered',
        timestamp: new Date(2024, 0, 5, 10, 0, 0).toISOString(), // Old
        sproutId: 'sprout-1',
        content: 'Old reflection',
      },
      {
        type: 'sprout_watered',
        timestamp: new Date(2024, 0, 15, 10, 0, 0).toISOString(), // This week (Monday)
        sproutId: 'sprout-1',
        content: 'Recent reflection',
      },
    ]

    expect(wasSproutWateredThisWeek(events, 'sprout-1', now)).toBe(true)
  })
})
