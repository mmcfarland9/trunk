import type { AppElements } from '../types'
import { escapeHtml } from '../utils/escape-html'
import { getPresetLabel } from '../state'
import { getState } from '../events'
import { formatDateShort } from '../utils/date-formatting'
import { trapFocus } from '../ui/dom-builder/build-dialogs'

function getBranchLabelFromTwigId(twigId: string): string {
  const match = twigId.match(/^(branch-\d+)-twig-\d+$/)
  if (!match) return ''
  const branchId = match[1]
  return getPresetLabel(branchId) || ''
}

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

  elements.sunLogDialogEntries.innerHTML = entries
    .map((entry) => {
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
    })
    .join('')
}

export function initSunLogDialog(
  elements: SunLogElements & Pick<AppElements, 'sunMeter'>,
  callbacks: { onPopulateSunLogShine: () => void },
): { populate: () => void; open: () => void; isOpen: () => boolean; close: () => void } {
  let releaseFocusTrap: (() => void) | null = null

  const openDialog = () => {
    callbacks.onPopulateSunLogShine()
    populateSunLog(elements)
    elements.sunLogDialog.classList.remove('hidden')
    const dialogBox = elements.sunLogDialog.querySelector<HTMLElement>('[role="dialog"]')
    if (dialogBox) releaseFocusTrap = trapFocus(dialogBox)
  }

  const closeDialog = () => {
    releaseFocusTrap?.()
    releaseFocusTrap = null
    elements.sunLogDialog.classList.add('hidden')
  }

  elements.sunMeter.addEventListener('click', openDialog)
  elements.sunLogDialogClose.addEventListener('click', closeDialog)
  elements.sunLogDialog.addEventListener('click', (e) => {
    if (e.target === elements.sunLogDialog) closeDialog()
  })

  return {
    populate: () => populateSunLog(elements),
    open: openDialog,
    isOpen: () => !elements.sunLogDialog.classList.contains('hidden'),
    close: closeDialog,
  }
}
