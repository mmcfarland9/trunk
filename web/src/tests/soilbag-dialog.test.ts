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
import { type HarvestableSprout, initSoilBagDialog } from '../features/soilbag-dialog'
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
  const soilBagStatusText = document.createElement('p')
  const soilBagStatusFill = document.createElement('div')
  const soilBagStatusMeta = document.createElement('p')
  const soilBagReadyEmpty = document.createElement('p')
  const soilBagReadyList = document.createElement('div')
  const soilMeter = document.createElement('button')

  return {
    soilBagDialog,
    soilBagDialogClose,
    soilBagDialogEmpty,
    soilBagDialogEntries,
    soilBagStatusText,
    soilBagStatusFill,
    soilBagStatusMeta,
    soilBagReadyEmpty,
    soilBagReadyList,
    soilMeter,
  }
}

type SoilBagCallbacks = {
  getSoilStatus: () => { available: number; capacity: number; committed: number; growing: number }
  getHarvestableSprouts: () => HarvestableSprout[]
  onHarvestSprout: (sproutId: string) => void
}

function createCallbacks(overrides: Partial<SoilBagCallbacks> = {}) {
  return {
    getSoilStatus: vi.fn(() => ({ available: 8, capacity: 20, committed: 12, growing: 2 })),
    getHarvestableSprouts: vi.fn(() => [] as HarvestableSprout[]),
    onHarvestSprout: vi.fn(),
    ...overrides,
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
      initSoilBagDialog(elements, createCallbacks())
      expect(elements.soilBagDialog.classList.contains('hidden')).toBe(true)

      elements.soilMeter.click()
      expect(elements.soilBagDialog.classList.contains('hidden')).toBe(false)
    })

    it('populates entries on open', () => {
      const entries: SoilEntry[] = [makeEntry(1.5, 'Watered sprout', '2026-03-10T10:00:00Z')]
      vi.mocked(deriveSoilLog).mockReturnValue(entries)

      initSoilBagDialog(elements, createCallbacks())
      elements.soilMeter.click()

      expect(elements.soilBagDialogEntries.innerHTML).toContain('Watered sprout')
    })

    it('sets up focus trap on the dialog box', () => {
      initSoilBagDialog(elements, createCallbacks())
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
      initSoilBagDialog(elements, createCallbacks())
      elements.soilMeter.click()
      expect(elements.soilBagDialog.classList.contains('hidden')).toBe(false)

      elements.soilBagDialogClose.click()
      expect(elements.soilBagDialog.classList.contains('hidden')).toBe(true)
    })

    it('adds hidden class when backdrop is clicked', () => {
      initSoilBagDialog(elements, createCallbacks())
      elements.soilMeter.click()
      expect(elements.soilBagDialog.classList.contains('hidden')).toBe(false)

      const clickEvent = new MouseEvent('click', { bubbles: true })
      Object.defineProperty(clickEvent, 'target', { value: elements.soilBagDialog })
      elements.soilBagDialog.dispatchEvent(clickEvent)

      expect(elements.soilBagDialog.classList.contains('hidden')).toBe(true)
    })

    it('does not close when clicking inside dialog content', () => {
      initSoilBagDialog(elements, createCallbacks())
      elements.soilMeter.click()

      const clickEvent = new MouseEvent('click', { bubbles: true })
      Object.defineProperty(clickEvent, 'target', {
        value: elements.soilBagDialogEntries,
      })
      elements.soilBagDialog.dispatchEvent(clickEvent)

      expect(elements.soilBagDialog.classList.contains('hidden')).toBe(false)
    })

    it('closes via the returned close function', () => {
      const api = initSoilBagDialog(elements, createCallbacks())
      elements.soilMeter.click()
      expect(elements.soilBagDialog.classList.contains('hidden')).toBe(false)

      api.close()
      expect(elements.soilBagDialog.classList.contains('hidden')).toBe(true)
    })

    it('releases focus trap on close', () => {
      const releaseFn = vi.fn()
      vi.mocked(trapFocus).mockReturnValue(releaseFn)

      initSoilBagDialog(elements, createCallbacks())
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
      const api = initSoilBagDialog(elements, createCallbacks())
      expect(api.isOpen()).toBe(false)
    })

    it('returns true after opening', () => {
      const api = initSoilBagDialog(elements, createCallbacks())
      elements.soilMeter.click()
      expect(api.isOpen()).toBe(true)
    })

    it('returns false after closing', () => {
      const api = initSoilBagDialog(elements, createCallbacks())
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

      initSoilBagDialog(elements, createCallbacks())
      elements.soilMeter.click()

      const reasons = elements.soilBagDialogEntries.querySelectorAll('.soil-bag-entry-reason')
      expect(reasons[0].textContent).toBe('Third (newest)')
      expect(reasons[1].textContent).toBe('Second')
      expect(reasons[2].textContent).toBe('First (oldest)')
    })

    it('hides empty message and shows entries container', () => {
      vi.mocked(deriveSoilLog).mockReturnValue([makeEntry(0.05, 'Entry', '2026-03-10T10:00:00Z')])

      initSoilBagDialog(elements, createCallbacks())
      elements.soilMeter.click()

      expect(elements.soilBagDialogEmpty.style.display).toBe('none')
      expect(elements.soilBagDialogEntries.style.display).toBe('flex')
    })

    it('renders amount, reason, and timestamp for each entry', () => {
      vi.mocked(deriveSoilLog).mockReturnValue([
        makeEntry(1.5, 'Planted sprout', '2026-03-10T12:00:00Z'),
      ])

      initSoilBagDialog(elements, createCallbacks())
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

      initSoilBagDialog(elements, createCallbacks())
      elements.soilMeter.click()

      expect(elements.soilBagDialogEmpty.style.display).toBe('block')
      expect(elements.soilBagDialogEntries.style.display).toBe('none')
    })

    it('does not set innerHTML when empty', () => {
      vi.mocked(deriveSoilLog).mockReturnValue([])

      initSoilBagDialog(elements, createCallbacks())
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

      initSoilBagDialog(elements, createCallbacks())
      elements.soilMeter.click()

      const amount = elements.soilBagDialogEntries.querySelector('.soil-bag-entry-amount')!
      expect(amount.classList.contains('is-gain')).toBe(true)
      expect(amount.textContent).toBe('+0.05')
    })

    it('negative amounts get is-loss class and no + prefix', () => {
      vi.mocked(deriveSoilLog).mockReturnValue([
        makeEntry(-2.0, 'Planted sprout', '2026-03-10T10:00:00Z'),
      ])

      initSoilBagDialog(elements, createCallbacks())
      elements.soilMeter.click()

      const amount = elements.soilBagDialogEntries.querySelector('.soil-bag-entry-amount')!
      expect(amount.classList.contains('is-loss')).toBe(true)
      expect(amount.textContent).toBe('-2.00')
    })

    it('formats amounts to two decimal places', () => {
      vi.mocked(deriveSoilLog).mockReturnValue([makeEntry(1, 'Harvest', '2026-03-10T10:00:00Z')])

      initSoilBagDialog(elements, createCallbacks())
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

      initSoilBagDialog(elements, createCallbacks())
      elements.soilMeter.click()

      expect(escapeHtml).toHaveBeenCalledWith('<script>alert("xss")</script>')
    })

    it('calls escapeHtml on context when present', () => {
      vi.mocked(deriveSoilLog).mockReturnValue([
        makeEntry(0.05, 'Watered', '2026-03-10T10:00:00Z', '<img onerror="hack()">'),
      ])

      initSoilBagDialog(elements, createCallbacks())
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

      initSoilBagDialog(elements, createCallbacks())
      elements.soilMeter.click()

      const contextEl = elements.soilBagDialogEntries.querySelector('.soil-bag-entry-context')
      expect(contextEl).not.toBeNull()
      expect(contextEl!.textContent).toBe('My sprout')
    })

    it('does not render context span when entry has no context', () => {
      vi.mocked(deriveSoilLog).mockReturnValue([makeEntry(0.05, 'Watered', '2026-03-10T10:00:00Z')])

      initSoilBagDialog(elements, createCallbacks())
      elements.soilMeter.click()

      const contextEl = elements.soilBagDialogEntries.querySelector('.soil-bag-entry-context')
      expect(contextEl).toBeNull()
    })
  })

  // =========================================================================
  // Soil status summary
  // =========================================================================

  describe('status summary', () => {
    it('shows available/capacity and fills the bar proportionally', () => {
      initSoilBagDialog(elements, createCallbacks())
      elements.soilMeter.click()

      expect(elements.soilBagStatusText.textContent).toBe('8.00/20.00 available')
      expect(elements.soilBagStatusFill.style.width).toBe('40%')
    })

    it('summarises committed soil across growing sprouts', () => {
      initSoilBagDialog(elements, createCallbacks())
      elements.soilMeter.click()

      expect(elements.soilBagStatusMeta.textContent).toBe('12.00 committed to 2 growing sprouts')
    })

    it('uses singular wording for a single growing sprout', () => {
      initSoilBagDialog(
        elements,
        createCallbacks({
          getSoilStatus: () => ({ available: 8, capacity: 20, committed: 6, growing: 1 }),
        }),
      )
      elements.soilMeter.click()

      expect(elements.soilBagStatusMeta.textContent).toBe('6.00 committed to 1 growing sprout')
    })

    it('reports nothing growing when no soil is committed', () => {
      initSoilBagDialog(
        elements,
        createCallbacks({
          getSoilStatus: () => ({ available: 10, capacity: 10, committed: 0, growing: 0 }),
        }),
      )
      elements.soilMeter.click()

      expect(elements.soilBagStatusMeta.textContent).toContain('No soil committed')
    })

    it('does not divide by zero when capacity is zero', () => {
      initSoilBagDialog(
        elements,
        createCallbacks({
          getSoilStatus: () => ({ available: 0, capacity: 0, committed: 0, growing: 0 }),
        }),
      )
      elements.soilMeter.click()

      expect(elements.soilBagStatusFill.style.width).toBe('0%')
    })
  })

  // =========================================================================
  // Ready to harvest
  // =========================================================================

  describe('ready to harvest list', () => {
    const harvestable: HarvestableSprout[] = [
      { id: 'sprout-1', title: 'Learn Guitar', twigLabel: 'Music', soilCost: 8 },
      { id: 'sprout-2', title: 'Run a 5k', twigLabel: 'Movement', soilCost: 4.5 },
    ]

    it('renders a row per harvestable sprout with the soil it returns', () => {
      initSoilBagDialog(elements, createCallbacks({ getHarvestableSprouts: () => harvestable }))
      elements.soilMeter.click()

      const rows = elements.soilBagReadyList.querySelectorAll('.soil-bag-ready-row')
      expect(rows).toHaveLength(2)
      expect(rows[0].textContent).toContain('Learn Guitar')
      expect(rows[0].textContent).toContain('returns +8.00 soil')
      expect(rows[1].textContent).toContain('returns +4.50 soil')
      expect(elements.soilBagReadyEmpty.style.display).toBe('none')
    })

    it('sets sprout title as text, not HTML, so markup cannot be injected', () => {
      initSoilBagDialog(
        elements,
        createCallbacks({
          getHarvestableSprouts: () => [
            {
              id: 'sprout-x',
              title: '<img src=x onerror=alert(1)>',
              twigLabel: '<b>hi</b>',
              soilCost: 1,
            },
          ],
        }),
      )
      elements.soilMeter.click()

      expect(elements.soilBagReadyList.querySelector('img')).toBeNull()
      expect(elements.soilBagReadyList.querySelector('b')).toBeNull()
      expect(elements.soilBagReadyList.textContent).toContain('<img src=x onerror=alert(1)>')
    })

    it('closes the bag and delegates to onHarvestSprout when a row button is clicked', () => {
      const callbacks = createCallbacks({ getHarvestableSprouts: () => harvestable })
      const api = initSoilBagDialog(elements, callbacks)
      elements.soilMeter.click()

      elements.soilBagReadyList.querySelector<HTMLButtonElement>('.soil-bag-ready-harvest')?.click()

      expect(callbacks.onHarvestSprout).toHaveBeenCalledWith('sprout-1')
      expect(api.isOpen()).toBe(false)
    })

    it('shows an empty state when nothing is ready', () => {
      initSoilBagDialog(elements, createCallbacks({ getHarvestableSprouts: () => [] }))
      elements.soilMeter.click()

      expect(elements.soilBagReadyEmpty.textContent).toContain('Nothing ready to harvest')
      expect(elements.soilBagReadyList.style.display).toBe('none')
    })

    it('rebuilds the list on reopen rather than appending', () => {
      initSoilBagDialog(elements, createCallbacks({ getHarvestableSprouts: () => harvestable }))

      elements.soilMeter.click()
      elements.soilBagDialogClose.click()
      elements.soilMeter.click()

      expect(elements.soilBagReadyList.querySelectorAll('.soil-bag-ready-row')).toHaveLength(2)
    })
  })
})
