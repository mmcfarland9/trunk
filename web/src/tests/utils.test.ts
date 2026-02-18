/**
 * Tests for utility functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { escapeHtml } from '../utils/escape-html'
import { debounce, preventDoubleClick } from '../utils/debounce'

describe('escapeHtml', () => {
  it('escapes < character', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes > character', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b')
  })

  it('escapes & character', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar')
  })

  it('escapes all special characters in one string', () => {
    expect(escapeHtml('<a href="x">Test & More</a>')).toBe(
      '&lt;a href="x"&gt;Test &amp; More&lt;/a&gt;',
    )
  })

  it('returns empty string for empty input', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('returns same string when no escaping needed', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World')
  })

  it('handles multiple occurrences', () => {
    expect(escapeHtml('<<>>')).toBe('&lt;&lt;&gt;&gt;')
  })

  it('preserves other characters', () => {
    expect(escapeHtml('Price: $100 (50% off!)')).toBe('Price: $100 (50% off!)')
  })

  it('handles unicode correctly', () => {
    expect(escapeHtml('日本語 & emoji 🌲')).toBe('日本語 &amp; emoji 🌲')
  })
})

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('delays function execution', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('cancels previous call on re-trigger', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    vi.advanceTimersByTime(50)

    debounced() // Re-trigger
    vi.advanceTimersByTime(50)

    // First call was cancelled, second is still pending
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('only calls once after multiple rapid triggers', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    debounced()
    debounced()
    debounced()
    debounced()

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('passes arguments to debounced function', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('arg1', 'arg2')
    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('uses latest arguments when re-triggered', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('first')
    debounced('second')
    debounced('third')

    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledWith('third')
  })
})

describe('preventDoubleClick', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Create a mock MouseEvent for testing
  const mockEvent = { type: 'click' } as MouseEvent

  it('allows first call', () => {
    const fn = vi.fn()
    const protected_ = preventDoubleClick(fn, 100)

    protected_(mockEvent)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('blocks rapid second call', () => {
    const fn = vi.fn()
    const protected_ = preventDoubleClick(fn, 100)

    protected_(mockEvent)
    protected_(mockEvent) // Blocked

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('allows call after lockout expires', () => {
    const fn = vi.fn()
    const protected_ = preventDoubleClick(fn, 100)

    protected_(mockEvent)
    vi.advanceTimersByTime(100)
    protected_(mockEvent) // Allowed

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('blocks multiple rapid calls', () => {
    const fn = vi.fn()
    const protected_ = preventDoubleClick(fn, 100)

    protected_(mockEvent)
    protected_(mockEvent)
    protected_(mockEvent)
    protected_(mockEvent)
    protected_(mockEvent)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('passes event through', () => {
    const fn = vi.fn()
    const protected_ = preventDoubleClick(fn, 100)

    protected_(mockEvent)

    expect(fn).toHaveBeenCalledWith(mockEvent)
  })
})
