/**
 * Tests for water system - daily resource management.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  getTodayResetTime,
  getNextWaterReset,
  getWaterCapacity,
  wasWateredThisWeek,
  getWeekResetTime,
} from '../state'
import type { Sprout } from '../types'

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

  // Note: getWaterAvailable and getWaterUsedToday depend on nodeState
  // which requires more complex setup. These would be integration tests.
})

describe('wasWateredThisWeek', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false when sprout has no water entries', () => {
    const sprout: Sprout = {
      id: 'test-1',
      title: 'Test Sprout',
      season: '1m',
      environment: 'fertile',
      state: 'active',
      soilCost: 3,
      createdAt: new Date().toISOString(),
      waterEntries: [],
    }

    expect(wasWateredThisWeek(sprout)).toBe(false)
  })

  it('returns false when sprout has undefined water entries', () => {
    const sprout: Sprout = {
      id: 'test-1',
      title: 'Test Sprout',
      season: '1m',
      environment: 'fertile',
      state: 'active',
      soilCost: 3,
      createdAt: new Date().toISOString(),
    }

    expect(wasWateredThisWeek(sprout)).toBe(false)
  })

  it('returns true when sprout has recent water entry', () => {
    // Set time to Wednesday 10am
    const now = new Date(2024, 0, 17, 10, 0, 0) // Wednesday
    vi.setSystemTime(now)

    getWeekResetTime() // Sunday 6am

    const sprout: Sprout = {
      id: 'test-1',
      title: 'Test Sprout',
      season: '1m',
      environment: 'fertile',
      state: 'active',
      soilCost: 3,
      createdAt: new Date().toISOString(),
      waterEntries: [
        {
          timestamp: new Date(2024, 0, 16, 10, 0, 0).toISOString(), // Tuesday
          content: 'Test reflection',
        },
      ],
    }

    expect(wasWateredThisWeek(sprout)).toBe(true)
  })

  it('returns false when water entry is from last week', () => {
    // Set time to Wednesday 10am
    const now = new Date(2024, 0, 17, 10, 0, 0) // Wednesday Jan 17
    vi.setSystemTime(now)

    const sprout: Sprout = {
      id: 'test-1',
      title: 'Test Sprout',
      season: '1m',
      environment: 'fertile',
      state: 'active',
      soilCost: 3,
      createdAt: new Date().toISOString(),
      waterEntries: [
        {
          timestamp: new Date(2024, 0, 10, 10, 0, 0).toISOString(), // Last Wednesday
          content: 'Old reflection',
        },
      ],
    }

    expect(wasWateredThisWeek(sprout)).toBe(false)
  })

  it('returns true when at least one entry is from this week', () => {
    const now = new Date(2024, 0, 17, 10, 0, 0) // Wednesday
    vi.setSystemTime(now)

    const sprout: Sprout = {
      id: 'test-1',
      title: 'Test Sprout',
      season: '1m',
      environment: 'fertile',
      state: 'active',
      soilCost: 3,
      createdAt: new Date().toISOString(),
      waterEntries: [
        {
          timestamp: new Date(2024, 0, 5, 10, 0, 0).toISOString(), // Old
          content: 'Old reflection',
        },
        {
          timestamp: new Date(2024, 0, 15, 10, 0, 0).toISOString(), // This week
          content: 'Recent reflection',
        },
      ],
    }

    expect(wasWateredThisWeek(sprout)).toBe(true)
  })
})
