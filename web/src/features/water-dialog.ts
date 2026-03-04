import type { AppContext } from '../types'
import { WATERING_PROMPTS, RECENT_WATER_LIMIT } from '../generated/constants'
import { canAffordWater } from '../state'
import { preventDoubleClick } from '../utils/debounce'
import { appendEvent, getWaterAvailable, checkSproutWateredToday } from '../events'
import { escapeHtml } from '../utils/escape-html'
import sharedConstants from '../../../shared/constants.json'
import { trapFocus } from '../ui/dom-builder/build-dialogs'

type ActiveSproutInfo = {
  id: string
  title: string
  waterEntries?: { timestamp: string }[]
}

type WaterDialogCallbacks = {
  onWaterMeterChange: () => void
  onSoilMeterChange: () => void
  onWaterComplete: () => void
  getActiveSprouts: () => ActiveSproutInfo[]
}

type WaterDialogApi = {
  openWaterDialog: (sprout?: ActiveSproutInfo) => boolean
  closeWaterDialog: () => void
  isOpen: () => boolean
}

// Track recently shown prompts to avoid quick repeats
const recentPrompts: string[] = []
const RECENT_PROMPT_LIMIT = Math.min(RECENT_WATER_LIMIT, Math.floor(WATERING_PROMPTS.length / 3))

function getUniquePrompts(count: number): string[] {
  const available = WATERING_PROMPTS.filter((p) => !recentPrompts.includes(p))
  const pool = available.length >= count ? available : [...WATERING_PROMPTS]

  // Shuffle and take the first `count`
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, count)

  // Track as recent
  for (const prompt of selected) {
    recentPrompts.push(prompt)
    if (recentPrompts.length > RECENT_PROMPT_LIMIT) {
      recentPrompts.shift()
    }
  }

  return selected
}

/**
 * Select up to 3 active sprouts that haven't been watered today,
 * sorted by least-recently-watered first.
 */
function selectDailySprouts(sprouts: ActiveSproutInfo[]): ActiveSproutInfo[] {
  return [...sprouts]
    .filter((s) => !checkSproutWateredToday(s.id))
    .sort((a, b) => {
      const aLast =
        a.waterEntries
          ?.map((e) => e.timestamp)
          .sort()
          .pop() ?? ''
      const bLast =
        b.waterEntries
          ?.map((e) => e.timestamp)
          .sort()
          .pop() ?? ''
      return aLast < bLast ? -1 : aLast > bLast ? 1 : 0
    })
    .slice(0, 3)
}

function getLastWateredMeta(sprout: ActiveSproutInfo): string {
  if (!sprout.waterEntries || sprout.waterEntries.length === 0) {
    return 'Never watered'
  }
  const timestamps = sprout.waterEntries.map((e) => e.timestamp).sort()
  const lastTimestamp = timestamps[timestamps.length - 1]
  const diffMs = Date.now() - new Date(lastTimestamp).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Earlier today'
  if (diffDays === 1) return '1 day ago'
  return `${diffDays} days ago`
}

