/**
 * Tests for sprout form date helpers in twig-view/sprout-form.ts
 */

import { describe, it, expect } from 'vitest'
import { getEndDate, formatDate } from '../ui/twig-view/sprout-form'

describe('getEndDate', () => {
  it('sets end time to 9am local time, not UTC', () => {
    const start = new Date(2025, 5, 15, 12, 0, 0) // June 15, noon local
    const result = getEndDate('2w', start)
    expect(result.getHours()).toBe(9)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
  })

  it('adds 14 days for 2w season', () => {
    const start = new Date(2025, 0, 1, 12, 0, 0) // Jan 1
    const result = getEndDate('2w', start)
    expect(result.getDate()).toBe(15) // Jan 15
    expect(result.getMonth()).toBe(0)
  })

  it('adds 1 month for 1m season', () => {
    const start = new Date(2025, 0, 15, 12, 0, 0) // Jan 15
    const result = getEndDate('1m', start)
    expect(result.getMonth()).toBe(1) // Feb
    expect(result.getDate()).toBe(15)
  })

  it('adds 3 months for 3m season', () => {
    const start = new Date(2025, 0, 15, 12, 0, 0)
    const result = getEndDate('3m', start)
    expect(result.getMonth()).toBe(3) // April
  })

  it('adds 6 months for 6m season', () => {
    const start = new Date(2025, 0, 15, 12, 0, 0)
    const result = getEndDate('6m', start)
    expect(result.getMonth()).toBe(6) // July
  })

  it('adds 1 year for 1y season', () => {
    const start = new Date(2025, 0, 15, 12, 0, 0)
    const result = getEndDate('1y', start)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(0) // Jan
  })

  it('uses local hours regardless of start time', () => {
    // Even when starting at midnight, end should be 9am local
    const midnight = new Date(2025, 3, 10, 0, 0, 0)
    const result = getEndDate('1m', midnight)
    expect(result.getHours()).toBe(9)

    // Starting at 11pm, end should still be 9am local
    const lateNight = new Date(2025, 3, 10, 23, 59, 59)
    const result2 = getEndDate('1m', lateNight)
    expect(result2.getHours()).toBe(9)
  })

  it('defaults to current date when no start provided', () => {
    const result = getEndDate('2w')
    expect(result.getHours()).toBe(9)
    expect(result.getMinutes()).toBe(0)
  })
})

describe('formatDate', () => {
  it('formats date in en-US short format', () => {
    const date = new Date(2025, 5, 15) // June 15, 2025
    const result = formatDate(date)
    expect(result).toBe('Jun 15, 2025')
  })
})
