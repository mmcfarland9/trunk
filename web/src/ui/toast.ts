let container: HTMLDivElement | null = null
let dismissId = 0

function getContainer(): HTMLDivElement {
  if (container) return container
  container = document.createElement('div')
  container.className = 'toast-container'
  document.body.appendChild(container)
  return container
}

export function showToast(message: string, durationMs = 2500): void {
  const el = getContainer()

  // Clear any existing toast
  if (dismissId) {
    window.clearTimeout(dismissId)
    dismissId = 0
  }
  el.textContent = message
  el.classList.remove('is-hidden')
  el.classList.add('is-visible')

  dismissId = window.setTimeout(() => {
    el.classList.remove('is-visible')
    el.classList.add('is-hidden')
    dismissId = 0
  }, durationMs)
}
