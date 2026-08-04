/**
 * Tests for the post-harvest "Continue this leaf?" prompt
 * (features/continue-leaf-prompt.ts) and its wiring into the harvest dialog.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

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
  getResultEmoji: vi.fn(() => '🌿'),
}))

vi.mock('../ui/dom-builder/build-dialogs', () => ({
  trapFocus: vi.fn(() => vi.fn()),
}))

import { resetContinueLeafPrompt, showContinueLeafPrompt } from '../features/continue-leaf-prompt'
import { type HarvestSproutInput, initHarvestDialog } from '../features/harvest-dialog'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function promptEl(): HTMLDivElement | null {
  return document.querySelector<HTMLDivElement>('.continue-leaf-prompt')
}

function promptIsOpen(): boolean {
  const el = promptEl()
  return el !== null && !el.classList.contains('hidden')
}

function clickPrompt(which: 'confirm' | 'cancel'): void {
  document.querySelector<HTMLButtonElement>(`.continue-leaf-prompt-${which}`)?.click()
}

function makeSprout(overrides: Partial<HarvestSproutInput> = {}): HarvestSproutInput {
  return {
    id: 'sprout-abc',
    title: 'Run a 5k',
    twigId: 'branch-2-twig-branch-2-twig-4',
    twigLabel: 'Body',
    season: '3m',
    environment: 'firm',
    soilCost: 2.5,
    ...overrides,
  }
}

function createMockCtx() {
  const harvestDialog = document.createElement('div')
  harvestDialog.classList.add('hidden')
  const dialogBox = document.createElement('div')
  dialogBox.setAttribute('role', 'dialog')
  harvestDialog.appendChild(dialogBox)

  const bloomContainer = document.createElement('div')
  for (const level of ['1', '3', '5']) {
    const hint = document.createElement('p')
    hint.dataset.level = level
    hint.classList.add('hint')
    bloomContainer.appendChild(hint)
  }

  const slider = document.createElement('input')
  slider.type = 'range'
  slider.min = '1'
  slider.max = '5'
  slider.value = '3'

  return {
    elements: {
      harvestDialog,
      harvestDialogTitle: document.createElement('p'),
      harvestDialogMeta: document.createElement('p'),
      harvestDialogSlider: slider,
      harvestDialogBloomHints: bloomContainer.querySelectorAll('.hint'),
      harvestDialogReflection: document.createElement('textarea'),
      harvestDialogResultEmoji: document.createElement('span'),
      harvestDialogSave: document.createElement('button'),
      harvestDialogClose: document.createElement('button'),
      harvestDialogCancel: document.createElement('button'),
    },
  } as unknown as Parameters<typeof initHarvestDialog>[0]
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('showContinueLeafPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContinueLeafPrompt()
  })

  it('renders the prompt with the two expected actions', async () => {
    const answer = showContinueLeafPrompt()

    expect(promptIsOpen()).toBe(true)
    expect(document.querySelector('.continue-leaf-prompt-message')?.textContent).toBe(
      'Continue this leaf?',
    )
    expect(document.querySelector('.continue-leaf-prompt-cancel')?.textContent).toBe('Not now')
    expect(document.querySelector('.continue-leaf-prompt-confirm')?.textContent).toBe('Continue')

    clickPrompt('cancel')
    await answer
  })

  it('resolves true when "Continue" is clicked', async () => {
    const answer = showContinueLeafPrompt()
    clickPrompt('confirm')

    await expect(answer).resolves.toBe(true)
    expect(promptIsOpen()).toBe(false)
  })

  it('resolves false when "Not now" is clicked', async () => {
    const answer = showContinueLeafPrompt()
    clickPrompt('cancel')

    await expect(answer).resolves.toBe(false)
    expect(promptIsOpen()).toBe(false)
  })

  it('resolves false on Escape', async () => {
    const answer = showContinueLeafPrompt()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    await expect(answer).resolves.toBe(false)
  })

  it('reuses a single overlay element across invocations', async () => {
    const first = showContinueLeafPrompt()
    clickPrompt('cancel')
    await first

    const second = showContinueLeafPrompt()
    expect(document.querySelectorAll('.continue-leaf-prompt')).toHaveLength(1)

    clickPrompt('cancel')
    await second
  })
})

describe('harvest dialog → continue leaf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContinueLeafPrompt()
  })

  it('does not prompt when the harvested sprout has no leaf', () => {
    const ctx = createMockCtx()
    const onContinueLeaf = vi.fn()
    const api = initHarvestDialog(ctx, {
      onSoilMeterChange: vi.fn(),
      onHarvestComplete: vi.fn(),
      onContinueLeaf,
    })

    api.openHarvestDialog(makeSprout({ leafId: undefined }))
    ctx.elements.harvestDialogSave.click()

    expect(promptIsOpen()).toBe(false)
    expect(onContinueLeaf).not.toHaveBeenCalled()
  })

  it('prompts after harvesting a sprout that belongs to a leaf', () => {
    const ctx = createMockCtx()
    const api = initHarvestDialog(ctx, {
      onSoilMeterChange: vi.fn(),
      onHarvestComplete: vi.fn(),
      onContinueLeaf: vi.fn(),
    })

    api.openHarvestDialog(makeSprout({ leafId: 'leaf-running' }))
    ctx.elements.harvestDialogSave.click()

    expect(promptIsOpen()).toBe(true)
    // The harvest dialog itself is already closed behind the prompt.
    expect(api.isOpen()).toBe(false)
  })

  it('refreshes stats/meters before the prompt appears', () => {
    const ctx = createMockCtx()
    const onHarvestComplete = vi.fn(() => {
      expect(promptIsOpen()).toBe(false)
    })
    const api = initHarvestDialog(ctx, {
      onSoilMeterChange: vi.fn(),
      onHarvestComplete,
      onContinueLeaf: vi.fn(),
    })

    api.openHarvestDialog(makeSprout({ leafId: 'leaf-running' }))
    ctx.elements.harvestDialogSave.click()

    expect(onHarvestComplete).toHaveBeenCalledOnce()
  })

  it('invokes onContinueLeaf with leafId and twigId when confirmed', async () => {
    const ctx = createMockCtx()
    const onContinueLeaf = vi.fn()
    const api = initHarvestDialog(ctx, {
      onSoilMeterChange: vi.fn(),
      onHarvestComplete: vi.fn(),
      onContinueLeaf,
    })

    api.openHarvestDialog(
      makeSprout({ leafId: 'leaf-running', twigId: 'branch-2-twig-branch-2-twig-4' }),
    )
    ctx.elements.harvestDialogSave.click()
    clickPrompt('confirm')
    await Promise.resolve()

    expect(onContinueLeaf).toHaveBeenCalledWith('leaf-running', 'branch-2-twig-branch-2-twig-4')
  })

  it('does not invoke onContinueLeaf when declined', async () => {
    const ctx = createMockCtx()
    const onContinueLeaf = vi.fn()
    const api = initHarvestDialog(ctx, {
      onSoilMeterChange: vi.fn(),
      onHarvestComplete: vi.fn(),
      onContinueLeaf,
    })

    api.openHarvestDialog(makeSprout({ leafId: 'leaf-running' }))
    ctx.elements.harvestDialogSave.click()
    clickPrompt('cancel')
    await Promise.resolve()

    expect(onContinueLeaf).not.toHaveBeenCalled()
  })

  it('does not prompt when no onContinueLeaf callback is provided', () => {
    const ctx = createMockCtx()
    const api = initHarvestDialog(ctx, {
      onSoilMeterChange: vi.fn(),
      onHarvestComplete: vi.fn(),
    })

    api.openHarvestDialog(makeSprout({ leafId: 'leaf-running' }))
    ctx.elements.harvestDialogSave.click()

    expect(promptIsOpen()).toBe(false)
  })
})
