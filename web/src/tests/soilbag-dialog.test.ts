/**
 * Tests for features/soilbag-dialog.ts
 * Tests the soil bag dialog lifecycle: open/close, populate entries,
 * amount formatting, XSS protection, and optional context rendering.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks (module-level, before any imports of the module under test)
// ---------------------------------------------------------------------------

vi.mock('../events', () => ({
  getEvents: vi.fn(() => []),
  deriveSoilLog: vi.fn(() => []),
}))

vi.mock('../utils/escape-html', () => ({
  escapeHtml: vi.fn((s: string) => s),
}))

vi.mock('../utils/date-formatting', () => ({
  formatDateShort: vi.fn((ts: string) => ts),
}))

vi.mock('../ui/dom-builder/build-dialogs', () => ({
  trapFocus: vi.fn(() => vi.fn()),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { deriveSoilLog } from '../events'
import { initSoilBagDialog } from '../features/soilbag-dialog'
import { trapFocus } from '../ui/dom-builder/build-dialogs'
import { escapeHtml } from '../utils/escape-html'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SoilEntry = {
  amount: number
  reason: string
  context?: string
  timestamp: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(amount: number, reason: string, timestamp: string, context?: string): SoilEntry {
  return { amount, reason, timestamp, ...(context !== undefined && { context }) }
}

function createMockElements() {
  const soilBagDialog = document.createElement('div')
  soilBagDialog.classList.add('hidden')
  const dialogBox = document.createElement('div')
  dialogBox.setAttribute('role', 'dialog')
  soilBagDialog.appendChild(dialogBox)

  const soilBagDialogClose = document.createElement('button')
  const soilBagDialogEmpty = document.createElement('div')
  const soilBagDialogEntries = document.createElement('div')
  const soilMeter = document.createElement('button')

  return {
    soilBagDialog,
    soilBagDialogClose,
    soilBagDialogEmpty,
    soilBagDialogEntries,
    soilMeter,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('soilbag-dialog', () => {
  let elements: ReturnType<typeof createMockElements>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(deriveSoilLog).mockReturnValue([])
    elements = createMockElements()
  })

  // =========================================================================
  // openDialog (via soilMeter click)
  // =========================================================================

  describe('openDialog', () => {
    it('removes hidden class when soilMeter is clicked', () => {
      initSoilBagDialog(elements)
      expect(elements.soilBagDialog.classList.contains('hidden')).toBe(true)

      elements.soilMeter.click()
      expect(elements.soilBagDialog.classList.contains('hidden')).toBe(false)
    })

    it('populates entries on open', () => {
      const entries: SoilEntry[] = [makeEntry(1.5, 'Watered sprout', '2026-03-10T10:00:00Z')]
      vi.mocked(deriveSoilLog).mockReturnValue(entries)

      initSoilBagDialog(elements)
      elements.soilMeter.click()

      expect(elements.soilBagDialogEntries.innerHTML).toContain('Watered sprout')
    })

    it('sets up focus trap on the dialog box', () => {
      initSoilBagDialog(elements)
      elements.soilMeter.click()

      const dialogBox = elements.soilBagDialog.querySelector('[role="dialog"]')
      expect(trapFocus).toHaveBeenCalledWith(dialogBox)
    })
  })

  // =========================================================================
  // closeDialog
  // =========================================================================

  describe('closeDialog', () => {
    it('adds hidden class when close button is clicked', () => {
      initSoilBagDialog(elements)
      elements.soilMeter.click()
      expect(elements.soilBagDialog.classList.contains('hidden')).toBe(false)

      elements.soilBagDialogClose.click()
      expect(elements.soilBagDialog.classList.contains('hidden')).toBe(true)
    })

    it('adds hidden class when backdrop is clicked', () => {
      initSoilBagDialog(elements)
      elements.soilMeter.click()
      expect(elements.soilBagDialog.classList.contains('hidden')).toBe(false)

      const clickEvent = new MouseEvent('click', { bubbles: true })
      Object.defineProperty(clickEvent, 'target', { value: elements.soilBagDialog })
      elements.soilBagDialog.dispatchEvent(clickEvent)

      expect(elements.soilBagDialog.classList.contains('hidden')).toBe(true)
    })

    it('does not close when clicking inside dialog content', () => {
      initSoilBagDialog(elements)
      elements.soilMeter.click()

      const clickEvent = new MouseEvent('click', { bubbles: true })
      Object.defineProperty(clickEvent, 'target', {
        value: elements.soilBagDialogEntries,
      })
      elements.soilBagDialog.dispatchEvent(clickEvent)

      expect(elements.soilBagDialog.classList.contains('hidden')).toBe(false)
    })

    it('closes via the returned close function', () => {
      const api = initSoilBagDialog(elements)
      elements.soilMeter.click()
      expect(elements.soilBagDialog.classList.contains('hidden')).toBe(false)

      api.close()
      expect(elements.soilBagDialog.classList.contains('hidden')).toBe(true)
    })

    it('releases focus trap on close', () => {
      const releaseFn = vi.fn()
      vi.mocked(trapFocus).mockReturnValue(releaseFn)

      initSoilBagDialog(elements)
      elements.soilMeter.click()
      elements.soilBagDialogClose.click()

      expect(releaseFn).toHaveBeenCalledOnce()
    })
  })

  // =========================================================================
  // isOpen
  // =========================================================================

  describe('isOpen', () => {
    it('returns false initially', () => {
      const api = initSoilBagDialog(elements)
      expect(api.isOpen()).toBe(false)
    })

    it('returns true after opening', () => {
      const api = initSoilBagDialog(elements)
      elements.soilMeter.click()
      expect(api.isOpen()).toBe(true)
    })

    it('returns false after closing', () => {
      const api = initSoilBagDialog(elements)
      elements.soilMeter.click()
      api.close()
      expect(api.isOpen()).toBe(false)
    })
  })

  // =========================================================================
  // populateSoilBag with entries
  // =========================================================================

  describe('populateSoilBag with entries', () => {
    it('renders entries in reverse chronological order', () => {
      const entries: SoilEntry[] = [
        makeEntry(0.05, 'First (oldest)', '2026-03-08T10:00:00Z'),
        makeEntry(0.05, 'Second', '2026-03-09T10:00:00Z'),
        makeEntry(0.05, 'Third (newest)', '2026-03-10T10:00:00Z'),
      ]
      vi.mocked(deriveSoilLog).mockReturnValue(entries)

      initSoilBagDialog(elements)
      elements.soilMeter.click()

      const reasons = elements.soilBagDialogEntries.querySelectorAll('.soil-bag-entry-reason')
      expect(reasons[0].textContent).toBe('Third (newest)')
      expect(reasons[1].textContent).toBe('Second')
      expect(reasons[2].textContent).toBe('First (oldest)')
    })

    it('hides empty message and shows entries container', () => {
      vi.mocked(deriveSoilLog).mockReturnValue([makeEntry(0.05, 'Entry', '2026-03-10T10:00:00Z')])

      initSoilBagDialog(elements)
      elements.soilMeter.click()

      expect(elements.soilBagDialogEmpty.style.display).toBe('none')
      expect(elements.soilBagDialogEntries.style.display).toBe('flex')
    })

    it('renders amount, reason, and timestamp for each entry', () => {
      vi.mocked(deriveSoilLog).mockReturnValue([
        makeEntry(1.5, 'Planted sprout', '2026-03-10T12:00:00Z'),
      ])

      initSoilBagDialog(elements)
      elements.soilMeter.click()

      const entry = elements.soilBagDialogEntries.querySelector('.soil-bag-entry')!
      expect(entry.querySelector('.soil-bag-entry-reason')!.textContent).toBe('Planted sprout')
      expect(entry.querySelector('.soil-bag-entry-amount')!.textContent).toBe('+1.50')
      expect(entry.querySelector('.soil-bag-entry-timestamp')!.textContent).toBe(
        '2026-03-10T12:00:00Z',
      )
    })
  })

  // =========================================================================
  // populateSoilBag empty
  // =========================================================================

  describe('populateSoilBag empty', () => {
    it('shows empty message and hides entries container', () => {
      vi.mocked(deriveSoilLog).mockReturnValue([])

      initSoilBagDialog(elements)
      elements.soilMeter.click()

      expect(elements.soilBagDialogEmpty.style.display).toBe('block')
      expect(elements.soilBagDialogEntries.style.display).toBe('none')
    })

    it('does not set innerHTML when empty', () => {
      vi.mocked(deriveSoilLog).mockReturnValue([])

      initSoilBagDialog(elements)
      elements.soilMeter.click()

      expect(elements.soilBagDialogEntries.innerHTML).toBe('')
    })
  })

  // =========================================================================
  // Amount formatting
  // =========================================================================

  describe('amount formatting', () => {
    it('positive amounts get is-gain class and + prefix', () => {
      vi.mocked(deriveSoilLog).mockReturnValue([makeEntry(0.05, 'Watered', '2026-03-10T10:00:00Z')])

      initSoilBagDialog(elements)
      elements.soilMeter.click()

      const amount = elements.soilBagDialogEntries.querySelector('.soil-bag-entry-amount')!
      expect(amount.classList.contains('is-gain')).toBe(true)
      expect(amount.textContent).toBe('+0.05')
    })

    it('negative amounts get is-loss class and no + prefix', () => {
      vi.mocked(deriveSoilLog).mockReturnValue([
        makeEntry(-2.0, 'Planted sprout', '2026-03-10T10:00:00Z'),
      ])

      initSoilBagDialog(elements)
      elements.soilMeter.click()

      const amount = elements.soilBagDialogEntries.querySelector('.soil-bag-entry-amount')!
      expect(amount.classList.contains('is-loss')).toBe(true)
      expect(amount.textContent).toBe('-2.00')
    })

    it('formats amounts to two decimal places', () => {
      vi.mocked(deriveSoilLog).mockReturnValue([makeEntry(1, 'Harvest', '2026-03-10T10:00:00Z')])

      initSoilBagDialog(elements)
      elements.soilMeter.click()

      const amount = elements.soilBagDialogEntries.querySelector('.soil-bag-entry-amount')!
      expect(amount.textContent).toBe('+1.00')
    })
  })

  // =========================================================================
  // XSS protection
  // =========================================================================

  describe('XSS protection', () => {
    it('calls escapeHtml on reason', () => {
      vi.mocked(deriveSoilLog).mockReturnValue([
        makeEntry(0.05, '<script>alert("xss")</script>', '2026-03-10T10:00:00Z'),
      ])

      initSoilBagDialog(elements)
      elements.soilMeter.click()

      expect(escapeHtml).toHaveBeenCalledWith('<script>alert("xss")</script>')
    })

    it('calls escapeHtml on context when present', () => {
      vi.mocked(deriveSoilLog).mockReturnValue([
        makeEntry(0.05, 'Watered', '2026-03-10T10:00:00Z', '<img onerror="hack()">'),
      ])

      initSoilBagDialog(elements)
      elements.soilMeter.click()

      expect(escapeHtml).toHaveBeenCalledWith('<img onerror="hack()">')
    })
  })

  // =========================================================================
  // Context is optional
  // =========================================================================

  describe('context rendering', () => {
    it('renders context span when entry has context', () => {
      vi.mocked(deriveSoilLog).mockReturnValue([
        makeEntry(0.05, 'Watered', '2026-03-10T10:00:00Z', 'My sprout'),
      ])

      initSoilBagDialog(elements)
      elements.soilMeter.click()

      const contextEl = elements.soilBagDialogEntries.querySelector('.soil-bag-entry-context')
      expect(contextEl).not.toBeNull()
      expect(contextEl!.textContent).toBe('My sprout')
    })

    it('does not render context span when entry has no context', () => {
      vi.mocked(deriveSoilLog).mockReturnValue([makeEntry(0.05, 'Watered', '2026-03-10T10:00:00Z')])

      initSoilBagDialog(elements)
      elements.soilMeter.click()

      const contextEl = elements.soilBagDialogEntries.querySelector('.soil-bag-entry-context')
      expect(contextEl).toBeNull()
    })
  })
})
