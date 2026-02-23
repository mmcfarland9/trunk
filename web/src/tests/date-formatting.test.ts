/**
 * Tests for utils/date-formatting.ts
 * Tests formatDateShort and formatDateWithYear with various dates.
 */

import { describe, it, expect } from 'vitest'
import { formatDateShort, formatDateWithYear } from '../utils/date-formatting'

/**
 * Helper: build expected output for a given date string using the same logic
 * as the source functions, ensuring timezone-independent assertions.
 */
function expectedShort(dateStr: string): string {
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${month}/${day} ${time}`
}

function expectedWithYear(dateStr: string): string {
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${month}/${day}/${year} ${time}`
}

describe('formatDateShort', () => {
  it('formats a mid-year date', () => {
    const dateStr = '2024-06-15T18:30:00Z'
    expect(formatDateShort(dateStr)).toBe(expectedShort(dateStr))
  })

  it('formats January 1st', () => {
    const dateStr = '2024-01-01T12:00:00Z'
    expect(formatDateShort(dateStr)).toBe(expectedShort(dateStr))
  })

  it('formats December 31st', () => {
    const dateStr = '2024-12-31T12:00:00Z'
    expect(formatDateShort(dateStr)).toBe(expectedShort(dateStr))
  })

  it('formats leap year Feb 29', () => {
    const dateStr = '2024-02-29T12:00:00Z'
    expect(formatDateShort(dateStr)).toBe(expectedShort(dateStr))
  })

  it('formats single-digit day', () => {
    const dateStr = '2024-03-05T12:00:00Z'
    const result = formatDateShort(dateStr)
    // Day should be zero-padded
    expect(result).toMatch(/^03\/05 /)
  })

  it('formats single-digit month', () => {
    const dateStr = '2024-01-15T12:00:00Z'
    const result = formatDateShort(dateStr)
    // Month should be zero-padded
    expect(result).toMatch(/^01\/15 /)
  })

  it('formats double-digit month', () => {
    const dateStr = '2024-11-15T12:00:00Z'
    const result = formatDateShort(dateStr)
    expect(result).toMatch(/^11\/15 /)
  })

  it('returns MM/DD time format', () => {
    const result = formatDateShort('2024-06-15T18:30:00Z')
    // Should match pattern: MM/DD h:mm AM/PM
    expect(result).toMatch(/^\d{2}\/\d{2} \d{1,2}:\d{2} [AP]M$/)
  })

  it('handles epoch date', () => {
    const dateStr = '1970-01-01T12:00:00Z'
    const result = formatDateShort(dateStr)
    expect(result).toBe(expectedShort(dateStr))
  })

  it('handles far-future date', () => {
    const dateStr = '2099-12-31T12:00:00Z'
    const result = formatDateShort(dateStr)
    expect(result).toBe(expectedShort(dateStr))
  })
})

describe('formatDateWithYear', () => {
  it('formats a mid-year date with year', () => {
    const dateStr = '2024-06-15T18:30:00Z'
    expect(formatDateWithYear(dateStr)).toBe(expectedWithYear(dateStr))
  })

  it('formats January 1st with year', () => {
    const dateStr = '2024-01-01T12:00:00Z'
    expect(formatDateWithYear(dateStr)).toBe(expectedWithYear(dateStr))
  })

  it('formats December 31st with year', () => {
    const dateStr = '2024-12-31T12:00:00Z'
    expect(formatDateWithYear(dateStr)).toBe(expectedWithYear(dateStr))
  })

  it('formats leap year Feb 29 with year', () => {
    const dateStr = '2024-02-29T12:00:00Z'
    expect(formatDateWithYear(dateStr)).toBe(expectedWithYear(dateStr))
  })

  it('returns MM/DD/YYYY time format', () => {
    const result = formatDateWithYear('2024-06-15T18:30:00Z')
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{1,2}:\d{2} [AP]M$/)
  })

  it('includes 4-digit year', () => {
    const result = formatDateWithYear('2024-06-15T12:00:00Z')
    expect(result).toContain('/2024 ')
  })

  it('handles epoch date with year', () => {
    const dateStr = '1970-01-01T12:00:00Z'
    const result = formatDateWithYear(dateStr)
    expect(result).toBe(expectedWithYear(dateStr))
    expect(result).toContain('1970')
  })

  it('handles far-future date with year', () => {
    const dateStr = '2099-12-31T12:00:00Z'
    const result = formatDateWithYear(dateStr)
    expect(result).toBe(expectedWithYear(dateStr))
    expect(result).toContain('2099')
  })

  it('zero-pads single-digit month and day', () => {
    const dateStr = '2024-03-05T12:00:00Z'
    const result = formatDateWithYear(dateStr)
    expect(result).toMatch(/^03\/05\/2024 /)
  })
})
