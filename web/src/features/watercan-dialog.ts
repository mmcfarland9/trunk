import { getAllWaterEntries, getState } from '../events'
import {
  formatResetTime,
  getNextWaterReset,
  getPresetLabel,
  getWaterAvailable,
  getWaterCapacity,
} from '../state'
import type { AppElements } from '../types'
import { trapFocus } from '../ui/dom-builder/build-dialogs'
import { formatDateWithYear } from '../utils/date-formatting'
import { escapeHtml } from '../utils/escape-html'

type WaterCanElements = Pick<
  AppElements,
  | 'waterCanDialog'
  | 'waterCanDialogClose'
  | 'waterCanStatusText'
  | 'waterCanStatusReset'
  | 'waterCanEmptyLog'
  | 'waterCanLogEntries'
  | 'waterCanReadySection'
  | 'waterCanReadyEmpty'
  | 'waterCanReadyList'
  | 'waterCanReadyActions'
  | 'waterCanWaterAll'
>

/** A sprout the user can water right now, as surfaced in the "Ready to Water" list. */
export type ReadySprout = {
  id: string
  title: string
  twigLabel: string
  lastWateredAt: string | null
}

type WaterCanCallbacks = {
  /** Active sprouts not yet watered today, least-recently-watered first. */
  getReadySprouts: () => ReadySprout[]
  /** Open the water dialog focused on one sprout. */
  onWaterSprout: (sproutId: string) => void
  /** Open the water dialog with the full daily set (iOS "water your sprouts" parity). */
  onWaterAll: () => void
  /** Whether the user has any active sprouts at all (distinguishes empty states). */
  hasActiveSprouts: () => boolean
}

function formatLastWatered(lastWateredAt: string | null): string {
  if (!lastWateredAt) return 'Never watered'

  const diffMs = Date.now() - new Date(lastWateredAt).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Earlier today'
  if (diffDays === 1) return '1 day ago'
  return `${diffDays} days ago`
}

/**
 * Render the actionable half of the watering can: which sprouts are due, each
 * with a one-click path into the water dialog. Without this the can was a
 * read-only log, so watering was only reachable via the `W` shortcut or the
 * per-sprout buttons in the sidebar/twig view.
 */
function populateReadyList(
  elements: WaterCanElements,
  callbacks: WaterCanCallbacks,
  close: () => void,
): void {
  const { waterCanReadyEmpty, waterCanReadyList, waterCanReadyActions, waterCanWaterAll } = elements

  waterCanReadyList.innerHTML = ''

  const available = getWaterAvailable()
  const ready = available > 0 ? callbacks.getReadySprouts() : []

  const showEmptyState = (message: string) => {
    waterCanReadyEmpty.textContent = message
    waterCanReadyEmpty.style.display = 'block'
    waterCanReadyList.style.display = 'none'
    waterCanReadyActions.style.display = 'none'
  }

  if (available <= 0) {
    showEmptyState('Watering can is empty — it refills at 6:00 AM.')
    return
  }
  if (!callbacks.hasActiveSprouts()) {
    showEmptyState('No active sprouts. Plant one to start watering.')
    return
  }
  if (ready.length === 0) {
    showEmptyState('✓ All sprouts watered today.')
    return
  }

  waterCanReadyEmpty.style.display = 'none'
  waterCanReadyList.style.display = 'flex'
  waterCanReadyActions.style.display = 'flex'
  waterCanWaterAll.textContent =
    ready.length > 1 ? `Water all ${ready.length}` : 'Water your sprouts'

  for (const sprout of ready) {
    const row = document.createElement('div')
    row.className = 'water-can-ready-row'
    row.dataset.sproutId = sprout.id

    const info = document.createElement('div')
    info.className = 'water-can-ready-info'

    const name = document.createElement('span')
    name.className = 'water-can-ready-name'
    name.textContent = sprout.title

    const meta = document.createElement('span')
    meta.className = 'water-can-ready-meta'
    meta.textContent = sprout.twigLabel
      ? `${sprout.twigLabel} · ${formatLastWatered(sprout.lastWateredAt)}`
      : formatLastWatered(sprout.lastWateredAt)

    info.append(name, meta)

    const waterBtn = document.createElement('button')
    waterBtn.type = 'button'
    waterBtn.className = 'action-btn action-btn-progress action-btn-water water-can-ready-water'
    waterBtn.textContent = 'water'
    waterBtn.setAttribute('aria-label', `Water ${sprout.title}`)
    waterBtn.addEventListener('click', () => {
      close()
      callbacks.onWaterSprout(sprout.id)
    })

    row.append(info, waterBtn)
    waterCanReadyList.append(row)
  }
}

function populateWaterCan(
  elements: WaterCanElements,
  callbacks: WaterCanCallbacks,
  close: () => void,
): void {
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

  populateReadyList(elements, callbacks, close)

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

export function initWaterCanDialog(
  elements: WaterCanElements & Pick<AppElements, 'waterMeter'>,
  callbacks: WaterCanCallbacks,
): {
  isOpen: () => boolean
  close: () => void
  refresh: () => void
} {
  let releaseFocusTrap: (() => void) | null = null

  const openDialog = () => {
    populateWaterCan(elements, callbacks, closeDialog)
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
  elements.waterCanWaterAll.addEventListener('click', () => {
    closeDialog()
    callbacks.onWaterAll()
  })

  return {
    isOpen: () => !elements.waterCanDialog.classList.contains('hidden'),
    close: closeDialog,
    refresh: () => populateWaterCan(elements, callbacks, closeDialog),
  }
}
