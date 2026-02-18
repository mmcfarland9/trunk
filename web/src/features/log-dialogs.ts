import type { AppElements } from '../types'
import { escapeHtml } from '../utils/escape-html'
import {
  getWaterAvailable,
  getWaterCapacity,
  getNextWaterReset,
  formatResetTime,
  getPresetLabel,
} from '../state'
import { getState, getAllWaterEntries, getEvents, deriveSoilLog } from '../events'
import { formatDateShort, formatDateWithYear } from '../utils/date-formatting'

// --- Helper Functions ---

function getBranchLabelFromTwigId(twigId: string): string {
  const match = twigId.match(/^(branch-\d+)-twig-\d+$/)
  if (!match) return ''
  const branchId = match[1]
  return getPresetLabel(branchId) || ''
}

// --- Sun Log Dialog ---

type SunLogElements = Pick<
  AppElements,
  'sunLogDialog' | 'sunLogDialogClose' | 'sunLogDialogEmpty' | 'sunLogDialogEntries'
>

function populateSunLog(elements: SunLogElements): void {
  const state = getState()
  const entries = [...state.sunEntries].reverse()
  const isEmpty = entries.length === 0

  elements.sunLogDialogEmpty.style.display = isEmpty ? 'block' : 'none'
  elements.sunLogDialogEntries.style.display = isEmpty ? 'none' : 'flex'

  if (isEmpty) return

  elements.sunLogDialogEntries.innerHTML = entries.map(entry => {
    const branchLabel = getBranchLabelFromTwigId(entry.context.twigId)
    const context = branchLabel
      ? `${escapeHtml(branchLabel)} : ${escapeHtml(entry.context.twigLabel)}`
      : escapeHtml(entry.context.twigLabel)
    const timestamp = formatDateShort(entry.timestamp)
    const promptHtml = entry.prompt
      ? `<p class="sun-log-entry-prompt">"${escapeHtml(entry.prompt)}"</p>`
      : ''

    return `
      <div class="sun-log-entry">
        <div class="sun-log-entry-header">
          <span class="sun-log-entry-context">${context}</span>
          <span class="sun-log-entry-timestamp">${timestamp}</span>
        </div>
        ${promptHtml}
        <p class="sun-log-entry-content">${escapeHtml(entry.content)}</p>
      </div>
    `
  }).join('')
}

export function initSunLogDialog(
  elements: SunLogElements & Pick<AppElements, 'sunMeter'>,
  callbacks: { onPopulateSunLogShine: () => void }
): { populate: () => void; isOpen: () => boolean; close: () => void } {
  const openDialog = () => {
    callbacks.onPopulateSunLogShine()
    populateSunLog(elements)
    elements.sunLogDialog.classList.remove('hidden')
  }

  const closeDialog = () => {
    elements.sunLogDialog.classList.add('hidden')
  }

  elements.sunMeter.addEventListener('click', openDialog)
  elements.sunLogDialogClose.addEventListener('click', closeDialog)
  elements.sunLogDialog.addEventListener('click', (e) => {
    if (e.target === elements.sunLogDialog) closeDialog()
  })

  return {
    populate: () => populateSunLog(elements),
    isOpen: () => !elements.sunLogDialog.classList.contains('hidden'),
    close: closeDialog,
  }
}

// --- Soil Bag Dialog ---

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

  elements.soilBagDialogEntries.innerHTML = entries.map(entry => {
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
  }).join('')
}

export function initSoilBagDialog(
  elements: SoilBagElements & Pick<AppElements, 'soilMeter'>
): { isOpen: () => boolean; close: () => void } {
  const openDialog = () => {
    populateSoilBag(elements)
    elements.soilBagDialog.classList.remove('hidden')
  }

  const closeDialog = () => {
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

// --- Water Can Dialog ---

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
    elements.waterCanLogEntries.innerHTML = logEntries.map(entry => {
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
    }).join('')
  }
}

export function initWaterCanDialog(
  elements: WaterCanElements & Pick<AppElements, 'waterMeter'>
): { isOpen: () => boolean; close: () => void } {
  const openDialog = () => {
    populateWaterCan(elements)
    elements.waterCanDialog.classList.remove('hidden')
  }

  const closeDialog = () => {
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
