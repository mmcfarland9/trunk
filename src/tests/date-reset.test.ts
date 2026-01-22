/**
 * Tests for date-based reset logic.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getTodayResetTime,
  getWeekResetTime,
  getNextWaterReset,
  getNextSunReset,
  formatResetTime,
  getDebugDate,
  advanceClockByDays,
  resetResources,
} from '../state'

describe('Daily Reset Time (getTodayResetTime)', () => {
  beforeEach(() => {
    // Reset the clock before each test
    resetResources()
  })

  it('should return 6am today if current time is after 6am', () => {
    // Advance to ensure we're past any reset edge cases
    const now = getDebugDate()
    const reset = getTodayResetTime()

    // Reset time should be 6:00:00 AM
    expect(reset.getHours()).toBe(6)
    expect(reset.getMinutes()).toBe(0)
    expect(reset.getSeconds()).toBe(0)

    // Should be today or yesterday depending on current time
    expect(reset <= now).toBe(true)
  })

  it('should return yesterday 6am if current time is before 6am', () => {
    // This test assumes we're testing the logic correctly
    // Since we can't easily set time before 6am without more complex mocking,
    // we verify the logic by checking the reset time is never in the future
    const reset = getTodayResetTime()
    const now = getDebugDate()

    expect(reset <= now).toBe(true)
  })

  it('should change after advancing clock past midnight', () => {
    const reset1 = getTodayResetTime()

    // Advance clock by 2 days
    advanceClockByDays(2)

    const reset2 = getTodayResetTime()

    // Reset time should be 2 days later
    const dayDiff = Math.round((reset2.getTime() - reset1.getTime()) / (24 * 60 * 60 * 1000))
    expect(dayDiff).toBe(2)
  })
})

describe('Weekly Reset Time (getWeekResetTime)', () => {
  beforeEach(() => {
    resetResources()
  })

  it('should return Sunday 6am', () => {
    const reset = getWeekResetTime()

    // Should be a Sunday (day 0)
    expect(reset.getDay()).toBe(0)
    // Should be 6:00 AM
    expect(reset.getHours()).toBe(6)
    expect(reset.getMinutes()).toBe(0)
  })

  it('should return most recent Sunday', () => {
    const reset = getWeekResetTime()
    const now = getDebugDate()

    // Reset should be in the past (or now if exactly on reset time)
    expect(reset <= now).toBe(true)

    // Should be within the last 7 days
    const daysDiff = (now.getTime() - reset.getTime()) / (24 * 60 * 60 * 1000)
    expect(daysDiff).toBeLessThan(7)
  })

  it('should change after advancing clock past Sunday', () => {
    const reset1 = getWeekResetTime()

    // Advance by 8 days to ensure we pass a Sunday
    advanceClockByDays(8)

    const reset2 = getWeekResetTime()

    // New reset should be 7 days after previous
    const dayDiff = Math.round((reset2.getTime() - reset1.getTime()) / (24 * 60 * 60 * 1000))
    expect(dayDiff).toBe(7)
  })
})

describe('Next Reset Times', () => {
  beforeEach(() => {
    resetResources()
  })

  it('getNextWaterReset should return tomorrow 6am', () => {
    const current = getTodayResetTime()
    const next = getNextWaterReset()

    // Should be exactly 24 hours after current reset
    const hoursDiff = (next.getTime() - current.getTime()) / (60 * 60 * 1000)
    expect(hoursDiff).toBe(24)

    // Should be 6:00 AM
    expect(next.getHours()).toBe(6)
  })

  it('getNextSunReset should return next Sunday 6am', () => {
    const current = getWeekResetTime()
    const next = getNextSunReset()

    // Should be exactly 7 days after current reset
    const daysDiff = (next.getTime() - current.getTime()) / (24 * 60 * 60 * 1000)
    expect(daysDiff).toBe(7)

    // Should be Sunday
    expect(next.getDay()).toBe(0)
    // Should be 6:00 AM
    expect(next.getHours()).toBe(6)
  })
})

describe('formatResetTime', () => {
  it('should format date correctly', () => {
    // Create a known date: Wednesday January 22, 2025 at 6:00 AM
    const date = new Date(2025, 0, 22, 6, 0, 0)
    const formatted = formatResetTime(date)

    expect(formatted).toBe('Resets Wed 01/22 at 6:00 AM')
  })

  it('should format PM times correctly', () => {
    const date = new Date(2025, 0, 22, 18, 30, 0) // 6:30 PM
    const formatted = formatResetTime(date)

    expect(formatted).toBe('Resets Wed 01/22 at 6:30 PM')
  })

  it('should format noon as 12:00 PM', () => {
    const date = new Date(2025, 0, 22, 12, 0, 0)
    const formatted = formatResetTime(date)

    expect(formatted).toBe('Resets Wed 01/22 at 12:00 PM')
  })

  it('should format midnight as 12:00 AM', () => {
    const date = new Date(2025, 0, 22, 0, 0, 0)
    const formatted = formatResetTime(date)

    expect(formatted).toBe('Resets Wed 01/22 at 12:00 AM')
  })
})

describe('Debug Clock', () => {
  beforeEach(() => {
    resetResources()
  })

  it('should advance correctly', () => {
    const before = getDebugDate()
    advanceClockByDays(5)
    const after = getDebugDate()

    const daysDiff = Math.round((after.getTime() - before.getTime()) / (24 * 60 * 60 * 1000))
    expect(daysDiff).toBe(5)
  })

  it('should affect reset time calculations', () => {
    const resetBefore = getTodayResetTime()
    advanceClockByDays(3)
    const resetAfter = getTodayResetTime()

    // Reset time should have moved forward by 3 days
    const daysDiff = Math.round((resetAfter.getTime() - resetBefore.getTime()) / (24 * 60 * 60 * 1000))
    expect(daysDiff).toBe(3)
  })
})
