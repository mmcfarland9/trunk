import type { AppContext, SproutEnvironment, SproutSeason } from '../types'
import { getCapacityReward, calculateCapacityReward, getSoilCapacity } from '../state'
import { preventDoubleClick } from '../utils/debounce'
import { getResultEmoji } from '../utils/sprout-labels'
import sharedConstants from '../../../shared/constants.json'
import { appendEvent } from '../events'

export type HarvestDialogCallbacks = {
  onSoilMeterChange: () => void
  onHarvestComplete: () => void
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

  function updateResultDisplay(result: number) {
    const { harvestDialogResultEmoji, harvestDialogSave } = ctx.elements
    harvestDialogResultEmoji.textContent = getResultEmoji(result)

    // Update harvest button with soil/capacity info
    // All harvests return full soil + some capacity (no "failed" state)
    if (currentHarvestSprout) {
      const resultMultiplier = sharedConstants.soil.resultMultipliers[String(result) as keyof typeof sharedConstants.soil.resultMultipliers] ?? 0.7
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
    const { id: sproutId, season, environment } = currentHarvestSprout
    const result = parseInt(harvestDialogSlider.value, 10)
    const reflection = harvestDialogReflection.value.trim()

    const timestamp = new Date().toISOString()

    // Calculate capacity gained with diminishing returns
    const currentCapacity = getSoilCapacity()
    const capacityGained = calculateCapacityReward(season, environment, result, currentCapacity)

    // Emit sprout_harvested event - this is the only source of truth
    appendEvent({
      type: 'sprout_harvested',
      timestamp,
      sproutId,
      result,
      reflection: reflection || undefined,
      capacityGained,
    })

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
