import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../events', () => ({
  getState: vi.fn(() => ({ sunEntries: [] })),
}))

vi.mock('../state', () => ({
  getPresetLabel: vi.fn((id: string) => {
    const labels: Record<string, string> = {
      'branch-0': 'Health',
      'branch-1': 'Career',
      'branch-3': 'Creativity',
    }
    return labels[id] || ''
  }),
}))

const escapeHtmlSpy = vi.fn((s: string) => s)
vi.mock('../utils/escape-html', () => ({
  escapeHtml: (...args: any[]) => escapeHtmlSpy(...args),
}))

vi.mock('../utils/date-formatting', () => ({
  formatDateShort: vi.fn((ts: string) => `formatted:${ts}`),
}))

vi.mock('../ui/dom-builder/build-dialogs', () => ({
  trapFocus: vi.fn(() => vi.fn()),
}))

import { getState } from '../events'
import { initSunLogDialog } from '../features/sunlog-dialog'
import { trapFocus } from '../ui/dom-builder/build-dialogs'

function createElements() {
  const sunLogDialog = document.createElement('div')
  sunLogDialog.classList.add('hidden')
  const dialogBox = document.createElement('div')
  dialogBox.setAttribute('role', 'dialog')
  sunLogDialog.appendChild(dialogBox)

  const sunLogDialogClose = document.createElement('button')
  const sunLogDialogEmpty = document.createElement('div')
  const sunLogDialogEntries = document.createElement('div')
  const sunMeter = document.createElement('div')

  return {
    sunLogDialog,
    sunLogDialogClose,
    sunLogDialogEmpty,
    sunLogDialogEntries,
    sunMeter,
  }
}

function makeSunEntry(
  overrides: Partial<{
    timestamp: string
    content: string
    prompt: string
    twigId: string
    twigLabel: string
  }> = {},
) {
  return {
    timestamp: overrides.timestamp ?? '2026-03-10T12:00:00Z',
    content: overrides.content ?? 'Reflected on progress',
    prompt: overrides.prompt,
    context: {
      twigId: overrides.twigId ?? 'branch-0-twig-3',
      twigLabel: overrides.twigLabel ?? 'Exercise',
    },
  }
}

