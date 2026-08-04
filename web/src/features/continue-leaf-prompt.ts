/**
 * A small, self-contained "Continue this leaf?" prompt.
 *
 * Shown after a harvest so the gardener can immediately plant the next sprout
 * on the same leaf. Deliberately independent of the twig view's confirm dialog
 * (which lives inside the twig panel and is unavailable when a harvest is
 * triggered from the sidebar or the soil bag).
 */

import { trapFocus } from '../ui/dom-builder/build-dialogs'

type PromptRefs = {
  overlay: HTMLDivElement
  message: HTMLParagraphElement
  cancelBtn: HTMLButtonElement
  confirmBtn: HTMLButtonElement
}

let refs: PromptRefs | null = null
let resolveCurrent: ((confirmed: boolean) => void) | null = null
let releaseFocusTrap: (() => void) | null = null

function settle(confirmed: boolean): void {
  if (!refs) return
  releaseFocusTrap?.()
  releaseFocusTrap = null
  refs.overlay.classList.add('hidden')
  document.removeEventListener('keydown', handleKeydown, true)
  const resolve = resolveCurrent
  resolveCurrent = null
  resolve?.(confirmed)
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key !== 'Escape') return
  e.preventDefault()
  e.stopImmediatePropagation()
  settle(false)
}

function ensureRefs(): PromptRefs {
  if (refs) return refs

  const overlay = document.createElement('div')
  overlay.className = 'continue-leaf-prompt hidden'
  overlay.innerHTML = `
    <div class="continue-leaf-prompt-box" role="alertdialog" aria-modal="true" aria-describedby="continue-leaf-prompt-message">
      <p id="continue-leaf-prompt-message" class="continue-leaf-prompt-message"></p>
      <div class="continue-leaf-prompt-actions">
        <button type="button" class="action-btn action-btn-passive action-btn-neutral continue-leaf-prompt-cancel">Not now</button>
        <button type="button" class="action-btn action-btn-progress action-btn-twig continue-leaf-prompt-confirm">Continue</button>
      </div>
    </div>
  `
  document.body.append(overlay)

  refs = {
    overlay,
    message: overlay.querySelector<HTMLParagraphElement>('.continue-leaf-prompt-message')!,
    cancelBtn: overlay.querySelector<HTMLButtonElement>('.continue-leaf-prompt-cancel')!,
    confirmBtn: overlay.querySelector<HTMLButtonElement>('.continue-leaf-prompt-confirm')!,
  }

  refs.cancelBtn.addEventListener('click', () => settle(false))
  refs.confirmBtn.addEventListener('click', () => settle(true))
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) settle(false)
  })

  return refs
}

/**
 * Shows the prompt and resolves with the gardener's answer.
 * Re-showing while one is open resolves the previous prompt as declined.
 */
export function showContinueLeafPrompt(message = 'Continue this leaf?'): Promise<boolean> {
  if (resolveCurrent) settle(false)

  const current = ensureRefs()
  current.message.textContent = message
  current.overlay.classList.remove('hidden')

  const box = current.overlay.querySelector<HTMLElement>('[role="alertdialog"]')
  if (box) releaseFocusTrap = trapFocus(box)
  document.addEventListener('keydown', handleKeydown, true)

  return new Promise<boolean>((resolve) => {
    resolveCurrent = resolve
  })
}

/** Test helper: tears down the singleton so each test starts clean. */
export function resetContinueLeafPrompt(): void {
  settle(false)
  refs?.overlay.remove()
  refs = null
}
