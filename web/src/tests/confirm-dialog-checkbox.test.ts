/**
 * Tests for the confirm dialog's opt-in checkbox (ui/twig-view/confirm.ts).
 *
 * Used by the uproot flow to offer "keep the idea as a seedling". The checkbox
 * is per-call and must never carry state between confirmations.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../ui/dom-builder/build-dialogs', () => ({
  trapFocus: vi.fn(() => vi.fn()),
}))

import { setupConfirmDialog } from '../ui/twig-view/confirm'

function createElements() {
  const confirmDialog = document.createElement('div')
  confirmDialog.classList.add('hidden')
  const box = document.createElement('div')
  box.setAttribute('role', 'alertdialog')
  confirmDialog.appendChild(box)

  const confirmMessage = document.createElement('p')
  const confirmCancelBtn = document.createElement('button')
  const confirmConfirmBtn = document.createElement('button')
  const confirmCheckbox = document.createElement('label')
  confirmCheckbox.classList.add('hidden')
  const confirmCheckboxInput = document.createElement('input')
  confirmCheckboxInput.type = 'checkbox'
  const confirmCheckboxLabel = document.createElement('span')

  return {
    confirmDialog,
    confirmMessage,
    confirmCancelBtn,
    confirmConfirmBtn,
    confirmCheckbox,
    confirmCheckboxInput,
    confirmCheckboxLabel,
  }
}

function createState() {
  return { confirmResolve: null } as unknown as Parameters<typeof setupConfirmDialog>[1]
}

describe('confirm dialog checkbox', () => {
  let elements: ReturnType<typeof createElements>

  beforeEach(() => {
    vi.clearAllMocks()
    elements = createElements()
  })

  it('stays hidden when no checkboxLabel is given', async () => {
    const show = setupConfirmDialog(elements, createState())
    const p = show('Sure?')

    expect(elements.confirmCheckbox.classList.contains('hidden')).toBe(true)

    elements.confirmConfirmBtn.click()
    await expect(p).resolves.toEqual({ confirmed: true, checked: false })
  })

  it('shows with its label when checkboxLabel is given', () => {
    const show = setupConfirmDialog(elements, createState())
    void show('Sure?', { checkboxLabel: 'Keep the idea as a seedling' })

    expect(elements.confirmCheckbox.classList.contains('hidden')).toBe(false)
    expect(elements.confirmCheckboxLabel.textContent).toBe('Keep the idea as a seedling')
  })

  it('reports checked:true when ticked and confirmed', async () => {
    const show = setupConfirmDialog(elements, createState())
    const p = show('Sure?', { checkboxLabel: 'Keep it' })

    elements.confirmCheckboxInput.checked = true
    elements.confirmConfirmBtn.click()

    await expect(p).resolves.toEqual({ confirmed: true, checked: true })
  })

  it('reports checked:false when cancelled, even if ticked', async () => {
    const show = setupConfirmDialog(elements, createState())
    const p = show('Sure?', { checkboxLabel: 'Keep it' })

    elements.confirmCheckboxInput.checked = true
    elements.confirmCancelBtn.click()

    // Cancelling must never look like an opt-in.
    await expect(p).resolves.toEqual({ confirmed: false, checked: false })
  })

  it('resets the checkbox between confirmations', async () => {
    const show = setupConfirmDialog(elements, createState())

    const first = show('Sure?', { checkboxLabel: 'Keep it' })
    elements.confirmCheckboxInput.checked = true
    elements.confirmConfirmBtn.click()
    await expect(first).resolves.toEqual({ confirmed: true, checked: true })

    const second = show('Sure again?', { checkboxLabel: 'Keep it' })
    expect(elements.confirmCheckboxInput.checked).toBe(false)
    elements.confirmConfirmBtn.click()
    await expect(second).resolves.toEqual({ confirmed: true, checked: false })
  })

  it('uses the provided confirm label, defaulting to Uproot', () => {
    const show = setupConfirmDialog(elements, createState())

    void show('Sure?')
    expect(elements.confirmConfirmBtn.textContent).toBe('Uproot')

    elements.confirmConfirmBtn.click()
    void show('Sure?', { confirmLabel: 'Delete' })
    expect(elements.confirmConfirmBtn.textContent).toBe('Delete')
  })
})
