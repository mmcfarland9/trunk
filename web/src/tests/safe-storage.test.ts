/**
 * Tests for safe-storage utility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { safeSetItem } from '../utils/safe-storage'

describe('safeSetItem', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns success when localStorage.setItem succeeds', () => {
    const result = safeSetItem('test-key', 'test-value')

    expect(result.success).toBe(true)
    expect(result.isQuotaError).toBe(false)
  })

  it('stores value in localStorage on success', () => {
    safeSetItem('test-key', 'test-value')

    expect(localStorage.getItem('test-key')).toBe('test-value')
  })

  it('returns quota error when QuotaExceededError is thrown', () => {
    // Mock localStorage to throw QuotaExceededError
    const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError')
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw quotaError
    })

    const result = safeSetItem('test-key', 'test-value')

    expect(result.success).toBe(false)
    expect(result.isQuotaError).toBe(true)
  })

  it('returns non-quota error when other DOMException is thrown', () => {
    // Mock localStorage to throw a non-quota DOMException
    const otherError = new DOMException('Security error', 'SecurityError')
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw otherError
    })

    const result = safeSetItem('test-key', 'test-value')

    expect(result.success).toBe(false)
    expect(result.isQuotaError).toBe(false)
  })

  it('returns non-quota error when generic error is thrown', () => {
    // Mock localStorage to throw a generic error
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable')
    })

    const result = safeSetItem('test-key', 'test-value')

    expect(result.success).toBe(false)
    expect(result.isQuotaError).toBe(false)
  })

  it('handles empty string values', () => {
    const result = safeSetItem('empty-key', '')

    expect(result.success).toBe(true)
    expect(localStorage.getItem('empty-key')).toBe('')
  })

  it('handles JSON string values', () => {
    const jsonValue = JSON.stringify({ foo: 'bar', num: 42 })
    const result = safeSetItem('json-key', jsonValue)

    expect(result.success).toBe(true)
    expect(localStorage.getItem('json-key')).toBe(jsonValue)
  })
})
