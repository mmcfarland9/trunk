import type { AppElements } from '../types'
import { STATUS_DEFAULT_MESSAGE } from '../constants'
import { lastSavedAt, hasNodeData } from '../state'

let statusTimeoutId = 0

export function setStatus(
  elements: Pick<AppElements, 'statusMessage'>,
  message: string,
  tone: 'info' | 'success' | 'warning' | 'error'
): void {
  elements.statusMessage.textContent = message
  elements.statusMessage.dataset.tone = tone
}

export function flashStatus(
  elements: Pick<AppElements, 'statusMessage'>,
  message: string,
  tone: 'info' | 'success' | 'warning' | 'error' = 'info'
): void {
  setStatus(elements, message, tone)
  if (statusTimeoutId) {
    window.clearTimeout(statusTimeoutId)
  }
  statusTimeoutId = window.setTimeout(() => {
    setStatus(elements, STATUS_DEFAULT_MESSAGE, 'info')
  }, 4200)
}

export function updateStatusMeta(elements: Pick<AppElements, 'statusMeta'>, animate = false): void {
  if (lastSavedAt) {
    elements.statusMeta.textContent = `Last saved at ${formatTime(lastSavedAt)}.`
    if (animate) {
      // Trigger save pulse animation
      elements.statusMeta.classList.remove('is-saved')
      // Force reflow to restart animation
      void elements.statusMeta.offsetWidth
      elements.statusMeta.classList.add('is-saved')
    }
  } else if (hasNodeData()) {
    elements.statusMeta.textContent = 'Saved notes loaded from this browser.'
  } else {
    elements.statusMeta.textContent = 'No saved notes yet.'
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
