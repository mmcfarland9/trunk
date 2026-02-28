/**
 * Verification test: getWeekResetTime divergence is resolved (ROADMAP A3).
 *
 * Confirms that getWeekResetTime(), getNextSunReset(), and deriveSunAvailable()
 * all agree on the Monday 6am weekly reset boundary. Previously, two
 * implementations existed with different reset days (Sunday vs Monday).
 * This test locks in the single-implementation invariant.
 */

import { describe, it, expect } from 'vitest'
import { getWeekResetTime, getNextSunReset } from '../utils/calculations'
import { deriveSunAvailable } from '../events/derive'
import type { TrunkEvent } from '../events/types'

/** Helper: create a sun_shone event at a given timestamp */
function sunEvent(timestamp: string): TrunkEvent {
  return {
    type: 'sun_shone',
    timestamp,
    client_id: `${timestamp}-test`,
    twigId: 'branch-0-twig-0',
    twigLabel: 'Test Twig',
    content: 'test reflection',
    prompt: 'test prompt',
  } as TrunkEvent
}

describe('Week reset single-implementation verification (A3)', () => {
  describe('getWeekResetTime always returns Monday 6am', () => {
    // Week of Jan 13-19, 2025 (Mon-Sun)
    const cases = [
      { day: 'Monday', date: new Date(2025, 0, 13, 10, 0, 0), expectedDate: 13 },
      { day: 'Tuesday', date: new Date(2025, 0, 14, 10, 0, 0), expectedDate: 13 },
      { day: 'Wednesday', date: new Date(2025, 0, 15, 10, 0, 0), expectedDate: 13 },
      { day: 'Thursday', date: new Date(2025, 0, 16, 10, 0, 0), expectedDate: 13 },
      { day: 'Friday', date: new Date(2025, 0, 17, 10, 0, 0), expectedDate: 13 },
      { day: 'Saturday', date: new Date(2025, 0, 18, 10, 0, 0), expectedDate: 13 },
      { day: 'Sunday', date: new Date(2025, 0, 19, 10, 0, 0), expectedDate: 13 },
    ]

    for (const { day, date, expectedDate } of cases) {
      it(`${day} 10am → Monday Jan ${expectedDate} 6am`, () => {
        const reset = getWeekResetTime(date)
        expect(reset.getDay()).toBe(1) // Monday
        expect(reset.getDate()).toBe(expectedDate)
        expect(reset.getHours()).toBe(6)
        expect(reset.getMinutes()).toBe(0)
      })
    }
  })

  describe('getNextSunReset agrees with getWeekResetTime + 7 days', () => {
    const cases = [
      { label: 'Wednesday mid-week', now: new Date(2025, 0, 15, 14, 0, 0) },
      { label: 'Sunday evening', now: new Date(2025, 0, 19, 22, 0, 0) },
      { label: 'Monday after reset', now: new Date(2025, 0, 13, 8, 0, 0) },
      { label: 'Friday afternoon', now: new Date(2025, 0, 17, 16, 30, 0) },
    ]

    for (const { label, now } of cases) {
      it(`${label}: getNextSunReset = getWeekResetTime + 7 days`, () => {
        const weekReset = getWeekResetTime(now)
        const nextSun = getNextSunReset(now)
        const expected = new Date(weekReset)
        expected.setDate(expected.getDate() + 7)
        expect(nextSun.getTime()).toBe(expected.getTime())
      })
    }
  })

  describe('deriveSunAvailable uses same reset boundary as UI countdown', () => {
    it('sun shone after Monday 6am reset counts against current week', () => {
      // Monday Jan 13, 2025 at 10am — within current week
      const now = new Date(2025, 0, 15, 10, 0, 0) // Wed Jan 15
      const weekReset = getWeekResetTime(now) // Mon Jan 13, 6am
      // Event after the reset boundary
      const afterReset = new Date(weekReset.getTime() + 60_000) // Mon Jan 13, 6:01am
      const events = [sunEvent(afterReset.toISOString())]

      expect(deriveSunAvailable(events, now)).toBe(0) // 1 capacity - 1 used = 0
    })

    it('sun shone before Monday 6am reset does NOT count against current week', () => {
      const now = new Date(2025, 0, 15, 10, 0, 0) // Wed Jan 15
      const weekReset = getWeekResetTime(now) // Mon Jan 13, 6am
      // Event before the reset boundary (previous week)
      const beforeReset = new Date(weekReset.getTime() - 60_000) // Mon Jan 13, 5:59am
      const events = [sunEvent(beforeReset.toISOString())]

      expect(deriveSunAvailable(events, now)).toBe(1) // Previous week, doesn't count
    })

    it('deriveSunAvailable and getNextSunReset agree on reset boundary', () => {
      // If we shine right after the current reset, sun is used for THIS week
      // and the next reset (from getNextSunReset) is exactly 7 days later
      const now = new Date(2025, 0, 16, 12, 0, 0) // Thu Jan 16
      const weekReset = getWeekResetTime(now) // Mon Jan 13, 6am
      const nextReset = getNextSunReset(now) // Mon Jan 20, 6am

      // Event during current week window
      const duringWeek = new Date(2025, 0, 14, 9, 0, 0) // Tue Jan 14, 9am
      expect(duringWeek.getTime()).toBeGreaterThan(weekReset.getTime())
      expect(duringWeek.getTime()).toBeLessThan(nextReset.getTime())

      const events = [sunEvent(duringWeek.toISOString())]
      expect(deriveSunAvailable(events, now)).toBe(0) // Used within window
    })
  })

  describe('edge cases: reset boundary precision', () => {
    it('Sunday 5:59am — still in previous Monday week', () => {
      // Sun Jan 19, 2025 at 5:59am
      const now = new Date(2025, 0, 19, 5, 59, 0)
      const reset = getWeekResetTime(now)
      // Should return Mon Jan 13, 6am (current week started Mon Jan 13)
      expect(reset).toEqual(new Date(2025, 0, 13, 6, 0, 0, 0))
    })

    it('Monday 5:59am — still in PREVIOUS Monday week', () => {
      // Mon Jan 13, 2025 at 5:59am (before 6am reset)
      const now = new Date(2025, 0, 13, 5, 59, 0)
      const reset = getWeekResetTime(now)
      // Should return Mon Jan 6, 6am (previous week — Monday before 6am goes back)
      expect(reset).toEqual(new Date(2025, 0, 6, 6, 0, 0, 0))
    })

    it('Monday 6:00am — new week starts', () => {
      // Mon Jan 13, 2025 at exactly 6:00am
      const now = new Date(2025, 0, 13, 6, 0, 0, 0)
      const reset = getWeekResetTime(now)
      // Should return Mon Jan 13, 6am (this Monday)
      expect(reset).toEqual(new Date(2025, 0, 13, 6, 0, 0, 0))
    })

    it('Monday 6:01am — within new week', () => {
      // Mon Jan 13, 2025 at 6:01am
      const now = new Date(2025, 0, 13, 6, 1, 0)
      const reset = getWeekResetTime(now)
      // Should return Mon Jan 13, 6am
      expect(reset).toEqual(new Date(2025, 0, 13, 6, 0, 0, 0))
    })

    it('deriveSunAvailable resets at Monday 6am boundary exactly', () => {
      // Shine on Sunday at 11pm (within Mon Jan 6 – Mon Jan 13 window)
      const shineTime = new Date(2025, 0, 12, 23, 0, 0) // Sun Jan 12, 11pm
      const events = [sunEvent(shineTime.toISOString())]

      // At Monday 5:59am: still in same week as the shine → sun used
      const before = new Date(2025, 0, 13, 5, 59, 0)
      expect(deriveSunAvailable(events, before)).toBe(0)

      // At Monday 6:00am: new week → sun available again
      const at = new Date(2025, 0, 13, 6, 0, 0, 0)
      expect(deriveSunAvailable(events, at)).toBe(1)

      // At Monday 6:01am: definitely new week → sun available
      const after = new Date(2025, 0, 13, 6, 1, 0)
      expect(deriveSunAvailable(events, after)).toBe(1)
    })
  })
})
