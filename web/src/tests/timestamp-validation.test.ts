import { describe, it, expect } from 'vitest'
import fixture from '../../../shared/test-fixtures/timestamp-validation.json'

describe('Timestamp validation', () => {
  const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

  it('should generate timestamps with milliseconds', () => {
    const timestamp = new Date().toISOString()
    expect(timestamp).toMatch(TIMESTAMP_PATTERN)
  })

  it('should match all valid timestamps from fixture', () => {
    fixture.validTimestamps.forEach((timestamp) => {
      expect(timestamp).toMatch(TIMESTAMP_PATTERN)
    })
  })

  it('should reject all invalid timestamps from fixture', () => {
    fixture.invalidTimestamps.forEach((timestamp) => {
      expect(timestamp).not.toMatch(TIMESTAMP_PATTERN)
    })
  })

  it('should verify fixture has expected structure', () => {
    expect(fixture.validTimestamps).toHaveLength(3)
    expect(fixture.invalidTimestamps).toHaveLength(4)
  })
})
