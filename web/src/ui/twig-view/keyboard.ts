type KeyboardCallbacks = {
  onClose: () => void
  onNavigate?: (direction: 'prev' | 'next') => HTMLButtonElement | null
}

/**
 * Sets up the document-level keydown handler for the twig view.
 * Handles Escape (close) and Cmd+Arrow (navigate between twigs).
 */
export function setupKeyboard(
  container: HTMLDivElement,
  callbacks: KeyboardCallbacks,
  open: (twigNode: HTMLButtonElement) => void,
  close: () => void,
): void {
  function handleKeydown(e: KeyboardEvent): void {
    if (container.classList.contains('hidden')) return

    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopImmediatePropagation()
      close()
      callbacks.onClose()
      return
    }

    // Don't intercept Cmd+Arrow when focus is in a text field (cursor movement)
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

    if (e.key === 'ArrowLeft' && e.metaKey && callbacks.onNavigate) {
      e.preventDefault()
      const prevTwig = callbacks.onNavigate('prev')
      if (prevTwig) open(prevTwig)
      return
    }

    if (e.key === 'ArrowRight' && e.metaKey && callbacks.onNavigate) {
      e.preventDefault()
      const nextTwig = callbacks.onNavigate('next')
      if (nextTwig) open(nextTwig)
      return
    }
  }
  document.addEventListener('keydown', handleKeydown)
}
