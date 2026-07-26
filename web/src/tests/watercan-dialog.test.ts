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
import { initWaterCanDialog, type ReadySprout } from '../features/watercan-dialog'
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
  const waterCanReadySection = document.createElement('div')
  const waterCanReadyEmpty = document.createElement('p')
  const waterCanReadyList = document.createElement('div')
  const waterCanReadyActions = document.createElement('div')
  const waterCanWaterAll = document.createElement('button')
  const waterMeter = document.createElement('button')

  return {
    waterCanDialog,
    waterCanDialogClose,
    waterCanStatusText,
    waterCanStatusReset,
    waterCanEmptyLog,
    waterCanLogEntries,
    waterCanReadySection,
    waterCanReadyEmpty,
    waterCanReadyList,
    waterCanReadyActions,
    waterCanWaterAll,
    waterMeter,
  }
}

function createCallbacks(overrides: Partial<WaterCanCallbacks> = {}) {
  return {
    getReadySprouts: vi.fn(() => [] as ReadySprout[]),
    onWaterSprout: vi.fn(),
    onWaterAll: vi.fn(),
    hasActiveSprouts: vi.fn(() => true),
    ...overrides,
  }
}

type WaterCanCallbacks = {
  getReadySprouts: () => ReadySprout[]
  onWaterSprout: (sproutId: string) => void
  onWaterAll: () => void
  hasActiveSprouts: () => boolean
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
      const dialog = initWaterCanDialog(elements, createCallbacks())
      expect(typeof dialog.isOpen).toBe('function')
      expect(typeof dialog.close).toBe('function')
    })

    it('starts closed', () => {
      const elements = createElements()
      const dialog = initWaterCanDialog(elements, createCallbacks())
      expect(dialog.isOpen()).toBe(false)
    })
  })

  describe('openDialog', () => {
    it('opens when waterMeter is clicked', () => {
      const elements = createElements()
      const dialog = initWaterCanDialog(elements, createCallbacks())

      elements.waterMeter.click()

      expect(dialog.isOpen()).toBe(true)
      expect(elements.waterCanDialog.classList.contains('hidden')).toBe(false)
    })

    it('populates status on open', () => {
      const elements = createElements()
      initWaterCanDialog(elements, createCallbacks())

      elements.waterMeter.click()

      expect(elements.waterCanStatusText.textContent).toBe('3/5 remaining')
    })

    it('sets up focus trap on open', () => {
      const elements = createElements()
      initWaterCanDialog(elements, createCallbacks())

      elements.waterMeter.click()

      const dialogBox = elements.waterCanDialog.querySelector('[role="dialog"]')
      expect(trapFocus).toHaveBeenCalledWith(dialogBox)
    })
  })

  describe('closeDialog', () => {
    it('closes when close button is clicked', () => {
      const elements = createElements()
      const dialog = initWaterCanDialog(elements, createCallbacks())
      elements.waterMeter.click()
      expect(dialog.isOpen()).toBe(true)

      elements.waterCanDialogClose.click()

      expect(dialog.isOpen()).toBe(false)
      expect(elements.waterCanDialog.classList.contains('hidden')).toBe(true)
    })

    it('closes when backdrop is clicked', () => {
      const elements = createElements()
      const dialog = initWaterCanDialog(elements, createCallbacks())
      elements.waterMeter.click()

      elements.waterCanDialog.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      expect(dialog.isOpen()).toBe(false)
    })

    it('does not close when inner dialog content is clicked', () => {
      const elements = createElements()
      const dialog = initWaterCanDialog(elements, createCallbacks())
      elements.waterMeter.click()

      const dialogBox = elements.waterCanDialog.querySelector('[role="dialog"]')!
      dialogBox.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      expect(dialog.isOpen()).toBe(true)
    })

    it('releases focus trap on close', () => {
      const releaseFn = vi.fn()
      vi.mocked(trapFocus).mockReturnValue(releaseFn)

      const elements = createElements()
      initWaterCanDialog(elements, createCallbacks())
      elements.waterMeter.click()
      elements.waterCanDialogClose.click()

      expect(releaseFn).toHaveBeenCalled()
    })

    it('close() method works programmatically', () => {
      const elements = createElements()
      const dialog = initWaterCanDialog(elements, createCallbacks())
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
      initWaterCanDialog(elements, createCallbacks())
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
      initWaterCanDialog(elements, createCallbacks())
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
      initWaterCanDialog(elements, createCallbacks())
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
      initWaterCanDialog(elements, createCallbacks())
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
      initWaterCanDialog(elements, createCallbacks())
      elements.waterMeter.click()

      expect(elements.waterCanLogEntries.innerHTML).not.toContain('water-can-log-entry-prompt')
    })
  })

  describe('populateWaterCan - empty log', () => {
    it('shows empty log message and hides entries container', () => {
      vi.mocked(getAllWaterEntries).mockReturnValue([])

      const elements = createElements()
      initWaterCanDialog(elements, createCallbacks())
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
      initWaterCanDialog(elements, createCallbacks())
      elements.waterMeter.click()

      expect(escapeHtml).toHaveBeenCalledWith('<b>Bold</b>')
      expect(escapeHtml).toHaveBeenCalledWith('<i>Italic</i>')
      expect(escapeHtml).toHaveBeenCalledWith('<script>alert("xss")</script>')
      expect(escapeHtml).toHaveBeenCalledWith('<img onerror=alert(1)>')
    })
  })

  describe('ready to water list', () => {
    const sprouts: ReadySprout[] = [
      { id: 'sprout-1', title: 'Learn Guitar', twigLabel: 'Music', lastWateredAt: null },
      {
        id: 'sprout-2',
        title: 'Run a 5k',
        twigLabel: 'Movement',
        lastWateredAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
    ]

    it('renders a row per ready sprout with title and last-watered meta', () => {
      const elements = createElements()
      initWaterCanDialog(elements, createCallbacks({ getReadySprouts: () => sprouts }))

      elements.waterMeter.click()

      const rows = elements.waterCanReadyList.querySelectorAll('.water-can-ready-row')
      expect(rows).toHaveLength(2)
      expect(rows[0].textContent).toContain('Learn Guitar')
      expect(rows[0].textContent).toContain('Never watered')
      expect(rows[1].textContent).toContain('Run a 5k')
      expect(rows[1].textContent).toContain('3 days ago')
      expect(elements.waterCanReadyEmpty.style.display).toBe('none')
    })

    it('sets sprout title as text, not HTML, so markup cannot be injected', () => {
      const elements = createElements()
      initWaterCanDialog(
        elements,
        createCallbacks({
          getReadySprouts: () => [
            {
              id: 'sprout-x',
              title: '<img src=x onerror=alert(1)>',
              twigLabel: '<b>hi</b>',
              lastWateredAt: null,
            },
          ],
        }),
      )

      elements.waterMeter.click()

      expect(elements.waterCanReadyList.querySelector('img')).toBeNull()
      expect(elements.waterCanReadyList.querySelector('b')).toBeNull()
      expect(elements.waterCanReadyList.textContent).toContain('<img src=x onerror=alert(1)>')
    })

    it('closes the can and delegates to onWaterSprout when a row button is clicked', () => {
      const elements = createElements()
      const callbacks = createCallbacks({ getReadySprouts: () => sprouts })
      const dialog = initWaterCanDialog(elements, callbacks)
      elements.waterMeter.click()

      elements.waterCanReadyList.querySelector<HTMLButtonElement>('.water-can-ready-water')?.click()

      expect(callbacks.onWaterSprout).toHaveBeenCalledWith('sprout-1')
      expect(dialog.isOpen()).toBe(false)
    })

    it('closes the can and delegates to onWaterAll when the batch button is clicked', () => {
      const elements = createElements()
      const callbacks = createCallbacks({ getReadySprouts: () => sprouts })
      const dialog = initWaterCanDialog(elements, callbacks)
      elements.waterMeter.click()

      elements.waterCanWaterAll.click()

      expect(callbacks.onWaterAll).toHaveBeenCalled()
      expect(dialog.isOpen()).toBe(false)
    })

    it('labels the batch button with the number of ready sprouts', () => {
      const elements = createElements()
      initWaterCanDialog(elements, createCallbacks({ getReadySprouts: () => sprouts }))

      elements.waterMeter.click()

      expect(elements.waterCanWaterAll.textContent).toBe('Water all 2')
    })

    it('rebuilds the list on reopen rather than appending', () => {
      const elements = createElements()
      initWaterCanDialog(elements, createCallbacks({ getReadySprouts: () => sprouts }))

      elements.waterMeter.click()
      elements.waterCanDialogClose.click()
      elements.waterMeter.click()

      expect(elements.waterCanReadyList.querySelectorAll('.water-can-ready-row')).toHaveLength(2)
    })
  })

  describe('ready to water - empty states', () => {
    it('says the can is empty when no water remains, without querying sprouts', () => {
      vi.mocked(getWaterAvailable).mockReturnValue(0)
      const elements = createElements()
      const callbacks = createCallbacks({
        getReadySprouts: vi.fn(() => [
          { id: 'sprout-1', title: 'Learn Guitar', twigLabel: 'Music', lastWateredAt: null },
        ]),
      })
      initWaterCanDialog(elements, callbacks)

      elements.waterMeter.click()

      expect(elements.waterCanReadyEmpty.textContent).toContain('empty')
      expect(elements.waterCanReadyList.style.display).toBe('none')
      expect(elements.waterCanReadyActions.style.display).toBe('none')
      expect(callbacks.getReadySprouts).not.toHaveBeenCalled()
    })

    it('prompts to plant when there are no active sprouts', () => {
      const elements = createElements()
      initWaterCanDialog(elements, createCallbacks({ hasActiveSprouts: () => false }))

      elements.waterMeter.click()

      expect(elements.waterCanReadyEmpty.textContent).toContain('Plant one')
      expect(elements.waterCanReadyList.style.display).toBe('none')
    })

    it('confirms all watered when active sprouts exist but none are due', () => {
      const elements = createElements()
      initWaterCanDialog(
        elements,
        createCallbacks({ hasActiveSprouts: () => true, getReadySprouts: () => [] }),
      )

      elements.waterMeter.click()

      expect(elements.waterCanReadyEmpty.textContent).toContain('All sprouts watered today')
      expect(elements.waterCanReadyActions.style.display).toBe('none')
    })
  })
})