export function initWaterDialog(ctx: AppContext, callbacks: WaterDialogCallbacks): WaterDialogApi {
  let releaseFocusTrap: (() => void) | null = null

  function closeWaterDialog(): void {
    releaseFocusTrap?.()
    releaseFocusTrap = null
    ctx.elements.waterDialog.classList.add('hidden')
  }

  function updateAllPourButtons(): void {
    const remaining = getWaterAvailable()
    const sections =
      ctx.elements.waterDialogBody.querySelectorAll<HTMLDivElement>('.water-dialog-section')
    sections.forEach((section) => {
      if (section.classList.contains('is-watered')) return
      const pourBtn = section.querySelector<HTMLButtonElement>('.water-dialog-pour')
      const textarea = section.querySelector<HTMLTextAreaElement>('textarea')
      if (pourBtn) {
        const hasContent = textarea ? textarea.value.trim().length > 0 : false
        pourBtn.disabled = remaining <= 0 || !hasContent
      }
    })
  }

  function openWaterDialog(targetSprout?: ActiveSproutInfo): boolean {
    // If targeting a specific sprout that's already watered today, don't open
    if (targetSprout && checkSproutWateredToday(targetSprout.id)) return false

    const sprouts = targetSprout ? [targetSprout] : selectDailySprouts(callbacks.getActiveSprouts())
    if (sprouts.length === 0) return false

    const prompts = getUniquePrompts(sprouts.length)
    const body = ctx.elements.waterDialogBody
    body.innerHTML = '' // Clear previous content

    const soilGainText = `+${sharedConstants.soil.recoveryRates.waterUse.toFixed(2)} soil`

    // Build suggestions section (multi-sprout mode only)
    if (!targetSprout && sprouts.length > 0) {
      const suggestionsDiv = document.createElement('div')
      suggestionsDiv.className = 'water-dialog-suggestions'

      for (const sprout of sprouts) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'water-dialog-suggestion'
        btn.dataset.sproutId = sprout.id

        const name = document.createElement('span')
        name.className = 'water-dialog-suggestion-name'
        name.textContent = sprout.title

        const meta = document.createElement('span')
        meta.className = 'water-dialog-suggestion-meta'
        meta.textContent = getLastWateredMeta(sprout)

        btn.appendChild(name)
        btn.appendChild(meta)

        btn.addEventListener('click', () => {
          const section = body.querySelector<HTMLElement>(
            `.water-dialog-section[data-sprout-id="${sprout.id}"]`,
          )
          if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' })
            section.classList.remove('is-highlighted')
            void section.offsetWidth // force reflow to restart animation
            section.classList.add('is-highlighted')
            section.addEventListener(
              'animationend',
              () => section.classList.remove('is-highlighted'),
              { once: true },
            )
          }
        })

        suggestionsDiv.appendChild(btn)
      }

      body.appendChild(suggestionsDiv)
    }

    sprouts.forEach((sprout, i) => {
      const section = document.createElement('div')
      section.className = 'water-dialog-section'
      section.dataset.sproutId = sprout.id

      section.innerHTML = `
        <div class="water-dialog-section-header">
          <p class="water-dialog-sprout-name">${escapeHtml(sprout.title)}</p>
        </div>
        <p class="water-dialog-prompt">${escapeHtml(prompts[i])}</p>
        <textarea class="water-dialog-journal" placeholder="Write a brief note about your progress" maxlength="2000"></textarea>
        <div class="water-dialog-section-footer">
          <span class="water-dialog-soil-gain">${escapeHtml(soilGainText)}</span>
          <button type="button" class="action-btn action-btn-progress action-btn-water water-dialog-pour" disabled>Pour</button>
        </div>
      `

      const textarea = section.querySelector<HTMLTextAreaElement>('textarea')!
      const pourBtn = section.querySelector<HTMLButtonElement>('.water-dialog-pour')!

      // Enable pour button only when textarea has content and water is available
      textarea.addEventListener('input', () => {
        const hasContent = textarea.value.trim().length > 0
        const hasWater = canAffordWater()
        pourBtn.disabled = !hasContent || !hasWater
      })

      pourBtn.addEventListener(
        'click',
        preventDoubleClick(() => {
          const content = textarea.value.trim()
          if (!content || !canAffordWater()) return

          appendEvent({
            type: 'sprout_watered',
            timestamp: new Date().toISOString(),
            sproutId: sprout.id,
            content,
            prompt: prompts[i],
          })

          section.classList.add('is-watered')
          pourBtn.disabled = true
          pourBtn.textContent = 'Watered'
          textarea.disabled = true

          // Update corresponding suggestion
          const suggestion = body.querySelector<HTMLElement>(
            `.water-dialog-suggestion[data-sprout-id="${sprout.id}"]`,
          )
          if (suggestion) {
            suggestion.classList.add('is-watered')
            const meta = suggestion.querySelector('.water-dialog-suggestion-meta')
            if (meta) meta.textContent = 'Watered'
          }
          // Hide suggestions if all are watered
          const suggestionsDiv = body.querySelector('.water-dialog-suggestions')
          if (suggestionsDiv) {
            const remaining = suggestionsDiv.querySelectorAll(
              '.water-dialog-suggestion:not(.is-watered)',
            )
            if (remaining.length === 0) suggestionsDiv.remove()
          }

          callbacks.onWaterMeterChange()
          callbacks.onSoilMeterChange()
          callbacks.onWaterComplete()

          // Disable remaining pour buttons if no water left
          updateAllPourButtons()
        }),
      )

      body.appendChild(section)
    })

    // Check initial water availability (disable pour buttons if 0 water)
    updateAllPourButtons()

    ctx.elements.waterDialog.classList.remove('hidden')

    const dialogBox = ctx.elements.waterDialog.querySelector<HTMLElement>('[role="dialog"]')
    if (dialogBox) releaseFocusTrap = trapFocus(dialogBox)

    return true
  }

  // Wire up close handlers
  ctx.elements.waterDialogClose.addEventListener('click', closeWaterDialog)
  ctx.elements.waterDialog.addEventListener('click', (e) => {
    if (e.target === ctx.elements.waterDialog) closeWaterDialog()
  })

  return {
    openWaterDialog,
    closeWaterDialog,
    isOpen: () => !ctx.elements.waterDialog.classList.contains('hidden'),
  }
}
