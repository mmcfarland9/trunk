import { trapFocus } from '../dom-builder/build-dialogs'
import type { FormState } from './sprout-form'

type ConfirmElements = {
  confirmDialog: HTMLDivElement
  confirmMessage: HTMLParagraphElement
  confirmCancelBtn: HTMLButtonElement
  confirmConfirmBtn: HTMLButtonElement
  confirmCheckbox: HTMLLabelElement
  confirmCheckboxInput: HTMLInputElement
  confirmCheckboxLabel: HTMLSpanElement
}

export type ConfirmOptions = {
  confirmLabel?: string
  /** Renders an opt-in checkbox above the actions; its state comes back as `checked`. */
  checkboxLabel?: string
}

export type ConfirmResult = {
  confirmed: boolean
  checked: boolean
}

/**
 * Sets up the confirm dialog pattern.
 * Wires cancel/confirm button listeners and returns the showConfirm function.
 */
export function setupConfirmDialog(
  elements: ConfirmElements,
  state: FormState,
): (message: string, options?: ConfirmOptions) => Promise<ConfirmResult> {
  let releaseFocusTrap: (() => void) | null = null

  function showConfirm(message: string, options: ConfirmOptions = {}): Promise<ConfirmResult> {
    elements.confirmMessage.textContent = message
    elements.confirmConfirmBtn.textContent = options.confirmLabel ?? 'Uproot'

    // The checkbox is opt-in per call and always starts unchecked, so a prior
    // confirmation can never silently carry its choice into the next one.
    elements.confirmCheckboxInput.checked = false
    if (options.checkboxLabel) {
      elements.confirmCheckboxLabel.textContent = options.checkboxLabel
      elements.confirmCheckbox.classList.remove('hidden')
    } else {
      elements.confirmCheckbox.classList.add('hidden')
    }

    elements.confirmDialog.classList.remove('hidden')
    const dialogBox = elements.confirmDialog.querySelector<HTMLElement>('[role="alertdialog"]')
    if (dialogBox) releaseFocusTrap = trapFocus(dialogBox)
    return new Promise((resolve) => {
      state.confirmResolve = resolve
    })
  }

  function hideConfirm(confirmed: boolean): void {
    releaseFocusTrap?.()
    releaseFocusTrap = null
    elements.confirmDialog.classList.add('hidden')
    if (state.confirmResolve) {
      state.confirmResolve({
        confirmed,
        checked: confirmed && elements.confirmCheckboxInput.checked,
      })
      state.confirmResolve = null
    }
  }

  elements.confirmCancelBtn.addEventListener('click', () => hideConfirm(false))
  elements.confirmConfirmBtn.addEventListener('click', () => hideConfirm(true))

  return showConfirm
}
