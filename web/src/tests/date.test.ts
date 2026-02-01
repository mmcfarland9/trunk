/**
 * Tests for centralized date utilities.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getTodayResetTime,
  getWeekResetTime,
  getNextDailyReset,
  getNextWeeklyReset,
  formatResetTime,
  toISOString,
  parseISOString,
  getWeekString,
  getDateString,
  getDebugDate,
  getDebugNow,
  advanceClockByDays,
  setDebugDate,
  resetDebugClock,
} from '../utils/date'

describe('date utilities', () => {
  beforeEach(() => {
    // Mock: Wednesday, Jan 15, 2025 at 10:00 AM local time
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 0, 15, 10, 0, 0))
    resetDebugClock()
  })

  afterEach(() => {
    vi.useRealTimers()
    resetDebugClock()
  })

  describe('getTodayResetTime', () => {
    it('returns 6am today when after 6am', () => {
      const reset = getTodayResetTime()
      expect(reset.getHours()).toBe(6)
      expect(reset.getMinutes()).toBe(0)
      expect(reset.getDate()).toBe(15)
    })

    it('returns 6am yesterday when before 6am', () => {
      vi.setSystemTime(new Date(2025, 0, 15, 5, 0, 0))
      const reset = getTodayResetTime()
      expect(reset.getDate()).toBe(14)
      expect(reset.getHours()).toBe(6)
    })

    it('returns 6am today when exactly at 6am', () => {
      vi.setSystemTime(new Date(2025, 0, 15, 6, 0, 0))
      const reset = getTodayResetTime()
      expect(reset.getDate()).toBe(15)
      expect(reset.getHours()).toBe(6)
    })
  })

  describe('getWeekResetTime', () => {
    it('returns most recent Sunday 6am', () => {
      // Jan 15 is Wednesday, Sunday was Jan 12
      const reset = getWeekResetTime()
      expect(reset.getDay()).toBe(0) // Sunday
      expect(reset.getDate()).toBe(12)
      expect(reset.getHours()).toBe(6)
    })

    it('returns this Sunday when on Sunday after 6am', () => {
      // Set to Sunday Jan 12, 2025 at 10:00 AM
      vi.setSystemTime(new Date(2025, 0, 12, 10, 0, 0))
      const reset = getWeekResetTime()
      expect(reset.getDay()).toBe(0)
      expect(reset.getDate()).toBe(12)
      expect(reset.getHours()).toBe(6)
    })

    it('returns last Sunday when on Sunday before 6am', () => {
      // Set to Sunday Jan 12, 2025 at 5:00 AM
      vi.setSystemTime(new Date(2025, 0, 12, 5, 0, 0))
      const reset = getWeekResetTime()
      expect(reset.getDay()).toBe(0)
      expect(reset.getDate()).toBe(5) // Previous Sunday
      expect(reset.getHours()).toBe(6)
    })
  })

  describe('getNextDailyReset', () => {
    it('returns tomorrow at 6am', () => {
      const next = getNextDailyReset()
      expect(next.getDate()).toBe(16)
      expect(next.getHours()).toBe(6)
    })

    it('returns today at 6am when before 6am', () => {
      vi.setSystemTime(new Date(2025, 0, 15, 5, 0, 0))
      const next = getNextDailyReset()
      expect(next.getDate()).toBe(15)
      expect(next.getHours()).toBe(6)
    })
  })

  describe('getNextWeeklyReset', () => {
    it('returns next Sunday at 6am', () => {
      // Jan 15 is Wednesday, next Sunday is Jan 19
      const next = getNextWeeklyReset()
      expect(next.getDate()).toBe(19)
      expect(next.getDay()).toBe(0)
      expect(next.getHours()).toBe(6)
    })

    it('returns next Sunday when on Sunday after 6am', () => {
      // Set to Sunday Jan 12, 2025 at 10:00 AM
      vi.setSystemTime(new Date(2025, 0, 12, 10, 0, 0))
      const next = getNextWeeklyReset()
      expect(next.getDate()).toBe(19)
      expect(next.getDay()).toBe(0)
    })
  })

  describe('formatResetTime', () => {
    it('formats date correctly', () => {
      // Wednesday January 22, 2025 at 6:00 AM
      const date = new Date(2025, 0, 22, 6, 0, 0)
      const formatted = formatResetTime(date)
      expect(formatted).toBe('Resets Wed 01/22 at 6:00 AM')
    })

    it('formats PM times correctly', () => {
      const date = new Date(2025, 0, 22, 18, 30, 0) // 6:30 PM
      const formatted = formatResetTime(date)
      expect(formatted).toBe('Resets Wed 01/22 at 6:30 PM')
    })

    it('formats noon as 12:00 PM', () => {
      const date = new Date(2025, 0, 22, 12, 0, 0)
      const formatted = formatResetTime(date)
      expect(formatted).toBe('Resets Wed 01/22 at 12:00 PM')
    })

    it('formats midnight as 12:00 AM', () => {
      const date = new Date(2025, 0, 22, 0, 0, 0)
      const formatted = formatResetTime(date)
      expect(formatted).toBe('Resets Wed 01/22 at 12:00 AM')
    })
  })

  describe('toISOString', () => {
    it('converts date to ISO string', () => {
      const date = new Date('2025-01-15T10:30:00.000Z')
      expect(toISOString(date)).toBe('2025-01-15T10:30:00.000Z')
    })
  })

  describe('parseISOString', () => {
    it('parses ISO string to date', () => {
      const date = parseISOString('2025-01-15T10:30:00.000Z')
      expect(date.toISOString()).toBe('2025-01-15T10:30:00.000Z')
    })

    it('handles date-only strings', () => {
      const date = parseISOString('2025-01-15')
      expect(date.getFullYear()).toBe(2025)
      expect(date.getUTCMonth()).toBe(0) // January
      expect(date.getUTCDate()).toBe(15)
    })
  })

  describe('getWeekString', () => {
    it('returns ISO week format', () => {
      const date = new Date(2025, 0, 15) // Wed Jan 15, 2025
      const weekStr = getWeekString(date)
      expect(weekStr).toMatch(/2025-W\d+/)
    })

    it('returns correct week number for mid-January', () => {
      const date = new Date(2025, 0, 15)
      const weekStr = getWeekString(date)
      expect(weekStr).toBe('2025-W3')
    })

    it('handles year boundary correctly', () => {
      // Dec 31, 2024 is in week 1 of 2025 (ISO week numbering)
      const date = new Date(2024, 11, 31)
      const weekStr = getWeekString(date)
      expect(weekStr).toBe('2025-W1')
    })
  })

  describe('getDateString', () => {
    it('returns YYYY-MM-DD format', () => {
      const date = new Date('2025-01-15T10:30:00Z')
      expect(getDateString(date)).toBe('2025-01-15')
    })

    it('pads single-digit months and days', () => {
      const date = new Date('2025-03-05T10:30:00Z')
      expect(getDateString(date)).toBe('2025-03-05')
    })
  })

  describe('debug clock', () => {
    it('getDebugNow returns current time by default', () => {
      const now = Date.now()
      const debugNow = getDebugNow()
      expect(Math.abs(debugNow - now)).toBeLessThan(100) // Within 100ms
    })

    it('getDebugDate returns current date by default', () => {
      const now = new Date()
      const debugDate = getDebugDate()
      expect(debugDate.getFullYear()).toBe(now.getFullYear())
      expect(debugDate.getMonth()).toBe(now.getMonth())
      expect(debugDate.getDate()).toBe(now.getDate())
    })

    it('advanceClockByDays shifts time forward', () => {
      const before = getDebugDate()
      advanceClockByDays(5)
      const after = getDebugDate()

      const daysDiff = Math.round((after.getTime() - before.getTime()) / (24 * 60 * 60 * 1000))
      expect(daysDiff).toBe(5)
    })

    it('setDebugDate sets specific date', () => {
      const targetDate = new Date(2030, 5, 15, 12, 0, 0)
      setDebugDate(targetDate)
      const debugDate = getDebugDate()

      expect(debugDate.getFullYear()).toBe(2030)
      expect(debugDate.getMonth()).toBe(5)
      expect(debugDate.getDate()).toBe(15)
    })

    it('resetDebugClock restores real time', () => {
      advanceClockByDays(100)
      resetDebugClock()
      const now = new Date()
      const debugDate = getDebugDate()

      expect(debugDate.getFullYear()).toBe(now.getFullYear())
      expect(debugDate.getMonth()).toBe(now.getMonth())
      expect(debugDate.getDate()).toBe(now.getDate())
    })

    it('affects reset time calculations', () => {
      const resetBefore = getTodayResetTime()
      advanceClockByDays(3)
      const resetAfter = getTodayResetTime()

      const daysDiff = Math.round((resetAfter.getTime() - resetBefore.getTime()) / (24 * 60 * 60 * 1000))
      expect(daysDiff).toBe(3)
    })
  })
})
