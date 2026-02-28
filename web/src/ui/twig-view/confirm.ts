import type { FormState } from './sprout-form'

type ConfirmElements = {
  confirmDialog: HTMLDivElement
  confirmMessage: HTMLParagraphElement
  confirmCancelBtn: HTMLButtonElement
  confirmConfirmBtn: HTMLButtonElement
}

/**
 * Sets up the confirm dialog pattern.
 * Wires cancel/confirm button listeners and returns the showConfirm function.
 */
export function setupConfirmDialog(
  elements: ConfirmElements,
  state: FormState,
): (message: string, confirmLabel?: string) => Promise<boolean> {
  function showConfirm(message: string, confirmLabel: string = 'Uproot'): Promise<boolean> {
    elements.confirmMessage.textContent = message
    elements.confirmConfirmBtn.textContent = confirmLabel
    elements.confirmDialog.classList.remove('hidden')
    elements.confirmConfirmBtn.focus()
    return new Promise((resolve) => {
      state.confirmResolve = resolve
    })
  }

  function hideConfirm(result: boolean): void {
    elements.confirmDialog.classList.add('hidden')
    if (state.confirmResolve) {
      state.confirmResolve(result)
      state.confirmResolve = null
    }
  }

  elements.confirmCancelBtn.addEventListener('click', () => hideConfirm(false))
  elements.confirmConfirmBtn.addEventListener('click', () => hideConfirm(true))

  return showConfirm
}
