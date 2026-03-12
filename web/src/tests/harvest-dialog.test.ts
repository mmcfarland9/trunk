/**
 * Tests for features/harvest-dialog.ts
 * Tests the harvest dialog lifecycle, slider behavior, save/close logic,
 * and edge cases.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks (module-level, before any imports of the module under test)
// ---------------------------------------------------------------------------

vi.mock('../state', () => ({
  calculateCapacityGained: vi.fn(() => 0.5),
  getSoilCapacity: vi.fn(() => 10),
}))

vi.mock('../utils/debounce', () => ({
  preventDoubleClick: (fn: (...args: unknown[]) => unknown) => fn,
}))

vi.mock('../events', () => ({
  appendEvent: vi.fn(),
}))

vi.mock('../utils/sprout-labels', () => ({
  getResultEmoji: vi.fn((result: number) => ['', '🥀', '🌱', '🌿', '🌸', '🌺'][result] || ''),
}))

vi.mock('../ui/dom-builder/build-dialogs', () => ({
  trapFocus: vi.fn(() => vi.fn()),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { appendEvent } from '../events'
import { initHarvestDialog } from '../features/harvest-dialog'
import { calculateCapacityGained, getSoilCapacity } from '../state'
import { trapFocus } from '../ui/dom-builder/build-dialogs'
import { getResultEmoji } from '../utils/sprout-labels'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HarvestDialogCallbacks = {
  onSoilMeterChange: () => void
  onHarvestComplete: () => void
}

type SproutInput = Parameters<ReturnType<typeof initHarvestDialog>['openHarvestDialog']>[0]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSprout(overrides: Partial<SproutInput> = {}): SproutInput {
  return {
    id: 'sprout-abc',
    title: 'Learn guitar',
    twigId: 'branch-1-twig-branch-1-twig-3',
    twigLabel: 'Creativity',
    season: '3m',
    environment: 'fertile',
    soilCost: 2.5,
    ...overrides,
  }
}

function createMockCtx() {
  // Main dialog wrapper (backdrop)
  const harvestDialog = document.createElement('div')
  harvestDialog.classList.add('hidden')

  // Inner dialog box with role="dialog" for focus trapping
  const dialogBox = document.createElement('div')
  dialogBox.setAttribute('role', 'dialog')
  harvestDialog.appendChild(dialogBox)

  const harvestDialogTitle = document.createElement('h2')
  const harvestDialogMeta = document.createElement('p')

  const harvestDialogSlider = document.createElement('input')
  harvestDialogSlider.type = 'range'
  harvestDialogSlider.min = '1'
  harvestDialogSlider.max = '5'
  harvestDialogSlider.value = '3'

  // Bloom hints: NodeList-like collection via querySelectorAll
  const bloomContainer = document.createElement('div')
  for (const level of ['1', '3', '5']) {
    const hint = document.createElement('span')
    hint.dataset.level = level
    hint.classList.add('harvest-bloom-hint')
    bloomContainer.appendChild(hint)
  }
  const harvestDialogBloomHints = bloomContainer.querySelectorAll('.harvest-bloom-hint')

  const harvestDialogReflection = document.createElement('textarea')

  const harvestDialogResultEmoji = document.createElement('span')

  const harvestDialogSave = document.createElement('button')
  harvestDialogSave.innerHTML = 'Harvest'

  const harvestDialogClose = document.createElement('button')
  const harvestDialogCancel = document.createElement('button')

  return {
    elements: {
      harvestDialog,
      harvestDialogTitle,
      harvestDialogMeta,
      harvestDialogSlider,
      harvestDialogBloomHints,
      harvestDialogReflection,
      harvestDialogResultEmoji,
      harvestDialogSave,
      harvestDialogClose,
      harvestDialogCancel,
    },
  } as unknown as Parameters<typeof initHarvestDialog>[0]
}

function createMockCallbacks(): HarvestDialogCallbacks {
  return {
    onSoilMeterChange: vi.fn(),
    onHarvestComplete: vi.fn(),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('harvest-dialog', () => {
  let ctx: ReturnType<typeof createMockCtx>
  let callbacks: HarvestDialogCallbacks

  beforeEach(() => {
    vi.clearAllMocks()

    // Re-apply default mock behaviors
    vi.mocked(calculateCapacityGained).mockReturnValue(0.5)
    vi.mocked(getSoilCapacity).mockReturnValue(10)
    vi.mocked(appendEvent).mockImplementation(() => {})

    ctx = createMockCtx()
    callbacks = createMockCallbacks()
  })

  // =========================================================================
  // openHarvestDialog
  // =========================================================================

  describe('openHarvestDialog', () => {
    it('sets dialog title to sprout title', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout({ title: 'Read more books' }))

      expect(ctx.elements.harvestDialogTitle.textContent).toBe('Read more books')
    })

    it('uses "Untitled Sprout" when title is empty', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout({ title: '' }))

      expect(ctx.elements.harvestDialogTitle.textContent).toBe('Untitled Sprout')
    })

    it('sets meta text with twig label and season', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout({ twigLabel: 'Health', season: '6m' }))

      expect(ctx.elements.harvestDialogMeta.textContent).toBe('Health · 6m')
    })

    it('resets slider to 3', () => {
      const api = initHarvestDialog(ctx, callbacks)

      // Set slider to a different value first
      ctx.elements.harvestDialogSlider.value = '5'

      api.openHarvestDialog(makeSprout())

      expect(ctx.elements.harvestDialogSlider.value).toBe('3')
    })

    it('clears reflection textarea', () => {
      const api = initHarvestDialog(ctx, callbacks)

      // Set reflection to a value first
      ctx.elements.harvestDialogReflection.value = 'leftover text'

      api.openHarvestDialog(makeSprout())

      expect(ctx.elements.harvestDialogReflection.value).toBe('')
    })

    it('sets bloom hints for wither/budding/flourish', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(
        makeSprout({
          bloomWither: 'gave up early',
          bloomBudding: 'steady progress',
          bloomFlourish: 'exceeded expectations',
        }),
      )

      const hints = ctx.elements.harvestDialogBloomHints
      const hintTexts = Array.from(hints).map((h) => h.textContent)

      expect(hintTexts).toEqual([
        'withered: gave up early',
        'budded: steady progress',
        'flourished: exceeded expectations',
      ])
    })

    it('clears bloom hints when none provided', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout())

      const hints = ctx.elements.harvestDialogBloomHints
      const hintTexts = Array.from(hints).map((h) => h.textContent)

      expect(hintTexts).toEqual(['', '', ''])
    })

    it('removes hidden class to show dialog', () => {
      const api = initHarvestDialog(ctx, callbacks)

      expect(ctx.elements.harvestDialog.classList.contains('hidden')).toBe(true)

      api.openHarvestDialog(makeSprout())

      expect(ctx.elements.harvestDialog.classList.contains('hidden')).toBe(false)
    })

    it('calls trapFocus on the inner dialog box', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout())

      expect(trapFocus).toHaveBeenCalledOnce()
    })

    it('updates result display with default result of 3', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout())

      // getResultEmoji should have been called with 3
      expect(getResultEmoji).toHaveBeenCalledWith(3)
      expect(ctx.elements.harvestDialogResultEmoji.textContent).toBe('🌿')
    })

    it('updates save button with soil and capacity info', () => {
      vi.mocked(calculateCapacityGained).mockReturnValue(0.75)
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout({ soilCost: 3.0 }))

      expect(ctx.elements.harvestDialogSave.innerHTML).toContain('+3.0')
      expect(ctx.elements.harvestDialogSave.innerHTML).toContain('+0.75 cap')
    })
  })

  // =========================================================================
  // closeHarvestDialog
  // =========================================================================

  describe('closeHarvestDialog', () => {
    it('adds hidden class', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout())

      expect(ctx.elements.harvestDialog.classList.contains('hidden')).toBe(false)

      api.closeHarvestDialog()

      expect(ctx.elements.harvestDialog.classList.contains('hidden')).toBe(true)
    })

    it('clears reflection textarea', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout())

      ctx.elements.harvestDialogReflection.value = 'some reflection'

      api.closeHarvestDialog()

      expect(ctx.elements.harvestDialogReflection.value).toBe('')
    })

    it('releases focus trap', () => {
      const releaseFn = vi.fn()
      vi.mocked(trapFocus).mockReturnValue(releaseFn)

      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout())
      api.closeHarvestDialog()

      expect(releaseFn).toHaveBeenCalledOnce()
    })
  })

  // =========================================================================
  // isOpen
  // =========================================================================

  describe('isOpen', () => {
    it('returns false initially (dialog has hidden class)', () => {
      const api = initHarvestDialog(ctx, callbacks)

      expect(api.isOpen()).toBe(false)
    })

    it('returns true after opening', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout())

      expect(api.isOpen()).toBe(true)
    })

    it('returns false after closing a previously open dialog', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout())

      expect(api.isOpen()).toBe(true)

      api.closeHarvestDialog()

      expect(api.isOpen()).toBe(false)
    })
  })

  // =========================================================================
  // saveHarvest (via save button click)
  // =========================================================================

  describe('saveHarvest', () => {
    it('appends sprout_harvested event with correct fields', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout({ id: 'sprout-xyz' }))

      // Set slider and reflection
      ctx.elements.harvestDialogSlider.value = '4'
      ctx.elements.harvestDialogReflection.value = 'Great progress made'

      ctx.elements.harvestDialogSave.click()

      expect(appendEvent).toHaveBeenCalledOnce()
      const eventArg = vi.mocked(appendEvent).mock.calls[0][0]
      expect(eventArg).toMatchObject({
        type: 'sprout_harvested',
        sproutId: 'sprout-xyz',
        result: 4,
        reflection: 'Great progress made',
      })
      expect(eventArg).toHaveProperty('timestamp')
      expect(eventArg).toHaveProperty('capacityGained')
    })

    it('calls calculateCapacityGained with season, environment, result, and current capacity', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout({ season: '1y', environment: 'barren' }))

      vi.mocked(calculateCapacityGained).mockClear()
      ctx.elements.harvestDialogSlider.value = '5'
      ctx.elements.harvestDialogSave.click()

      expect(calculateCapacityGained).toHaveBeenCalledWith('1y', 'barren', 5, 10)
    })

    it('calls onSoilMeterChange callback', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout())

      ctx.elements.harvestDialogSave.click()

      expect(callbacks.onSoilMeterChange).toHaveBeenCalledOnce()
    })

    it('calls onHarvestComplete callback', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout())

      ctx.elements.harvestDialogSave.click()

      expect(callbacks.onHarvestComplete).toHaveBeenCalledOnce()
    })

    it('closes dialog after save', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout())

      ctx.elements.harvestDialogSave.click()

      expect(api.isOpen()).toBe(false)
    })

    it('converts empty reflection to undefined', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout())

      ctx.elements.harvestDialogReflection.value = ''
      ctx.elements.harvestDialogSave.click()

      const eventArg = vi.mocked(appendEvent).mock.calls[0][0]
      expect(eventArg.reflection).toBeUndefined()
    })

    it('converts whitespace-only reflection to undefined', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout())

      ctx.elements.harvestDialogReflection.value = '   \n  '
      ctx.elements.harvestDialogSave.click()

      const eventArg = vi.mocked(appendEvent).mock.calls[0][0]
      expect(eventArg.reflection).toBeUndefined()
    })

    it('does nothing when no sprout is set', () => {
      // Init without opening → currentHarvestSprout is null
      initHarvestDialog(ctx, callbacks)

      ctx.elements.harvestDialogSave.click()

      expect(appendEvent).not.toHaveBeenCalled()
      expect(callbacks.onSoilMeterChange).not.toHaveBeenCalled()
      expect(callbacks.onHarvestComplete).not.toHaveBeenCalled()
    })

    it('does nothing on second save (sprout cleared after first)', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout())

      ctx.elements.harvestDialogSave.click()
      expect(appendEvent).toHaveBeenCalledOnce()

      // Second click — sprout was cleared by closeHarvestDialog
      ctx.elements.harvestDialogSave.click()
      expect(appendEvent).toHaveBeenCalledOnce() // still 1
    })
  })

  // =========================================================================
  // updateResultDisplay (via slider input event)
  // =========================================================================

  describe('slider input (updateResultDisplay)', () => {
    it('updates emoji when slider changes', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout())

      ctx.elements.harvestDialogSlider.value = '5'
      ctx.elements.harvestDialogSlider.dispatchEvent(new Event('input'))

      expect(getResultEmoji).toHaveBeenCalledWith(5)
      expect(ctx.elements.harvestDialogResultEmoji.textContent).toBe('🌺')
    })

    it('updates save button text with recalculated capacity', () => {
      vi.mocked(calculateCapacityGained).mockReturnValue(1.23)
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout({ soilCost: 2.0 }))

      vi.mocked(calculateCapacityGained).mockReturnValue(0.88)
      ctx.elements.harvestDialogSlider.value = '1'
      ctx.elements.harvestDialogSlider.dispatchEvent(new Event('input'))

      expect(ctx.elements.harvestDialogSave.innerHTML).toContain('+2.0')
      expect(ctx.elements.harvestDialogSave.innerHTML).toContain('+0.88 cap')
    })
  })

  // =========================================================================
  // Close triggers
  // =========================================================================

  describe('close triggers', () => {
    it('close button closes dialog', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout())

      expect(api.isOpen()).toBe(true)

      ctx.elements.harvestDialogClose.click()

      expect(api.isOpen()).toBe(false)
    })

    it('cancel button closes dialog', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout())

      expect(api.isOpen()).toBe(true)

      ctx.elements.harvestDialogCancel.click()

      expect(api.isOpen()).toBe(false)
    })

    it('backdrop click closes dialog', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout())

      expect(api.isOpen()).toBe(true)

      // Click on the backdrop (target === harvestDialog itself)
      const clickEvent = new MouseEvent('click', { bubbles: true })
      Object.defineProperty(clickEvent, 'target', {
        value: ctx.elements.harvestDialog,
      })
      ctx.elements.harvestDialog.dispatchEvent(clickEvent)

      expect(api.isOpen()).toBe(false)
    })

    it('clicking inside dialog does not close it', () => {
      const api = initHarvestDialog(ctx, callbacks)
      api.openHarvestDialog(makeSprout())

      expect(api.isOpen()).toBe(true)

      // Click on a child element (target !== harvestDialog)
      const child = ctx.elements.harvestDialogSlider
      const clickEvent = new MouseEvent('click', { bubbles: true })
      Object.defineProperty(clickEvent, 'target', { value: child })
      ctx.elements.harvestDialog.dispatchEvent(clickEvent)

      expect(api.isOpen()).toBe(true)
    })
  })
})
