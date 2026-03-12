import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../state', () => ({
  getWaterAvailable: vi.fn(() => 3),
  getWaterCapacity: vi.fn(() => 5),
  getNextWaterReset: vi.fn(() => new Date('2026-01-01T06:00:00')),
  formatResetTime: vi.fn(() => 'Resets at 6:00 AM'),
  getPresetLabel: vi.fn(() => ''),
}))

vi.mock('../events', () => ({
  getState: vi.fn(() => ({})),
  getAllWaterEntries: vi.fn(() => []),
}))

vi.mock('../utils/escape-html', () => ({
  escapeHtml: vi.fn((s: string) => s),
}))

vi.mock('../utils/date-formatting', () => ({
  formatDateWithYear: vi.fn((ts: string) => ts),
}))

vi.mock('../ui/dom-builder/build-dialogs', () => ({
  trapFocus: vi.fn(() => vi.fn()),
}))

import { getAllWaterEntries } from '../events'
import { initWaterCanDialog } from '../features/watercan-dialog'
import { formatResetTime, getNextWaterReset, getWaterAvailable, getWaterCapacity } from '../state'
import { trapFocus } from '../ui/dom-builder/build-dialogs'
import { formatDateWithYear } from '../utils/date-formatting'
import { escapeHtml } from '../utils/escape-html'

function createElements() {
  const waterCanDialog = document.createElement('div')
  waterCanDialog.classList.add('hidden')
  const dialogBox = document.createElement('div')
  dialogBox.setAttribute('role', 'dialog')
  waterCanDialog.appendChild(dialogBox)

  const waterCanDialogClose = document.createElement('button')
  const waterCanStatusText = document.createElement('span')
  const waterCanStatusReset = document.createElement('span')
  waterCanStatusReset.classList.add('hidden')
  const waterCanEmptyLog = document.createElement('div')
  const waterCanLogEntries = document.createElement('div')
  const waterMeter = document.createElement('button')

  return {
    waterCanDialog,
    waterCanDialogClose,
    waterCanStatusText,
    waterCanStatusReset,
    waterCanEmptyLog,
    waterCanLogEntries,
    waterMeter,
  }
}

