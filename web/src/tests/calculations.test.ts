/**
 * Tests for reset time and formatting functions in calculations.ts
 */

import { describe, it, expect } from 'vitest'
import {
  getTodayResetTime,
  getWeekResetTime,
  getNextWaterReset,
  getNextSunReset,
  formatResetTime,
} from '../utils/calculations'

describe('getTodayResetTime', () => {
  it('returns today 6am when after 6am', () => {
    const now = new Date(2025, 0, 15, 10, 30, 0) // Wed Jan 15, 10:30am
    const result = getTodayResetTime(now)
    expect(result).toEqual(new Date(2025, 0, 15, 6, 0, 0, 0))
  })

  it('returns yesterday 6am when before 6am', () => {
    const now = new Date(2025, 0, 15, 3, 0, 0) // Wed Jan 15, 3:00am
    const result = getTodayResetTime(now)
    expect(result).toEqual(new Date(2025, 0, 14, 6, 0, 0, 0))
  })

  it('returns today 6am when exactly at 6:00:00', () => {
    const now = new Date(2025, 0, 15, 6, 0, 0, 0) // Wed Jan 15, 6:00:00.000am
    const result = getTodayResetTime(now)
    expect(result).toEqual(new Date(2025, 0, 15, 6, 0, 0, 0))
  })

  it('returns yesterday 6am at 5:59:59', () => {
    const now = new Date(2025, 0, 15, 5, 59, 59) // Wed Jan 15, 5:59:59am
    const result = getTodayResetTime(now)
    expect(result).toEqual(new Date(2025, 0, 14, 6, 0, 0, 0))
  })

  it('returns yesterday 6am at midnight', () => {
    const now = new Date(2025, 0, 15, 0, 0, 0) // Wed Jan 15, midnight
    const result = getTodayResetTime(now)
    expect(result).toEqual(new Date(2025, 0, 14, 6, 0, 0, 0))
  })

  it('returns today 6am at 11:59pm', () => {
    const now = new Date(2025, 0, 15, 23, 59, 0) // Wed Jan 15, 11:59pm
    const result = getTodayResetTime(now)
    expect(result).toEqual(new Date(2025, 0, 15, 6, 0, 0, 0))
  })

  it('crosses year boundary: Jan 1 before 6am returns Dec 31 6am', () => {
    const now = new Date(2025, 0, 1, 3, 0, 0) // Wed Jan 1 2025, 3:00am
    const result = getTodayResetTime(now)
    expect(result).toEqual(new Date(2024, 11, 31, 6, 0, 0, 0))
  })

  it('crosses month boundary: Mar 1 before 6am returns Feb 28 6am', () => {
    const now = new Date(2025, 2, 1, 4, 0, 0) // Sat Mar 1 2025, 4:00am
    const result = getTodayResetTime(now)
    expect(result).toEqual(new Date(2025, 1, 28, 6, 0, 0, 0))
  })
})

describe('getWeekResetTime', () => {
  it('Monday after 6am returns that Monday 6am', () => {
    const now = new Date(2025, 0, 13, 10, 0, 0) // Mon Jan 13, 10:00am
    const result = getWeekResetTime(now)
    expect(result).toEqual(new Date(2025, 0, 13, 6, 0, 0, 0))
  })

  it('Monday before 6am returns previous Monday 6am', () => {
    const now = new Date(2025, 0, 13, 4, 0, 0) // Mon Jan 13, 4:00am
    const result = getWeekResetTime(now)
    expect(result).toEqual(new Date(2025, 0, 6, 6, 0, 0, 0))
  })

  it('Tuesday returns this Monday 6am', () => {
    const now = new Date(2025, 0, 14, 10, 0, 0) // Tue Jan 14, 10:00am
    const result = getWeekResetTime(now)
    expect(result).toEqual(new Date(2025, 0, 13, 6, 0, 0, 0))
  })

  it('Wednesday returns this Monday 6am', () => {
    const now = new Date(2025, 0, 15, 10, 0, 0) // Wed Jan 15, 10:00am
    const result = getWeekResetTime(now)
    expect(result).toEqual(new Date(2025, 0, 13, 6, 0, 0, 0))
  })

  it('Thursday returns this Monday 6am', () => {
    const now = new Date(2025, 0, 16, 10, 0, 0) // Thu Jan 16, 10:00am
    const result = getWeekResetTime(now)
    expect(result).toEqual(new Date(2025, 0, 13, 6, 0, 0, 0))
  })

  it('Friday returns this Monday 6am', () => {
    const now = new Date(2025, 0, 17, 10, 0, 0) // Fri Jan 17, 10:00am
    const result = getWeekResetTime(now)
    expect(result).toEqual(new Date(2025, 0, 13, 6, 0, 0, 0))
  })

  it('Saturday returns this Monday 6am', () => {
    const now = new Date(2025, 0, 18, 10, 0, 0) // Sat Jan 18, 10:00am
    const result = getWeekResetTime(now)
    expect(result).toEqual(new Date(2025, 0, 13, 6, 0, 0, 0))
  })

  it('Sunday returns this Monday 6am', () => {
    const now = new Date(2025, 0, 19, 10, 0, 0) // Sun Jan 19, 10:00am
    const result = getWeekResetTime(now)
    expect(result).toEqual(new Date(2025, 0, 13, 6, 0, 0, 0))
  })

  it('Monday exactly at 6am returns that Monday 6am', () => {
    const now = new Date(2025, 0, 13, 6, 0, 0, 0) // Mon Jan 13, 6:00:00.000am
    const result = getWeekResetTime(now)
    expect(result).toEqual(new Date(2025, 0, 13, 6, 0, 0, 0))
  })

  it('Monday at 5:59:59am returns previous Monday 6am', () => {
    const now = new Date(2025, 0, 13, 5, 59, 59) // Mon Jan 13, 5:59:59am
    const result = getWeekResetTime(now)
    expect(result).toEqual(new Date(2025, 0, 6, 6, 0, 0, 0))
  })

  it('crosses month boundary: Mon Feb 3 returns Mon Jan 27 when applicable', () => {
    const now = new Date(2025, 1, 3, 10, 0, 0) // Mon Feb 3 2025, 10:00am
    const result = getWeekResetTime(now)
    expect(result).toEqual(new Date(2025, 1, 3, 6, 0, 0, 0))
  })

  it('crosses year boundary: Thu Jan 2 2025 returns Mon Dec 30 2024', () => {
    const now = new Date(2025, 0, 2, 10, 0, 0) // Thu Jan 2 2025, 10:00am
    const result = getWeekResetTime(now)
    expect(result).toEqual(new Date(2024, 11, 30, 6, 0, 0, 0))
  })
})

