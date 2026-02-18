/**
 * Tests for sun system - weekly resource management.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { getWeekResetTime, getNextSunReset, getSunCapacity, formatResetTime } from '../state'

describe('Sun Reset Time', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getWeekResetTime', () => {
    it('returns Monday 6am of current week when on Wednesday', () => {
      // Set time to Wednesday Jan 17, 2024, 10am
      const now = new Date(2024, 0, 17, 10, 0, 0)
      vi.setSystemTime(now)

      const reset = getWeekResetTime()

      expect(reset.getDay()).toBe(1) // Monday
      expect(reset.getDate()).toBe(15) // Monday Jan 15
      expect(reset.getHours()).toBe(6)
      expect(reset.getMinutes()).toBe(0)
    })

    it('returns Monday 6am of current week when on Saturday', () => {
      // Set time to Saturday Jan 20, 2024, 10am
      const now = new Date(2024, 0, 20, 10, 0, 0)
      vi.setSystemTime(now)

      const reset = getWeekResetTime()

      expect(reset.getDay()).toBe(1) // Monday
      expect(reset.getDate()).toBe(15) // Monday Jan 15
    })

    it('returns previous Monday 6am when on Sunday after 6am', () => {
      // Set time to Sunday Jan 14, 2024, 10am
      // Sunday is day 6 past Monday, so most recent Monday = Jan 8
      const now = new Date(2024, 0, 14, 10, 0, 0)
      vi.setSystemTime(now)

      const reset = getWeekResetTime()

      expect(reset.getDay()).toBe(1) // Monday
      expect(reset.getDate()).toBe(8) // Monday Jan 8
      expect(reset.getHours()).toBe(6)
    })

    it('returns previous Monday 6am when on Sunday before 6am', () => {
      // Set time to Sunday Jan 14, 2024, 3am
      // Sunday before 6am is still in the Mon Jan 8 week
      const now = new Date(2024, 0, 14, 3, 0, 0)
      vi.setSystemTime(now)

      const reset = getWeekResetTime()

      expect(reset.getDay()).toBe(1) // Monday
      expect(reset.getDate()).toBe(8) // Monday Jan 8
      expect(reset.getHours()).toBe(6)
    })

    it('handles month boundary correctly', () => {
      // Set time to Monday Feb 5, 2024, 10am
      const now = new Date(2024, 1, 5, 10, 0, 0)
      vi.setSystemTime(now)

      const reset = getWeekResetTime()

      expect(reset.getMonth()).toBe(1) // February
      expect(reset.getDay()).toBe(1) // Monday
      expect(reset.getDate()).toBe(5) // Monday Feb 5 (today)
    })

    it('handles year boundary correctly', () => {
      // Set time to Wednesday Jan 3, 2024, 10am
      const now = new Date(2024, 0, 3, 10, 0, 0)
      vi.setSystemTime(now)

      const reset = getWeekResetTime()

      expect(reset.getDay()).toBe(1) // Monday
      expect(reset.getFullYear()).toBe(2024)
      expect(reset.getMonth()).toBe(0) // January
      expect(reset.getDate()).toBe(1) // Monday Jan 1
    })

    it('returns previous Monday when on Monday before 6am', () => {
      // Set time to Monday Jan 15, 2024, 3am
      const now = new Date(2024, 0, 15, 3, 0, 0)
      vi.setSystemTime(now)

      const reset = getWeekResetTime()

      expect(reset.getDay()).toBe(1) // Monday
      expect(reset.getDate()).toBe(8) // Previous Monday Jan 8
      expect(reset.getHours()).toBe(6)
    })

    it('returns current Monday when on Monday after 6am', () => {
      // Set time to Monday Jan 15, 2024, 10am
      const now = new Date(2024, 0, 15, 10, 0, 0)
      vi.setSystemTime(now)

      const reset = getWeekResetTime()

      expect(reset.getDay()).toBe(1) // Monday
      expect(reset.getDate()).toBe(15) // This Monday
      expect(reset.getHours()).toBe(6)
    })
  })

  describe('getNextSunReset', () => {
    it('returns next Monday 6am', () => {
      // Set time to Wednesday Jan 17, 2024, 10am
      // Current reset = Mon Jan 15, next = Mon Jan 22
      const now = new Date(2024, 0, 17, 10, 0, 0)
      vi.setSystemTime(now)

      const nextReset = getNextSunReset()

      expect(nextReset.getDay()).toBe(1) // Monday
      expect(nextReset.getDate()).toBe(22) // Next Monday Jan 22
      expect(nextReset.getHours()).toBe(6)
    })

    it('returns next week Monday when on Sunday after 6am', () => {
      // Set time to Sunday Jan 14, 2024, 10am
      // Current reset = Mon Jan 8, next = Mon Jan 15
      const now = new Date(2024, 0, 14, 10, 0, 0)
      vi.setSystemTime(now)

      const nextReset = getNextSunReset()

      expect(nextReset.getDay()).toBe(1) // Monday
      expect(nextReset.getDate()).toBe(15) // Next Monday Jan 15
    })

    it('returns this Monday when on Sunday before 6am', () => {
      // Set time to Sunday Jan 14, 2024, 3am
      // Current reset = Mon Jan 8, next = Mon Jan 15
      const now = new Date(2024, 0, 14, 3, 0, 0)
      vi.setSystemTime(now)

      const nextReset = getNextSunReset()

      expect(nextReset.getDay()).toBe(1) // Monday
      expect(nextReset.getDate()).toBe(15) // Next Monday Jan 15
    })
  })
})

describe('Sun Availability', () => {
  it('returns correct sun capacity', () => {
    expect(getSunCapacity()).toBe(1)
  })

  // Note: getSunAvailable and getSunUsedThisWeek depend on sunLog state
  // which requires more complex setup. These would be integration tests.
})

describe('formatResetTime', () => {
  it('formats date correctly for morning reset', () => {
    const date = new Date(2024, 0, 17, 6, 0, 0) // Wed Jan 17, 6am
    const formatted = formatResetTime(date)

    expect(formatted).toBe('Resets Wed 01/17 at 6:00 AM')
  })

  it('formats date correctly for PM time', () => {
    const date = new Date(2024, 0, 17, 14, 30, 0) // Wed Jan 17, 2:30pm
    const formatted = formatResetTime(date)

    expect(formatted).toBe('Resets Wed 01/17 at 2:30 PM')
  })

  it('handles noon correctly', () => {
    const date = new Date(2024, 0, 17, 12, 0, 0) // Wed Jan 17, 12pm
    const formatted = formatResetTime(date)

    expect(formatted).toBe('Resets Wed 01/17 at 12:00 PM')
  })

  it('handles midnight correctly', () => {
    const date = new Date(2024, 0, 17, 0, 0, 0) // Wed Jan 17, midnight
    const formatted = formatResetTime(date)

    expect(formatted).toBe('Resets Wed 01/17 at 12:00 AM')
  })

  it('pads single-digit month and day', () => {
    const date = new Date(2024, 0, 5, 6, 0, 0) // Fri Jan 5, 6am
    const formatted = formatResetTime(date)

    expect(formatted).toBe('Resets Fri 01/05 at 6:00 AM')
  })

  it('formats all days of week correctly', () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    for (let i = 0; i < 7; i++) {
      // Jan 14, 2024 is Sunday, so Jan 14+i gives us each day
      const date = new Date(2024, 0, 14 + i, 6, 0, 0)
      const formatted = formatResetTime(date)

      expect(formatted).toContain(`Resets ${days[i]}`)
    }
  })
})
