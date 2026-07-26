import { deriveSoilLog, getEvents } from '../events'
import type { AppElements } from '../types'
import { trapFocus } from '../ui/dom-builder/build-dialogs'
import { formatDateShort } from '../utils/date-formatting'
import { escapeHtml } from '../utils/escape-html'

type SoilBagElements = Pick<
  AppElements,
  | 'soilBagDialog'
  | 'soilBagDialogClose'
  | 'soilBagDialogEmpty'
  | 'soilBagDialogEntries'
  | 'soilBagStatusText'
  | 'soilBagStatusFill'
  | 'soilBagStatusMeta'
  | 'soilBagReadyEmpty'
  | 'soilBagReadyList'
>

/** A sprout past its season, whose soil can be reclaimed by harvesting. */
export type HarvestableSprout = {
  id: string
  title: string
  twigLabel: string
  soilCost: number
}

type SoilBagCallbacks = {
  /** Current soil budget, for the status summary. */
  getSoilStatus: () => { available: number; capacity: number; committed: number; growing: number }
  /** Active sprouts whose season has elapsed, soonest-planted first. */
  getHarvestableSprouts: () => HarvestableSprout[]
  /** Open the harvest dialog for one sprout. */
  onHarvestSprout: (sproutId: string) => void
}

function populateStatus(elements: SoilBagElements, callbacks: SoilBagCallbacks): void {
  const { available, capacity, committed, growing } = callbacks.getSoilStatus()

  elements.soilBagStatusText.textContent = `${available.toFixed(2)}/${capacity.toFixed(2)} available`

  const percent = capacity > 0 ? Math.min(100, Math.max(0, (available / capacity) * 100)) : 0
  elements.soilBagStatusFill.style.width = `${percent}%`

  if (growing > 0) {
    const plural = growing === 1 ? 'sprout' : 'sprouts'
    elements.soilBagStatusMeta.textContent = `${committed.toFixed(2)} committed to ${growing} growing ${plural}`
  } else {
    elements.soilBagStatusMeta.textContent = 'No soil committed — nothing growing yet.'
  }
}

/**
 * Render harvest-ready sprouts. Harvesting is how soil (and capacity) comes
 * back, so it belongs in the soil bag — previously it was only reachable via
 * the `H` shortcut or the sidebar, never from the soil meter itself.
 */
function populateReadyList(
  elements: SoilBagElements,
  callbacks: SoilBagCallbacks,
  close: () => void,
): void {
  const { soilBagReadyEmpty, soilBagReadyList } = elements
  const ready = callbacks.getHarvestableSprouts()

  soilBagReadyList.innerHTML = ''

  if (ready.length === 0) {
    soilBagReadyEmpty.textContent = 'Nothing ready to harvest yet.'
    soilBagReadyEmpty.style.display = 'block'
    soilBagReadyList.style.display = 'none'
    return
  }

  soilBagReadyEmpty.style.display = 'none'
  soilBagReadyList.style.display = 'flex'

  for (const sprout of ready) {
    const row = document.createElement('div')
    row.className = 'soil-bag-ready-row'
    row.dataset.sproutId = sprout.id

    const info = document.createElement('div')
    info.className = 'soil-bag-ready-info'

    const name = document.createElement('span')
    name.className = 'soil-bag-ready-name'
    name.textContent = sprout.title

    const meta = document.createElement('span')
    meta.className = 'soil-bag-ready-meta'
    meta.textContent = sprout.twigLabel
      ? `${sprout.twigLabel} · returns +${sprout.soilCost.toFixed(2)} soil`
      : `returns +${sprout.soilCost.toFixed(2)} soil`

    info.append(name, meta)

    const harvestBtn = document.createElement('button')
    harvestBtn.type = 'button'
    harvestBtn.className = 'action-btn action-btn-progress soil-bag-ready-harvest'
    harvestBtn.textContent = 'harvest'
    harvestBtn.setAttribute('aria-label', `Harvest ${sprout.title}`)
    harvestBtn.addEventListener('click', () => {
      close()
      callbacks.onHarvestSprout(sprout.id)
    })

    row.append(info, harvestBtn)
    soilBagReadyList.append(row)
  }
}

function populateSoilBag(
  elements: SoilBagElements,
  callbacks: SoilBagCallbacks,
  close: () => void,
): void {
  populateStatus(elements, callbacks)
  populateReadyList(elements, callbacks, close)

  const entries = [...deriveSoilLog(getEvents())].reverse()
  const isEmpty = entries.length === 0

  elements.soilBagDialogEmpty.style.display = isEmpty ? 'block' : 'none'
  elements.soilBagDialogEntries.style.display = isEmpty ? 'none' : 'flex'

  if (isEmpty) {
    elements.soilBagDialogEntries.innerHTML = ''
    return
  }

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

export function initSoilBagDialog(
  elements: SoilBagElements & Pick<AppElements, 'soilMeter'>,
  callbacks: SoilBagCallbacks,
): {
  isOpen: () => boolean
  close: () => void
  refresh: () => void
} {
  let releaseFocusTrap: (() => void) | null = null

  const openDialog = () => {
    populateSoilBag(elements, callbacks, closeDialog)
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
    refresh: () => populateSoilBag(elements, callbacks, closeDialog),
  }
}
