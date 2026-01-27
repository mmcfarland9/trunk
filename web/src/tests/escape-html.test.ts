/**
 * Tests for HTML escaping utility.
 */

import { describe, it, expect } from 'vitest'
import { escapeHtml } from '../utils/escape-html'

describe('escapeHtml', () => {
  it('should escape HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert("xss")&lt;/script&gt;'
    )
  })

  it('should escape ampersands', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry')
  })

  it('should preserve quotes (not needed for text content XSS protection)', () => {
    // textContent approach doesn't escape quotes, which is fine for XSS protection
    // in text content contexts (quotes only matter in attribute contexts)
    expect(escapeHtml('"quoted"')).toBe('"quoted"')
  })

  it('should escape angle brackets', () => {
    expect(escapeHtml('<tag>')).toBe('&lt;tag&gt;')
  })

  it('should handle empty string', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('should preserve normal text', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World')
  })

  it('should handle multiple special characters', () => {
    // Quotes preserved, tags and ampersands escaped
    expect(escapeHtml('<a href="test" & more>')).toBe(
      '&lt;a href="test" &amp; more&gt;'
    )
  })
})
