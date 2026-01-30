import type { AppContext, SproutEnvironment, SproutSeason } from '../types'
import { nodeState, saveState, recoverSoil, getCapacityReward } from '../state'
import { preventDoubleClick } from '../utils/debounce'

export type HarvestDialogCallbacks = {
  onSoilMeterChange: () => void
  onSetStatus: (message: string, type: 'info' | 'warning' | 'error') => void
  onHarvestComplete: () => void
}

// Result emoji scale: 1=withered, 2=sprout, 3=sapling, 4=tree, 5=oak
function getResultEmoji(result: number): string {
  const emojis: Record<number, string> = {
    1: '🥀', // withered
    2: '🌱', // sprout
    3: '🌿', // sapling
    4: '🌳', // tree
    5: '🌲', // strong oak/evergreen
  }
  return emojis[result] || '🌿'
}

export type HarvestDialogApi = {
  openHarvestDialog: (sprout: {
    id: string
    title: string
    twigId: string
    twigLabel: string
    season: SproutSeason
    environment: SproutEnvironment
    soilCost: number
    bloomWither?: string
    bloomBudding?: string
    bloomFlourish?: string
  }) => void
  closeHarvestDialog: () => void
  isOpen: () => boolean
}

export function initHarvestDialog(
  ctx: AppContext,
  callbacks: HarvestDialogCallbacks
): HarvestDialogApi {
  // Harvest dialog state
  let currentHarvestSprout: {
    id: string
    twigId: string
    soilCost: number
    environment: SproutEnvironment
    season: SproutSeason
  } | null = null

  // Result multipliers for capacity gain (showing up counts!)
  const RESULT_MULTIPLIERS: Record<number, number> = {
    1: 0.4,   // You showed up - 40% reward
    2: 0.55,  // Partial effort
    3: 0.7,   // Solid work
    4: 0.85,  // Strong execution
    5: 1.0,   // Excellence
  }

  function updateResultDisplay(result: number) {
    const { harvestDialogResultEmoji, harvestDialogSave } = ctx.elements
    harvestDialogResultEmoji.textContent = getResultEmoji(result)

    // Update harvest button with soil/capacity info
    // All harvests return full soil + some capacity (no "failed" state)
    if (currentHarvestSprout) {
      const resultMultiplier = RESULT_MULTIPLIERS[result] ?? 0.7
      const baseReward = getCapacityReward(currentHarvestSprout.environment, currentHarvestSprout.season)
      const capGain = baseReward * resultMultiplier
      harvestDialogSave.innerHTML = `Harvest <span class="btn-soil-gain">(+${currentHarvestSprout.soilCost.toFixed(1)}, +${capGain.toFixed(2)} cap)</span>`
    }
  }

  function openHarvestDialog(sprout: {
    id: string
    title: string
    twigId: string
    twigLabel: string
    season: SproutSeason
    environment: SproutEnvironment
    soilCost: number
    bloomWither?: string
    bloomBudding?: string
    bloomFlourish?: string
  }) {
    const {
      harvestDialog,
      harvestDialogTitle,
      harvestDialogMeta,
      harvestDialogSlider,
      harvestDialogBloomHints,
      harvestDialogReflection
    } = ctx.elements

    currentHarvestSprout = {
      id: sprout.id,
      twigId: sprout.twigId,
      soilCost: sprout.soilCost,
      environment: sprout.environment,
      season: sprout.season
    }

    harvestDialogTitle.textContent = sprout.title || 'Untitled Sprout'
    harvestDialogMeta.textContent = `${sprout.twigLabel} · ${sprout.season}`
    harvestDialogSlider.value = '3'
    harvestDialogReflection.value = ''

    // Set bloom hints
    harvestDialogBloomHints.forEach(hint => {
      const level = hint.dataset.level
      if (level === '1') {
        hint.textContent = sprout.bloomWither ? `withered: ${sprout.bloomWither}` : ''
      } else if (level === '3') {
        hint.textContent = sprout.bloomBudding ? `budded: ${sprout.bloomBudding}` : ''
      } else if (level === '5') {
        hint.textContent = sprout.bloomFlourish ? `flourished: ${sprout.bloomFlourish}` : ''
      }
    })

    updateResultDisplay(3)
    harvestDialog.classList.remove('hidden')
    harvestDialogSlider.focus()
  }

  function closeHarvestDialog() {
    const { harvestDialog, harvestDialogReflection } = ctx.elements
    harvestDialog.classList.add('hidden')
    harvestDialogReflection.value = ''
    currentHarvestSprout = null
  }

  function saveHarvest() {
    const { harvestDialogSlider, harvestDialogReflection } = ctx.elements

    if (!currentHarvestSprout) return

    // Extract values early to avoid non-null assertion issues
    const { id: sproutId, twigId } = currentHarvestSprout
    const result = parseInt(harvestDialogSlider.value, 10)
    const reflection = harvestDialogReflection.value.trim()

    // Find and update the sprout
    const data = nodeState[twigId]
    if (!data?.sprouts) return

    const sprout = data.sprouts.find(s => s.id === sproutId)
    if (!sprout) return

    // All harvests are completions - result (1-5) indicates outcome
    // No "failed" state - showing up counts!
    sprout.state = 'completed'
    sprout.result = result
    sprout.reflection = reflection || undefined
    sprout.completedAt = new Date().toISOString()

    // All harvests return full soil + capacity based on result
    const resultMultiplier = RESULT_MULTIPLIERS[result] ?? 0.7
    const baseReward = getCapacityReward(sprout.environment, sprout.season)
    const capGain = baseReward * resultMultiplier
    recoverSoil(sprout.soilCost, capGain, 'Harvested sprout', sprout.title)

    const emoji = getResultEmoji(result)
    callbacks.onSetStatus(`${emoji} Sprout harvested! (+${sprout.soilCost.toFixed(1)} soil, +${capGain.toFixed(2)} cap)`, 'info')

    saveState()
    callbacks.onSoilMeterChange()
    closeHarvestDialog()
    callbacks.onHarvestComplete()
  }

  // Wire up harvest dialog handlers
  ctx.elements.harvestDialogClose.addEventListener('click', closeHarvestDialog)
  ctx.elements.harvestDialogCancel.addEventListener('click', closeHarvestDialog)
  ctx.elements.harvestDialogSave.addEventListener('click', preventDoubleClick(saveHarvest))
  ctx.elements.harvestDialogSlider.addEventListener('input', () => {
    const result = parseInt(ctx.elements.harvestDialogSlider.value, 10)
    updateResultDisplay(result)
  })
  ctx.elements.harvestDialog.addEventListener('click', (e) => {
    if (e.target === ctx.elements.harvestDialog) closeHarvestDialog()
  })

  return {
    openHarvestDialog,
    closeHarvestDialog,
    isOpen: () => !ctx.elements.harvestDialog.classList.contains('hidden'),
  }
}