describe('watercan-dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getWaterAvailable).mockReturnValue(3)
    vi.mocked(getWaterCapacity).mockReturnValue(5)
    vi.mocked(getAllWaterEntries).mockReturnValue([])
    vi.mocked(escapeHtml).mockImplementation((s: string) => s)
    vi.mocked(formatDateWithYear).mockImplementation((ts: string) => ts)
    vi.mocked(trapFocus).mockReturnValue(vi.fn())
  })

  describe('initWaterCanDialog', () => {
    it('returns isOpen and close functions', () => {
      const elements = createElements()
      const dialog = initWaterCanDialog(elements)
      expect(typeof dialog.isOpen).toBe('function')
      expect(typeof dialog.close).toBe('function')
    })

    it('starts closed', () => {
      const elements = createElements()
      const dialog = initWaterCanDialog(elements)
      expect(dialog.isOpen()).toBe(false)
    })
  })

  describe('openDialog', () => {
    it('opens when waterMeter is clicked', () => {
      const elements = createElements()
      const dialog = initWaterCanDialog(elements)

      elements.waterMeter.click()

      expect(dialog.isOpen()).toBe(true)
      expect(elements.waterCanDialog.classList.contains('hidden')).toBe(false)
    })

    it('populates status on open', () => {
      const elements = createElements()
      initWaterCanDialog(elements)

      elements.waterMeter.click()

      expect(elements.waterCanStatusText.textContent).toBe('3/5 remaining')
    })

    it('sets up focus trap on open', () => {
      const elements = createElements()
      initWaterCanDialog(elements)

      elements.waterMeter.click()

      const dialogBox = elements.waterCanDialog.querySelector('[role="dialog"]')
      expect(trapFocus).toHaveBeenCalledWith(dialogBox)
    })
  })

  describe('closeDialog', () => {
    it('closes when close button is clicked', () => {
      const elements = createElements()
      const dialog = initWaterCanDialog(elements)
      elements.waterMeter.click()
      expect(dialog.isOpen()).toBe(true)

      elements.waterCanDialogClose.click()

      expect(dialog.isOpen()).toBe(false)
      expect(elements.waterCanDialog.classList.contains('hidden')).toBe(true)
    })

    it('closes when backdrop is clicked', () => {
      const elements = createElements()
      const dialog = initWaterCanDialog(elements)
      elements.waterMeter.click()

      elements.waterCanDialog.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      expect(dialog.isOpen()).toBe(false)
    })

    it('does not close when inner dialog content is clicked', () => {
      const elements = createElements()
      const dialog = initWaterCanDialog(elements)
      elements.waterMeter.click()

      const dialogBox = elements.waterCanDialog.querySelector('[role="dialog"]')!
      dialogBox.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      expect(dialog.isOpen()).toBe(true)
    })

    it('releases focus trap on close', () => {
      const releaseFn = vi.fn()
      vi.mocked(trapFocus).mockReturnValue(releaseFn)

      const elements = createElements()
      initWaterCanDialog(elements)
      elements.waterMeter.click()
      elements.waterCanDialogClose.click()

      expect(releaseFn).toHaveBeenCalled()
    })

    it('close() method works programmatically', () => {
      const elements = createElements()
      const dialog = initWaterCanDialog(elements)
      elements.waterMeter.click()

      dialog.close()

      expect(dialog.isOpen()).toBe(false)
    })
  })

  describe('populateWaterCan - water available', () => {
    it('shows remaining count and hides reset time', () => {
      vi.mocked(getWaterAvailable).mockReturnValue(2)
      vi.mocked(getWaterCapacity).mockReturnValue(5)

      const elements = createElements()
      initWaterCanDialog(elements)
      elements.waterMeter.click()

      expect(elements.waterCanStatusText.textContent).toBe('2/5 remaining')
      expect(elements.waterCanStatusReset.classList.contains('hidden')).toBe(true)
    })
  })

  describe('populateWaterCan - empty', () => {
    it('shows Empty and displays formatted reset time', () => {
      vi.mocked(getWaterAvailable).mockReturnValue(0)
      vi.mocked(formatResetTime).mockReturnValue('Resets at 6:00 AM')
      vi.mocked(getNextWaterReset).mockReturnValue(new Date('2026-01-01T06:00:00'))

      const elements = createElements()
      initWaterCanDialog(elements)
      elements.waterMeter.click()

      expect(elements.waterCanStatusText.textContent).toBe('Empty')
      expect(elements.waterCanStatusReset.textContent).toBe('Resets at 6:00 AM')
      expect(elements.waterCanStatusReset.classList.contains('hidden')).toBe(false)
    })
  })

  describe('populateWaterCan - log entries', () => {
    it('renders entries with sprout title, twig label, timestamp, and content', () => {
      vi.mocked(getAllWaterEntries).mockReturnValue([
        {
          timestamp: '2026-01-01T12:00:00Z',
          content: 'Watered today',
          sproutId: 'sprout-1',
          sproutTitle: 'Learn Guitar',
          twigId: 'branch-1-twig-1',
          twigLabel: 'Music',
        },
      ])
      vi.mocked(formatDateWithYear).mockReturnValue('Jan 1, 2026')

      const elements = createElements()
      initWaterCanDialog(elements)
      elements.waterMeter.click()

      const html = elements.waterCanLogEntries.innerHTML
      expect(html).toContain('Learn Guitar')
      expect(html).toContain('Music')
      expect(html).toContain('Jan 1, 2026')
      expect(html).toContain('Watered today')
      expect(elements.waterCanEmptyLog.style.display).toBe('none')
      expect(elements.waterCanLogEntries.style.display).toBe('flex')
    })

    it('shows prompt when present', () => {
      vi.mocked(getAllWaterEntries).mockReturnValue([
        {
          timestamp: '2026-01-01T12:00:00Z',
          content: 'Practiced scales',
          prompt: 'What did you practice?',
          sproutId: 'sprout-1',
          sproutTitle: 'Guitar',
          twigId: 'branch-1-twig-1',
          twigLabel: 'Music',
        },
      ])

      const elements = createElements()
      initWaterCanDialog(elements)
      elements.waterMeter.click()

      const html = elements.waterCanLogEntries.innerHTML
      expect(html).toContain('water-can-log-entry-prompt')
      expect(html).toContain('What did you practice?')
    })

    it('omits prompt section when prompt is absent', () => {
      vi.mocked(getAllWaterEntries).mockReturnValue([
        {
          timestamp: '2026-01-01T12:00:00Z',
          content: 'Did a thing',
          sproutId: 'sprout-1',
          sproutTitle: 'Goal',
          twigId: 'branch-1-twig-1',
          twigLabel: 'Area',
        },
      ])

      const elements = createElements()
      initWaterCanDialog(elements)
      elements.waterMeter.click()

      expect(elements.waterCanLogEntries.innerHTML).not.toContain('water-can-log-entry-prompt')
    })
  })

  describe('populateWaterCan - empty log', () => {
    it('shows empty log message and hides entries container', () => {
      vi.mocked(getAllWaterEntries).mockReturnValue([])

      const elements = createElements()
      initWaterCanDialog(elements)
      elements.waterMeter.click()

      expect(elements.waterCanEmptyLog.style.display).toBe('block')
      expect(elements.waterCanLogEntries.style.display).toBe('none')
    })
  })

  describe('XSS protection', () => {
    it('calls escapeHtml on sprout title, twig label, content, and prompt', () => {
      vi.mocked(getAllWaterEntries).mockReturnValue([
        {
          timestamp: '2026-01-01T12:00:00Z',
          content: '<script>alert("xss")</script>',
          prompt: '<img onerror=alert(1)>',
          sproutId: 'sprout-1',
          sproutTitle: '<b>Bold</b>',
          twigId: 'branch-1-twig-1',
          twigLabel: '<i>Italic</i>',
        },
      ])

      const elements = createElements()
      initWaterCanDialog(elements)
      elements.waterMeter.click()

      expect(escapeHtml).toHaveBeenCalledWith('<b>Bold</b>')
      expect(escapeHtml).toHaveBeenCalledWith('<i>Italic</i>')
      expect(escapeHtml).toHaveBeenCalledWith('<script>alert("xss")</script>')
      expect(escapeHtml).toHaveBeenCalledWith('<img onerror=alert(1)>')
    })
  })
})
