/**
 * Tests for quota warning banner (A4).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { showQuotaWarning } from '../bootstrap/ui'

describe('showQuotaWarning', () => {
  beforeEach(() => {
    // Clean up any leftover banners
    document.getElementById('quota-warning-banner')?.remove()
  })

  afterEach(() => {
    document.getElementById('quota-warning-banner')?.remove()
  })

  it('creates a warning banner in the DOM', () => {
    showQuotaWarning()
    const banner = document.getElementById('quota-warning-banner')
    expect(banner).not.toBeNull()
    expect(banner!.classList.contains('quota-warning')).toBe(true)
  })

  it('displays storage full message', () => {
    showQuotaWarning()
    const message = document.querySelector('.quota-warning-message')
    expect(message).not.toBeNull()
    expect(message!.textContent).toContain('Storage full')
    expect(message!.textContent).toContain('lost')
  })

  it('includes an Export Data button', () => {
    showQuotaWarning()
    const exportBtn = document.querySelector('.quota-warning-export')
    expect(exportBtn).not.toBeNull()
    expect(exportBtn!.textContent).toContain('Export Data')
  })

  it('does not duplicate banner if already visible', () => {
    showQuotaWarning()
    showQuotaWarning()
    const banners = document.querySelectorAll('#quota-warning-banner')
    expect(banners.length).toBe(1)
  })

  it('dismiss button removes the banner', () => {
    showQuotaWarning()
    const closeBtn = document.querySelector('.quota-warning-close') as HTMLButtonElement
    expect(closeBtn).not.toBeNull()
    closeBtn.click()
    expect(document.getElementById('quota-warning-banner')).toBeNull()
  })

  it('reappears after dismiss when called again', () => {
    showQuotaWarning()
    const closeBtn = document.querySelector('.quota-warning-close') as HTMLButtonElement
    closeBtn.click()
    expect(document.getElementById('quota-warning-banner')).toBeNull()

    // Simulate next failed save triggering the callback again
    showQuotaWarning()
    expect(document.getElementById('quota-warning-banner')).not.toBeNull()
  })

  it('Export Data button triggers a download', () => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    const mockUrl = 'blob:mock-url'
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => mockUrl),
      revokeObjectURL: vi.fn(),
    })

    // Track the <a> click
    const clickSpy = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') {
        vi.spyOn(el, 'click').mockImplementation(clickSpy)
      }
      return el
    })

    showQuotaWarning()
    const exportBtn = document.querySelector('.quota-warning-export') as HTMLButtonElement
    exportBtn.click()

    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl)

    vi.restoreAllMocks()
  })
})