describe('getNextWaterReset', () => {
  it('before 6am returns today 6am', () => {
    const now = new Date(2025, 0, 15, 3, 0, 0) // Wed Jan 15, 3:00am
    const result = getNextWaterReset(now)
    expect(result).toEqual(new Date(2025, 0, 15, 6, 0, 0, 0))
  })

  it('after 6am returns tomorrow 6am', () => {
    const now = new Date(2025, 0, 15, 10, 0, 0) // Wed Jan 15, 10:00am
    const result = getNextWaterReset(now)
    expect(result).toEqual(new Date(2025, 0, 16, 6, 0, 0, 0))
  })

  it('at midnight returns today 6am', () => {
    const now = new Date(2025, 0, 15, 0, 0, 0) // Wed Jan 15, midnight
    const result = getNextWaterReset(now)
    expect(result).toEqual(new Date(2025, 0, 15, 6, 0, 0, 0))
  })

  it('at 11pm returns tomorrow 6am', () => {
    const now = new Date(2025, 0, 15, 23, 0, 0) // Wed Jan 15, 11:00pm
    const result = getNextWaterReset(now)
    expect(result).toEqual(new Date(2025, 0, 16, 6, 0, 0, 0))
  })
})

describe('getNextSunReset', () => {
  it('Monday after 6am returns next Monday 6am', () => {
    const now = new Date(2025, 0, 13, 10, 0, 0) // Mon Jan 13, 10:00am
    const result = getNextSunReset(now)
    expect(result).toEqual(new Date(2025, 0, 20, 6, 0, 0, 0))
  })

  it('Monday before 6am returns this Monday 6am', () => {
    const now = new Date(2025, 0, 13, 4, 0, 0) // Mon Jan 13, 4:00am
    const result = getNextSunReset(now)
    // getWeekResetTime returns prev Mon (Jan 6) + 7 days = Jan 13
    expect(result).toEqual(new Date(2025, 0, 13, 6, 0, 0, 0))
  })

  it('Wednesday returns next Monday 6am', () => {
    const now = new Date(2025, 0, 15, 10, 0, 0) // Wed Jan 15, 10:00am
    const result = getNextSunReset(now)
    // getWeekResetTime returns Mon Jan 13 + 7 days = Mon Jan 20
    expect(result).toEqual(new Date(2025, 0, 20, 6, 0, 0, 0))
  })

  it('Sunday returns next Monday 6am', () => {
    const now = new Date(2025, 0, 19, 10, 0, 0) // Sun Jan 19, 10:00am
    const result = getNextSunReset(now)
    // getWeekResetTime returns Mon Jan 13 + 7 days = Mon Jan 20
    expect(result).toEqual(new Date(2025, 0, 20, 6, 0, 0, 0))
  })
})

describe('formatResetTime', () => {
  it('formats morning time correctly', () => {
    const date = new Date(2025, 0, 22, 6, 0, 0) // Wed Jan 22 2025, 6:00am
    expect(formatResetTime(date)).toBe('Resets Wed 01/22 at 6:00 AM')
  })

  it('formats afternoon time correctly', () => {
    const date = new Date(2025, 5, 12, 14, 30, 0) // Thu Jun 12 2025, 2:30pm
    expect(formatResetTime(date)).toBe('Resets Thu 06/12 at 2:30 PM')
  })

  it('formats midnight correctly', () => {
    const date = new Date(2025, 2, 3, 0, 0, 0) // Mon Mar 3 2025, midnight
    expect(formatResetTime(date)).toBe('Resets Mon 03/03 at 12:00 AM')
  })

  it('formats noon correctly', () => {
    const date = new Date(2025, 11, 26, 12, 0, 0) // Fri Dec 26 2025, noon
    expect(formatResetTime(date)).toBe('Resets Fri 12/26 at 12:00 PM')
  })

  it('zero-pads single digit day', () => {
    const date = new Date(2025, 0, 7, 6, 0, 0) // Tue Jan 7 2025, 6:00am
    expect(formatResetTime(date)).toBe('Resets Tue 01/07 at 6:00 AM')
  })

  it('formats end of year correctly', () => {
    const date = new Date(2025, 11, 31, 23, 59, 0) // Wed Dec 31 2025, 11:59pm
    expect(formatResetTime(date)).toBe('Resets Wed 12/31 at 11:59 PM')
  })
})
