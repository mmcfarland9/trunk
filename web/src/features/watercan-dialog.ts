import type { AppElements } from '../types'
import { escapeHtml } from '../utils/escape-html'
import {
  getWaterAvailable,
  getWaterCapacity,
  getNextWaterReset,
  formatResetTime,
  getPresetLabel,
} from '../state'
import { getState, getAllWaterEntries } from '../events'
import { formatDateWithYear } from '../utils/date-formatting'
import { trapFocus } from '../ui/dom-builder/build-dialogs'

type WaterCanElements = Pick<
  AppElements,
  | 'waterCanDialog'
  | 'waterCanDialogClose'
  | 'waterCanStatusText'
  | 'waterCanStatusReset'
  | 'waterCanEmptyLog'
  | 'waterCanLogEntries'
>

function populateWaterCan(elements: WaterCanElements): void {
  const state = getState()
  const logEntries = getAllWaterEntries(state, getPresetLabel)
  const available = getWaterAvailable()
  const capacity = getWaterCapacity()

  if (available > 0) {
    elements.waterCanStatusText.textContent = `${available}/${capacity} remaining`
    elements.waterCanStatusReset.classList.add('hidden')
  } else {
    elements.waterCanStatusText.textContent = 'Empty'
    elements.waterCanStatusReset.textContent = formatResetTime(getNextWaterReset())
    elements.waterCanStatusReset.classList.remove('hidden')
  }

  const hasLog = logEntries.length > 0
  elements.waterCanEmptyLog.style.display = hasLog ? 'none' : 'block'
  elements.waterCanLogEntries.style.display = hasLog ? 'flex' : 'none'

  if (hasLog) {
    elements.waterCanLogEntries.innerHTML = logEntries
      .map((entry) => {
        const timestamp = formatDateWithYear(entry.timestamp)
        const promptHtml = entry.prompt
          ? `<p class="water-can-log-entry-prompt">"${escapeHtml(entry.prompt)}"</p>`
          : ''

        return `
        <div class="water-can-log-entry">
          <div class="water-can-log-entry-header">
            <span class="water-can-log-entry-context">${escapeHtml(entry.sproutTitle)} · ${escapeHtml(entry.twigLabel)}</span>
            <span class="water-can-log-entry-timestamp">${timestamp}</span>
          </div>
          ${promptHtml}
          <p class="water-can-log-entry-content">${escapeHtml(entry.content)}</p>
        </div>
      `
      })
      .join('')
  }
}

export function initWaterCanDialog(elements: WaterCanElements & Pick<AppElements, 'waterMeter'>): {
  isOpen: () => boolean
  close: () => void
} {
  let releaseFocusTrap: (() => void) | null = null

  const openDialog = () => {
    populateWaterCan(elements)
    elements.waterCanDialog.classList.remove('hidden')
    const dialogBox = elements.waterCanDialog.querySelector<HTMLElement>('[role="dialog"]')
    if (dialogBox) releaseFocusTrap = trapFocus(dialogBox)
  }

  const closeDialog = () => {
    releaseFocusTrap?.()
    releaseFocusTrap = null
    elements.waterCanDialog.classList.add('hidden')
  }

  elements.waterMeter.addEventListener('click', openDialog)
  elements.waterCanDialogClose.addEventListener('click', closeDialog)
  elements.waterCanDialog.addEventListener('click', (e) => {
    if (e.target === elements.waterCanDialog) closeDialog()
  })

  return {
    isOpen: () => !elements.waterCanDialog.classList.contains('hidden'),
    close: closeDialog,
  }
}