describe('sunlog-dialog', () => {
  let elements: ReturnType<typeof createElements>
  let callbacks: { onPopulateSunLogShine: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    elements = createElements()
    callbacks = { onPopulateSunLogShine: vi.fn() }
    vi.mocked(getState).mockReturnValue({ sunEntries: [] } as any)
  })

  describe('initSunLogDialog', () => {
    it('returns populate, open, isOpen, close API', () => {
      const api = initSunLogDialog(elements, callbacks)
      expect(api).toHaveProperty('populate')
      expect(api).toHaveProperty('open')
      expect(api).toHaveProperty('isOpen')
      expect(api).toHaveProperty('close')
    })
  })

  describe('open', () => {
    it('calls onPopulateSunLogShine callback', () => {
      const api = initSunLogDialog(elements, callbacks)
      api.open()
      expect(callbacks.onPopulateSunLogShine).toHaveBeenCalledOnce()
    })

    it('removes hidden class from dialog', () => {
      const api = initSunLogDialog(elements, callbacks)
      api.open()
      expect(elements.sunLogDialog.classList.contains('hidden')).toBe(false)
    })

    it('sets up focus trap on role="dialog" element', () => {
      const api = initSunLogDialog(elements, callbacks)
      api.open()
      const dialogBox = elements.sunLogDialog.querySelector('[role="dialog"]')
      expect(trapFocus).toHaveBeenCalledWith(dialogBox)
    })

    it('populates entries when opened', () => {
      vi.mocked(getState).mockReturnValue({
        sunEntries: [makeSunEntry()],
      } as any)
      const api = initSunLogDialog(elements, callbacks)
      api.open()
      expect(elements.sunLogDialogEntries.innerHTML).toContain('sun-log-entry')
    })
  })

  describe('close', () => {
    it('adds hidden class to dialog', () => {
      const api = initSunLogDialog(elements, callbacks)
      api.open()
      api.close()
      expect(elements.sunLogDialog.classList.contains('hidden')).toBe(true)
    })

    it('releases focus trap on close', () => {
      const releaseFn = vi.fn()
      vi.mocked(trapFocus).mockReturnValue(releaseFn)
      const api = initSunLogDialog(elements, callbacks)
      api.open()
      api.close()
      expect(releaseFn).toHaveBeenCalledOnce()
    })
  })

  describe('isOpen', () => {
    it('returns false when dialog has hidden class', () => {
      const api = initSunLogDialog(elements, callbacks)
      expect(api.isOpen()).toBe(false)
    })

    it('returns true after opening', () => {
      const api = initSunLogDialog(elements, callbacks)
      api.open()
      expect(api.isOpen()).toBe(true)
    })

    it('returns false after closing', () => {
      const api = initSunLogDialog(elements, callbacks)
      api.open()
      api.close()
      expect(api.isOpen()).toBe(false)
    })
  })

  describe('event listeners', () => {
    it('opens dialog when sunMeter is clicked', () => {
      initSunLogDialog(elements, callbacks)
      elements.sunMeter.click()
      expect(elements.sunLogDialog.classList.contains('hidden')).toBe(false)
      expect(callbacks.onPopulateSunLogShine).toHaveBeenCalledOnce()
    })

    it('closes dialog when close button is clicked', () => {
      const api = initSunLogDialog(elements, callbacks)
      api.open()
      elements.sunLogDialogClose.click()
      expect(elements.sunLogDialog.classList.contains('hidden')).toBe(true)
    })

    it('closes dialog on backdrop click', () => {
      const api = initSunLogDialog(elements, callbacks)
      api.open()
      elements.sunLogDialog.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(elements.sunLogDialog.classList.contains('hidden')).toBe(true)
    })

    it('does not close when clicking inside dialog content', () => {
      const api = initSunLogDialog(elements, callbacks)
      api.open()
      const dialogBox = elements.sunLogDialog.querySelector('[role="dialog"]')!
      dialogBox.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(elements.sunLogDialog.classList.contains('hidden')).toBe(false)
    })
  })

  describe('populate', () => {
    it('shows empty message when no entries', () => {
      const api = initSunLogDialog(elements, callbacks)
      api.populate()
      expect(elements.sunLogDialogEmpty.style.display).toBe('block')
      expect(elements.sunLogDialogEntries.style.display).toBe('none')
    })

    it('shows entries container when entries exist', () => {
      vi.mocked(getState).mockReturnValue({
        sunEntries: [makeSunEntry()],
      } as any)
      const api = initSunLogDialog(elements, callbacks)
      api.populate()
      expect(elements.sunLogDialogEmpty.style.display).toBe('none')
      expect(elements.sunLogDialogEntries.style.display).toBe('flex')
    })

    it('renders entries in reverse order', () => {
      vi.mocked(getState).mockReturnValue({
        sunEntries: [
          makeSunEntry({ content: 'First entry', timestamp: '2026-03-08' }),
          makeSunEntry({ content: 'Second entry', timestamp: '2026-03-09' }),
          makeSunEntry({ content: 'Third entry', timestamp: '2026-03-10' }),
        ],
      } as any)
      const api = initSunLogDialog(elements, callbacks)
      api.populate()
      const html = elements.sunLogDialogEntries.innerHTML
      const firstIdx = html.indexOf('Third entry')
      const lastIdx = html.indexOf('First entry')
      expect(firstIdx).toBeLessThan(lastIdx)
    })

    it('renders context with branch and twig labels', () => {
      vi.mocked(getState).mockReturnValue({
        sunEntries: [makeSunEntry({ twigId: 'branch-0-twig-3', twigLabel: 'Exercise' })],
      } as any)
      const api = initSunLogDialog(elements, callbacks)
      api.populate()
      const html = elements.sunLogDialogEntries.innerHTML
      expect(html).toContain('Health : Exercise')
    })

    it('renders only twig label when branch label not found', () => {
      vi.mocked(getState).mockReturnValue({
        sunEntries: [makeSunEntry({ twigId: 'branch-7-twig-1', twigLabel: 'Unknown Twig' })],
      } as any)
      const api = initSunLogDialog(elements, callbacks)
      api.populate()
      const html = elements.sunLogDialogEntries.innerHTML
      expect(html).toContain('Unknown Twig')
      expect(html).not.toContain(' : ')
    })

    it('renders formatted timestamp', () => {
      vi.mocked(getState).mockReturnValue({
        sunEntries: [makeSunEntry({ timestamp: '2026-03-10T15:00:00Z' })],
      } as any)
      const api = initSunLogDialog(elements, callbacks)
      api.populate()
      expect(elements.sunLogDialogEntries.innerHTML).toContain('formatted:2026-03-10T15:00:00Z')
    })

    it('renders prompt when present', () => {
      vi.mocked(getState).mockReturnValue({
        sunEntries: [makeSunEntry({ prompt: 'What did you learn today?' })],
      } as any)
      const api = initSunLogDialog(elements, callbacks)
      api.populate()
      const html = elements.sunLogDialogEntries.innerHTML
      expect(html).toContain('sun-log-entry-prompt')
      expect(html).toContain('What did you learn today?')
    })

    it('omits prompt HTML when prompt is absent', () => {
      vi.mocked(getState).mockReturnValue({
        sunEntries: [makeSunEntry()],
      } as any)
      const api = initSunLogDialog(elements, callbacks)
      api.populate()
      expect(elements.sunLogDialogEntries.innerHTML).not.toContain('sun-log-entry-prompt')
    })

    it('renders entry content', () => {
      vi.mocked(getState).mockReturnValue({
        sunEntries: [makeSunEntry({ content: 'Deep reflection on life' })],
      } as any)
      const api = initSunLogDialog(elements, callbacks)
      api.populate()
      expect(elements.sunLogDialogEntries.innerHTML).toContain('Deep reflection on life')
    })

    it('does not call onPopulateSunLogShine when using populate directly', () => {
      const api = initSunLogDialog(elements, callbacks)
      api.populate()
      expect(callbacks.onPopulateSunLogShine).not.toHaveBeenCalled()
    })
  })

  describe('XSS protection', () => {
    it('calls escapeHtml on content, twig label, branch label, and prompt', () => {
      escapeHtmlSpy.mockClear()

      vi.mocked(getState).mockReturnValue({
        sunEntries: [
          makeSunEntry({
            content: '<script>alert("xss")</script>',
            twigLabel: '<b>bold</b>',
            prompt: '<img onerror=alert(1)>',
            twigId: 'branch-0-twig-3',
          }),
        ],
      } as any)

      const api = initSunLogDialog(elements, callbacks)
      api.populate()

      const calledWith = escapeHtmlSpy.mock.calls.map((c) => c[0])
      expect(calledWith).toContain('<script>alert("xss")</script>')
      expect(calledWith).toContain('<b>bold</b>')
      expect(calledWith).toContain('<img onerror=alert(1)>')
      // Branch label "Health" also escaped
      expect(calledWith).toContain('Health')
    })
  })
})
