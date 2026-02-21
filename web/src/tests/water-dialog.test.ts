/**
 * Tests for features/water-dialog.ts
 * Tests the water dialog lifecycle, sprout selection, prompt uniqueness,
 * and pour button behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks (module-level, before any imports of the module under test)
// ---------------------------------------------------------------------------

const MOCK_PROMPTS = [
  'Prompt A',
  'Prompt B',
  'Prompt C',
  'Prompt D',
  'Prompt E',
  'Prompt F',
  'Prompt G',
  'Prompt H',
  'Prompt I',
  'Prompt J',
  'Prompt K',
  'Prompt L',
]

vi.mock('../generated/constants', () => ({
  WATERING_PROMPTS: [
    'Prompt A',
    'Prompt B',
    'Prompt C',
    'Prompt D',
    'Prompt E',
    'Prompt F',
    'Prompt G',
    'Prompt H',
    'Prompt I',
    'Prompt J',
    'Prompt K',
    'Prompt L',
  ],
  RECENT_WATER_LIMIT: 10,
}))

vi.mock('../state', () => ({
  canAffordWater: vi.fn(() => true),
}))

vi.mock('../utils/debounce', () => ({
  preventDoubleClick: (fn: Function) => fn,
}))

vi.mock('../events', () => ({
  appendEvent: vi.fn(),
  getWaterAvailable: vi.fn(() => 3),
  checkSproutWateredToday: vi.fn(() => false),
}))

vi.mock('../utils/escape-html', () => ({
  escapeHtml: (s: string) => s,
}))

vi.mock('../../../shared/constants.json', () => ({
  default: { soil: { recoveryRates: { waterUse: 0.05 } } },
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { initWaterDialog } from '../features/water-dialog'
import { appendEvent, getWaterAvailable, checkSproutWateredToday } from '../events'
import { canAffordWater } from '../state'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActiveSproutInfo = {
  id: string
  title: string
  waterEntries?: { timestamp: string }[]
}

type WaterDialogCallbacks = {
  onWaterMeterChange: () => void
  onSoilMeterChange: () => void
  onWaterComplete: () => void
  getActiveSprouts: () => ActiveSproutInfo[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSprout(
  id: string,
  title: string,
  waterEntries?: { timestamp: string }[],
): ActiveSproutInfo {
  return { id, title, waterEntries }
}

function createMockCtx() {
  const waterDialog = document.createElement('div')
  waterDialog.classList.add('hidden')

  const waterDialogBody = document.createElement('div')
  const waterDialogClose = document.createElement('button')

  return {
    elements: {
      waterDialog,
      waterDialogBody,
      waterDialogClose,
    },
  } as unknown as Parameters<typeof initWaterDialog>[0]
}

function createMockCallbacks(sprouts: ActiveSproutInfo[] = []): WaterDialogCallbacks {
  return {
    onWaterMeterChange: vi.fn(),
    onSoilMeterChange: vi.fn(),
    onWaterComplete: vi.fn(),
    getActiveSprouts: vi.fn(() => sprouts),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('water-dialog', () => {
  let ctx: ReturnType<typeof createMockCtx>
  let callbacks: WaterDialogCallbacks

  beforeEach(async () => {
    vi.clearAllMocks()

    // Re-apply default mock behaviors
    vi.mocked(checkSproutWateredToday).mockReturnValue(false)
    vi.mocked(getWaterAvailable).mockReturnValue(3)
    vi.mocked(canAffordWater).mockReturnValue(true)
    vi.mocked(appendEvent).mockImplementation(() => {})

    ctx = createMockCtx()
  })

  // =========================================================================
  // openWaterDialog
  // =========================================================================

  describe('openWaterDialog', () => {
    it('creates sections for up to 3 unwatered sprouts', () => {
      const sprouts = [
        makeSprout('s1', 'Run daily'),
        makeSprout('s2', 'Read a book'),
        makeSprout('s3', 'Meditate'),
        makeSprout('s4', 'Cook meals'),
      ]
      callbacks = createMockCallbacks(sprouts)
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog()

      const sections = ctx.elements.waterDialogBody.querySelectorAll('.water-dialog-section')
      expect(sections.length).toBe(3)

      // Verify sprout names are rendered
      const names = ctx.elements.waterDialogBody.querySelectorAll('.water-dialog-sprout-name')
      const nameTexts = Array.from(names).map((el) => el.textContent)
      expect(nameTexts).toContain('Run daily')
      expect(nameTexts).toContain('Read a book')
      expect(nameTexts).toContain('Meditate')
    })

    it('does nothing when all sprouts are already watered today', () => {
      vi.mocked(checkSproutWateredToday).mockReturnValue(true)

      const sprouts = [makeSprout('s1', 'Run daily'), makeSprout('s2', 'Read a book')]
      callbacks = createMockCallbacks(sprouts)
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog()

      // Dialog should remain hidden
      expect(ctx.elements.waterDialog.classList.contains('hidden')).toBe(true)
      // No sections rendered
      const sections = ctx.elements.waterDialogBody.querySelectorAll('.water-dialog-section')
      expect(sections.length).toBe(0)
    })

    it('targets specific sprout when passed as argument', () => {
      const target = makeSprout('s-target', 'Specific Goal')
      // Provide extra sprouts via getActiveSprouts to prove they are ignored
      callbacks = createMockCallbacks([makeSprout('s1', 'Other1'), makeSprout('s2', 'Other2')])
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog(target)

      const sections = ctx.elements.waterDialogBody.querySelectorAll('.water-dialog-section')
      expect(sections.length).toBe(1)

      const name = ctx.elements.waterDialogBody.querySelector('.water-dialog-sprout-name')
      expect(name?.textContent).toBe('Specific Goal')
    })

    it('does not open if target sprout is already watered today', () => {
      vi.mocked(checkSproutWateredToday).mockImplementation((id: string) => id === 's-watered')

      const target = makeSprout('s-watered', 'Already Done')
      callbacks = createMockCallbacks([])
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog(target)

      expect(ctx.elements.waterDialog.classList.contains('hidden')).toBe(true)
      const sections = ctx.elements.waterDialogBody.querySelectorAll('.water-dialog-section')
      expect(sections.length).toBe(0)
    })

    it('removes hidden class when dialog opens', () => {
      callbacks = createMockCallbacks([makeSprout('s1', 'Goal 1')])
      const api = initWaterDialog(ctx, callbacks)

      expect(ctx.elements.waterDialog.classList.contains('hidden')).toBe(true)
      api.openWaterDialog()
      expect(ctx.elements.waterDialog.classList.contains('hidden')).toBe(false)
    })

    it('renders the soil gain text in each section', () => {
      callbacks = createMockCallbacks([makeSprout('s1', 'Goal')])
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog()

      const soilGain = ctx.elements.waterDialogBody.querySelector('.water-dialog-soil-gain')
      expect(soilGain?.textContent).toBe('+0.05 soil')
    })
  })

  // =========================================================================
  // closeWaterDialog
  // =========================================================================

  describe('closeWaterDialog', () => {
    it('adds hidden class', () => {
      callbacks = createMockCallbacks([makeSprout('s1', 'Goal')])
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog()
      expect(ctx.elements.waterDialog.classList.contains('hidden')).toBe(false)

      api.closeWaterDialog()
      expect(ctx.elements.waterDialog.classList.contains('hidden')).toBe(true)
    })
  })

  // =========================================================================
  // isOpen
  // =========================================================================

  describe('isOpen', () => {
    it('returns true when dialog is visible (hidden class removed)', () => {
      callbacks = createMockCallbacks([makeSprout('s1', 'Goal')])
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog()
      expect(api.isOpen()).toBe(true)
    })

    it('returns false when dialog has hidden class', () => {
      callbacks = createMockCallbacks([makeSprout('s1', 'Goal')])
      const api = initWaterDialog(ctx, callbacks)

      expect(api.isOpen()).toBe(false)
    })

    it('returns false after closing a previously open dialog', () => {
      callbacks = createMockCallbacks([makeSprout('s1', 'Goal')])
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog()
      expect(api.isOpen()).toBe(true)

      api.closeWaterDialog()
      expect(api.isOpen()).toBe(false)
    })
  })

  // =========================================================================
  // Pour button behavior
  // =========================================================================

  describe('Pour button', () => {
    it('is disabled initially (no textarea content)', () => {
      callbacks = createMockCallbacks([makeSprout('s1', 'Goal')])
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog()

      const pourBtn =
        ctx.elements.waterDialogBody.querySelector<HTMLButtonElement>('.water-dialog-pour')
      expect(pourBtn?.disabled).toBe(true)
    })

    it('is enabled when textarea has content and water is available', () => {
      callbacks = createMockCallbacks([makeSprout('s1', 'Goal')])
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog()

      const textarea = ctx.elements.waterDialogBody.querySelector<HTMLTextAreaElement>('textarea')!
      const pourBtn =
        ctx.elements.waterDialogBody.querySelector<HTMLButtonElement>('.water-dialog-pour')!

      // Type something into the textarea
      textarea.value = 'Made progress today'
      textarea.dispatchEvent(new Event('input', { bubbles: true }))

      expect(pourBtn.disabled).toBe(false)
    })

    it('watering a sprout: appends event, disables button, calls callbacks', () => {
      callbacks = createMockCallbacks([makeSprout('s1', 'Goal')])
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog()

      const textarea = ctx.elements.waterDialogBody.querySelector<HTMLTextAreaElement>('textarea')!
      const pourBtn =
        ctx.elements.waterDialogBody.querySelector<HTMLButtonElement>('.water-dialog-pour')!

      // Enable button
      textarea.value = 'Journaling about progress'
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
      expect(pourBtn.disabled).toBe(false)

      // Click pour
      pourBtn.click()

      // Verify event was appended
      expect(appendEvent).toHaveBeenCalledOnce()
      const eventArg = vi.mocked(appendEvent).mock.calls[0][0]
      expect(eventArg).toMatchObject({
        type: 'sprout_watered',
        sproutId: 's1',
        content: 'Journaling about progress',
      })
      expect(eventArg).toHaveProperty('timestamp')
      expect(eventArg).toHaveProperty('prompt')

      // Button should now be disabled and say "Watered"
      expect(pourBtn.disabled).toBe(true)
      expect(pourBtn.textContent).toBe('Watered')

      // Textarea should be disabled
      expect(textarea.disabled).toBe(true)

      // Section should have is-watered class
      const section = ctx.elements.waterDialogBody.querySelector('.water-dialog-section')!
      expect(section.classList.contains('is-watered')).toBe(true)

      // Callbacks should have been called
      expect(callbacks.onWaterMeterChange).toHaveBeenCalledOnce()
      expect(callbacks.onSoilMeterChange).toHaveBeenCalledOnce()
      expect(callbacks.onWaterComplete).toHaveBeenCalledOnce()
    })

    it('is disabled when no water remaining', () => {
      vi.mocked(getWaterAvailable).mockReturnValue(0)

      callbacks = createMockCallbacks([makeSprout('s1', 'Goal')])
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog()

      const textarea = ctx.elements.waterDialogBody.querySelector<HTMLTextAreaElement>('textarea')!
      const pourBtn =
        ctx.elements.waterDialogBody.querySelector<HTMLButtonElement>('.water-dialog-pour')!

      // Even with content, button should be disabled when no water
      textarea.value = 'Some text'
      textarea.dispatchEvent(new Event('input', { bubbles: true }))

      // canAffordWater returns false for the input listener check
      vi.mocked(canAffordWater).mockReturnValue(false)
      textarea.dispatchEvent(new Event('input', { bubbles: true }))

      expect(pourBtn.disabled).toBe(true)
    })

    it('does not pour when canAffordWater returns false at click time', () => {
      callbacks = createMockCallbacks([makeSprout('s1', 'Goal')])
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog()

      const textarea = ctx.elements.waterDialogBody.querySelector<HTMLTextAreaElement>('textarea')!
      const pourBtn =
        ctx.elements.waterDialogBody.querySelector<HTMLButtonElement>('.water-dialog-pour')!

      // Enable button first
      textarea.value = 'Text'
      textarea.dispatchEvent(new Event('input', { bubbles: true }))

      // Then remove water affordability for the click handler guard
      vi.mocked(canAffordWater).mockReturnValue(false)
      pourBtn.disabled = false // Force button enabled to test the guard inside the click handler
      pourBtn.click()

      expect(appendEvent).not.toHaveBeenCalled()
    })

    it('disables remaining pour buttons after watering consumes last water', () => {
      // Start with 1 water remaining
      vi.mocked(getWaterAvailable).mockReturnValue(1)

      const sprouts = [makeSprout('s1', 'Goal 1'), makeSprout('s2', 'Goal 2')]
      callbacks = createMockCallbacks(sprouts)
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog()

      const sections = ctx.elements.waterDialogBody.querySelectorAll('.water-dialog-section')
      const textarea1 = sections[0].querySelector<HTMLTextAreaElement>('textarea')!
      const pourBtn1 = sections[0].querySelector<HTMLButtonElement>('.water-dialog-pour')!
      const textarea2 = sections[1].querySelector<HTMLTextAreaElement>('textarea')!
      const pourBtn2 = sections[1].querySelector<HTMLButtonElement>('.water-dialog-pour')!

      // Type in both textareas
      textarea1.value = 'Text 1'
      textarea1.dispatchEvent(new Event('input', { bubbles: true }))
      textarea2.value = 'Text 2'
      textarea2.dispatchEvent(new Event('input', { bubbles: true }))

      // After watering s1, water drops to 0
      vi.mocked(getWaterAvailable).mockReturnValue(0)
      pourBtn1.click()

      // Second button should now be disabled
      expect(pourBtn2.disabled).toBe(true)
    })
  })

  // =========================================================================
  // selectDailySprouts (tested indirectly via openWaterDialog)
  // =========================================================================

  describe('selectDailySprouts', () => {
    it('sorts by least recently watered first', () => {
      // Sprout A was watered more recently than sprout B
      const sprouts = [
        makeSprout('s-recent', 'Recent', [{ timestamp: '2026-02-20T08:00:00Z' }]),
        makeSprout('s-old', 'Old', [{ timestamp: '2026-02-18T08:00:00Z' }]),
        makeSprout('s-middle', 'Middle', [{ timestamp: '2026-02-19T08:00:00Z' }]),
      ]
      callbacks = createMockCallbacks(sprouts)
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog()

      const sections = ctx.elements.waterDialogBody.querySelectorAll('.water-dialog-section')
      const renderedIds = Array.from(sections).map((s) => (s as HTMLElement).dataset.sproutId)

      // Least recently watered first
      expect(renderedIds).toEqual(['s-old', 's-middle', 's-recent'])
    })

    it('limits to 3 sprouts max', () => {
      const sprouts = [
        makeSprout('s1', 'Goal 1'),
        makeSprout('s2', 'Goal 2'),
        makeSprout('s3', 'Goal 3'),
        makeSprout('s4', 'Goal 4'),
        makeSprout('s5', 'Goal 5'),
      ]
      callbacks = createMockCallbacks(sprouts)
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog()

      const sections = ctx.elements.waterDialogBody.querySelectorAll('.water-dialog-section')
      expect(sections.length).toBe(3)
    })

    it('excludes sprouts already watered today', () => {
      vi.mocked(checkSproutWateredToday).mockImplementation((id: string) => id === 's-done')

      const sprouts = [
        makeSprout('s-done', 'Already Watered'),
        makeSprout('s-pending', 'Needs Water'),
      ]
      callbacks = createMockCallbacks(sprouts)
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog()

      const sections = ctx.elements.waterDialogBody.querySelectorAll('.water-dialog-section')
      expect(sections.length).toBe(1)
      expect((sections[0] as HTMLElement).dataset.sproutId).toBe('s-pending')
    })

    it('sorts sprouts with no water entries before recently watered ones', () => {
      const sprouts = [
        makeSprout('s-watered', 'Watered', [{ timestamp: '2026-02-19T08:00:00Z' }]),
        makeSprout('s-never', 'Never Watered'),
      ]
      callbacks = createMockCallbacks(sprouts)
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog()

      const sections = ctx.elements.waterDialogBody.querySelectorAll('.water-dialog-section')
      const renderedIds = Array.from(sections).map((s) => (s as HTMLElement).dataset.sproutId)

      // Never-watered sprout (empty string sorts before any timestamp) comes first
      expect(renderedIds[0]).toBe('s-never')
    })
  })

  // =========================================================================
  // Prompt uniqueness (getUniquePrompts tested indirectly)
  // =========================================================================

  describe('Prompt uniqueness', () => {
    it('returns distinct prompts within a single call', () => {
      callbacks = createMockCallbacks([
        makeSprout('s1', 'Goal 1'),
        makeSprout('s2', 'Goal 2'),
        makeSprout('s3', 'Goal 3'),
      ])
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog()

      const promptElements = ctx.elements.waterDialogBody.querySelectorAll('.water-dialog-prompt')
      const prompts = Array.from(promptElements).map((el) => el.textContent)

      // All 3 prompts should be distinct
      const uniquePrompts = new Set(prompts)
      expect(uniquePrompts.size).toBe(3)
    })

    it('uses prompts from the known prompt list', () => {
      callbacks = createMockCallbacks([makeSprout('s1', 'Goal 1')])
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog()

      const promptEl = ctx.elements.waterDialogBody.querySelector('.water-dialog-prompt')
      expect(MOCK_PROMPTS).toContain(promptEl?.textContent)
    })
  })

  // =========================================================================
  // Close button wiring
  // =========================================================================

  describe('Close button wiring', () => {
    it('closes dialog when close button is clicked', () => {
      callbacks = createMockCallbacks([makeSprout('s1', 'Goal')])
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog()
      expect(api.isOpen()).toBe(true)

      ctx.elements.waterDialogClose.click()
      expect(api.isOpen()).toBe(false)
    })

    it('closes dialog when clicking the backdrop (dialog element itself)', () => {
      callbacks = createMockCallbacks([makeSprout('s1', 'Goal')])
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog()
      expect(api.isOpen()).toBe(true)

      // Simulate clicking the dialog backdrop (target is the dialog element itself)
      const clickEvent = new MouseEvent('click', { bubbles: true })
      Object.defineProperty(clickEvent, 'target', { value: ctx.elements.waterDialog })
      ctx.elements.waterDialog.dispatchEvent(clickEvent)

      expect(api.isOpen()).toBe(false)
    })

    it('does not close when clicking inside dialog body', () => {
      callbacks = createMockCallbacks([makeSprout('s1', 'Goal')])
      const api = initWaterDialog(ctx, callbacks)

      api.openWaterDialog()
      expect(api.isOpen()).toBe(true)

      // Simulate clicking inside the dialog body (target is a child element)
      const clickEvent = new MouseEvent('click', { bubbles: true })
      Object.defineProperty(clickEvent, 'target', { value: ctx.elements.waterDialogBody })
      ctx.elements.waterDialog.dispatchEvent(clickEvent)

      expect(api.isOpen()).toBe(true)
    })
  })
})
