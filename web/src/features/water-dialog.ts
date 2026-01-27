import type { AppContext } from '../types'
import wateringPromptsRaw from '../assets/watering-prompts.txt?raw'
import { nodeState, spendWater, canAffordWater, recoverSoil, addWaterEntry, getSoilRecoveryRate, wasWateredThisWeek } from '../state'
import { preventDoubleClick } from '../utils/debounce'

export type WaterDialogCallbacks = {
  onWaterMeterChange: () => void
  onSoilMeterChange: () => void
  onSetStatus: (message: string, type: 'info' | 'warning' | 'error') => void
  onWaterComplete: () => void
}

// Parse watering prompts (skip comments and empty lines)
const wateringPrompts = wateringPromptsRaw
  .split('\n')
  .map(line => line.trim())
  .filter(line => line && !line.startsWith('#'))

// Track recently shown prompts to avoid quick repeats
const recentPrompts: string[] = []
const RECENT_PROMPT_LIMIT = Math.min(10, Math.floor(wateringPrompts.length / 3))

function getRandomPrompt(): string {
  // Filter out recently shown prompts
  const available = wateringPrompts.filter(p => !recentPrompts.includes(p))
  const pool = available.length > 0 ? available : wateringPrompts

  // Pick random prompt
  const prompt = pool[Math.floor(Math.random() * pool.length)]

  // Track it as recent
  recentPrompts.push(prompt)
  if (recentPrompts.length > RECENT_PROMPT_LIMIT) {
    recentPrompts.shift()
  }

  return prompt
}

function wasSproutWateredThisWeek(twigId: string, sproutId: string): boolean {
  const data = nodeState[twigId]
  if (!data?.sprouts) return false
  const sprout = data.sprouts.find(s => s.id === sproutId)
  if (!sprout) return false
  return wasWateredThisWeek(sprout)
}

export type WaterDialogApi = {
  openWaterDialog: (sprout: { id: string; title: string; twigId: string; twigLabel: string; season: string }) => void
  closeWaterDialog: () => void
  isOpen: () => boolean
}

export function initWaterDialog(
  ctx: AppContext,
  callbacks: WaterDialogCallbacks
): WaterDialogApi {
  // Water dialog state
  let currentWateringSprout: { id: string; twigId: string } | null = null

  function updatePourButtonState() {
    const { waterDialogJournal, waterDialogSave } = ctx.elements
    const hasContent = waterDialogJournal.value.trim().length > 0
    waterDialogSave.disabled = !hasContent
  }

  function openWaterDialog(sprout: { id: string; title: string; twigId: string; twigLabel: string; season: string }) {
    // Check if already watered this week
    if (wasSproutWateredThisWeek(sprout.twigId, sprout.id)) {
      callbacks.onSetStatus('Already watered this week!', 'warning')
      return
    }

    const { waterDialog, waterDialogTitle, waterDialogMeta, waterDialogJournal } = ctx.elements
    currentWateringSprout = { id: sprout.id, twigId: sprout.twigId }
    waterDialogTitle.textContent = sprout.title || 'Untitled Sprout'
    waterDialogMeta.textContent = `${sprout.twigLabel} · ${sprout.season}`
    waterDialogJournal.value = ''
    waterDialogJournal.placeholder = getRandomPrompt()
    updatePourButtonState()
    waterDialog.classList.remove('hidden')
    waterDialogJournal.focus()
  }

  function closeWaterDialog() {
    const { waterDialog, waterDialogJournal } = ctx.elements
    waterDialog.classList.add('hidden')
    waterDialogJournal.value = ''
    currentWateringSprout = null
  }

  function saveWaterEntry() {
    const { waterDialogJournal } = ctx.elements
    const entry = waterDialogJournal.value.trim()

    if (!entry) {
      // Must write something to water
      return
    }

    if (!canAffordWater()) {
      callbacks.onSetStatus('No water left today!', 'warning')
      closeWaterDialog()
      return
    }

    if (currentWateringSprout) {
      // Spend water, gain soil
      spendWater()
      const sproutTitle = ctx.elements.waterDialogTitle.textContent || 'Sprout'
      recoverSoil(getSoilRecoveryRate(), 0, 'Watered sprout', sproutTitle)
      callbacks.onWaterMeterChange()
      callbacks.onSoilMeterChange()

      // Save water entry to sprout data
      const prompt = waterDialogJournal.placeholder
      addWaterEntry(currentWateringSprout.twigId, currentWateringSprout.id, entry, prompt)
      callbacks.onSetStatus(`Sprout watered! (+${getSoilRecoveryRate()} soil)`, 'info')
    }

    closeWaterDialog()
    callbacks.onWaterComplete()
  }

  // Wire up water dialog handlers
  ctx.elements.waterDialogClose.addEventListener('click', closeWaterDialog)
  ctx.elements.waterDialogCancel.addEventListener('click', closeWaterDialog)
  ctx.elements.waterDialogSave.addEventListener('click', preventDoubleClick(saveWaterEntry))
  ctx.elements.waterDialogJournal.addEventListener('input', updatePourButtonState)
  ctx.elements.waterDialog.addEventListener('click', (e) => {
    if (e.target === ctx.elements.waterDialog) closeWaterDialog()
  })

  return {
    openWaterDialog,
    closeWaterDialog,
    isOpen: () => !ctx.elements.waterDialog.classList.contains('hidden'),
  }
}
