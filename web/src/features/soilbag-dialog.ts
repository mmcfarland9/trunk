import type { AppElements } from '../types'
import { escapeHtml } from '../utils/escape-html'
import { getEvents, deriveSoilLog } from '../events'
import { formatDateShort } from '../utils/date-formatting'
import { trapFocus } from '../ui/dom-builder/build-dialogs'

type SoilBagElements = Pick<
  AppElements,
  'soilBagDialog' | 'soilBagDialogClose' | 'soilBagDialogEmpty' | 'soilBagDialogEntries'
>

function populateSoilBag(elements: SoilBagElements): void {
  const entries = [...deriveSoilLog(getEvents())].reverse()
  const isEmpty = entries.length === 0

  elements.soilBagDialogEmpty.style.display = isEmpty ? 'block' : 'none'
  elements.soilBagDialogEntries.style.display = isEmpty ? 'none' : 'flex'

  if (isEmpty) return

  elements.soilBagDialogEntries.innerHTML = entries
    .map((entry) => {
      const amountClass = entry.amount > 0 ? 'is-gain' : 'is-loss'
      const amountText = entry.amount > 0 ? `+${entry.amount.toFixed(2)}` : entry.amount.toFixed(2)
      const contextHtml = entry.context
        ? `<span class="soil-bag-entry-context">${escapeHtml(entry.context)}</span>`
        : ''
      const timestamp = formatDateShort(entry.timestamp)

      return `
      <div class="soil-bag-entry">
        <div class="soil-bag-entry-info">
          <span class="soil-bag-entry-reason">${escapeHtml(entry.reason)}</span>
          ${contextHtml}
        </div>
        <div>
          <span class="soil-bag-entry-amount ${amountClass}">${amountText}</span>
          <span class="soil-bag-entry-timestamp">${timestamp}</span>
        </div>
      </div>
    `
    })
    .join('')
}

export function initSoilBagDialog(elements: SoilBagElements & Pick<AppElements, 'soilMeter'>): {
  isOpen: () => boolean
  close: () => void
} {
  let releaseFocusTrap: (() => void) | null = null

  const openDialog = () => {
    populateSoilBag(elements)
    elements.soilBagDialog.classList.remove('hidden')
    const dialogBox = elements.soilBagDialog.querySelector<HTMLElement>('[role="dialog"]')
    if (dialogBox) releaseFocusTrap = trapFocus(dialogBox)
  }

  const closeDialog = () => {
    releaseFocusTrap?.()
    releaseFocusTrap = null
    elements.soilBagDialog.classList.add('hidden')
  }

  elements.soilMeter.addEventListener('click', openDialog)
  elements.soilBagDialogClose.addEventListener('click', closeDialog)
  elements.soilBagDialog.addEventListener('click', (e) => {
    if (e.target === elements.soilBagDialog) closeDialog()
  })

  return {
    isOpen: () => !elements.soilBagDialog.classList.contains('hidden'),
    close: closeDialog,
  }
}
