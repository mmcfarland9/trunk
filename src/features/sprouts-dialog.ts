import type { AppContext } from '../types'

export type SproutsDialogCallbacks = {
  onUpdateStats: () => void
}

// Note: Sprouts dialog functionality removed - the "Show all Sprouts" button was removed
// Keeping this stub in case we want to re-add the feature later via a different trigger
export function initSproutsDialog(
  ctx: AppContext,
  _callbacks: SproutsDialogCallbacks
): void {
  const { sproutsDialog, sproutsDialogClose } = ctx.elements

  sproutsDialogClose.addEventListener('click', () => {
    sproutsDialog.classList.add('hidden')
  })

  // Close on backdrop click
  sproutsDialog.addEventListener('click', (e) => {
    if (e.target === sproutsDialog) {
      sproutsDialog.classList.add('hidden')
    }
  })

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sproutsDialog.classList.contains('hidden')) {
      e.preventDefault()
      e.stopImmediatePropagation()
      sproutsDialog.classList.add('hidden')
    }
  }, true)
}
