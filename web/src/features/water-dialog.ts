import type { AppContext } from '../types'
import { WATERING_PROMPTS, RECENT_WATER_LIMIT } from '../generated/constants'
import { canAffordWater } from '../state'
import { preventDoubleClick } from '../utils/debounce'
import { appendEvent, getWaterAvailable } from '../events'
import { escapeHtml } from '../utils/escape-html'
import sharedConstants from '../../../shared/constants.json'

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
  openWaterDialog: (sprout?: ActiveSproutInfo) => void
  closeWaterDialog: () => void
  isOpen: () => boolean
}

// Track recently shown prompts to avoid quick repeats
const recentPrompts: string[] = []
const RECENT_PROMPT_LIMIT = Math.min(RECENT_WATER_LIMIT, Math.floor(WATERING_PROMPTS.length / 3))

function getUniquePrompts(count: number): string[] {
  const available = WATERING_PROMPTS.filter(p => !recentPrompts.includes(p))
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
 * Select up to 3 active sprouts, sorted by least-recently-watered first.
 */
function selectDailySprouts(sprouts: ActiveSproutInfo[]): ActiveSproutInfo[] {
  return [...sprouts]
    .sort((a, b) => {
      const aLast = a.waterEntries?.map(e => e.timestamp).sort().pop() ?? ''
      const bLast = b.waterEntries?.map(e => e.timestamp).sort().pop() ?? ''
      return aLast < bLast ? -1 : aLast > bLast ? 1 : 0
    })
    .slice(0, 3)
}

export function initWaterDialog(
  ctx: AppContext,
  callbacks: WaterDialogCallbacks
): WaterDialogApi {
  function closeWaterDialog(): void {
    ctx.elements.waterDialog.classList.add('hidden')
  }

  function updateAllPourButtons(): void {
    const remaining = getWaterAvailable()
    const sections = ctx.elements.waterDialogBody.querySelectorAll<HTMLDivElement>('.water-dialog-section')
    sections.forEach(section => {
      if (section.classList.contains('is-watered')) return
      const pourBtn = section.querySelector<HTMLButtonElement>('.water-dialog-pour')
      if (pourBtn) {
        pourBtn.disabled = remaining <= 0
      }
    })
  }

  function openWaterDialog(targetSprout?: ActiveSproutInfo): void {
    const sprouts = targetSprout
      ? [targetSprout]
      : selectDailySprouts(callbacks.getActiveSprouts())
    if (sprouts.length === 0) return

    const prompts = getUniquePrompts(sprouts.length)
    const body = ctx.elements.waterDialogBody
    body.innerHTML = '' // Clear previous content

    const soilGainText = `+${sharedConstants.soil.recoveryRates.waterUse.toFixed(2)} soil`

    sprouts.forEach((sprout, i) => {
      const section = document.createElement('div')
      section.className = 'water-dialog-section'
      section.dataset.sproutId = sprout.id

      section.innerHTML = `
        <div class="water-dialog-section-header">
          <p class="water-dialog-sprout-name">${escapeHtml(sprout.title)}</p>
        </div>
        <p class="water-dialog-prompt">${escapeHtml(prompts[i])}</p>
        <textarea class="water-dialog-journal" placeholder="Write something..."></textarea>
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

      pourBtn.addEventListener('click', preventDoubleClick(() => {
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

        callbacks.onWaterMeterChange()
        callbacks.onSoilMeterChange()
        callbacks.onWaterComplete()

        // Disable remaining pour buttons if no water left
        updateAllPourButtons()
      }))

      body.appendChild(section)
    })

    // Check initial water availability (disable pour buttons if 0 water)
    updateAllPourButtons()

    ctx.elements.waterDialog.classList.remove('hidden')

    // Focus first textarea
    const firstTextarea = body.querySelector<HTMLTextAreaElement>('textarea')
    if (firstTextarea) {
      firstTextarea.focus()
    }
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
