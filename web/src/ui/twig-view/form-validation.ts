import type { FormState } from './sprout-form'
import { MAX_TITLE_LENGTH, MAX_LEAF_NAME_LENGTH, MAX_BLOOM_LENGTH } from '../../generated/constants'
import { calculateSoilCost, getSoilAvailable, canAffordSoil } from '../../state'

type FormElements = {
  sproutTitleInput: HTMLInputElement
  leafSelect: HTMLSelectElement
  newLeafNameInput: HTMLInputElement
  witherInput: HTMLInputElement
  buddingInput: HTMLInputElement
  flourishInput: HTMLInputElement
  soilCostDisplay: HTMLDivElement
  setBtn: HTMLButtonElement
}

/**
 * Updates the form state based on current inputs.
 * Validates fields and updates the UI accordingly.
 */
export function updateFormState(state: FormState, elements: FormElements): void {
  const title = elements.sproutTitleInput.value.trim()
  const hasTitle = title.length > 0 && title.length <= MAX_TITLE_LENGTH
  const hasSeason = state.selectedSeason !== null
  const hasEnv = state.selectedEnvironment !== null

  // Leaf is required - either existing leaf selected or new leaf name provided
  const leafValue = elements.leafSelect.value
  const isNewLeaf = leafValue === '__new__'
  const newLeafName = elements.newLeafNameInput.value.trim()
  const hasLeaf = isNewLeaf
    ? newLeafName.length > 0 && newLeafName.length <= MAX_LEAF_NAME_LENGTH
    : leafValue !== ''

  // Validate bloom lengths (optional but must be within limits if provided)
  const witherValid = elements.witherInput.value.trim().length <= MAX_BLOOM_LENGTH
  const buddingValid = elements.buddingInput.value.trim().length <= MAX_BLOOM_LENGTH
  const flourishValid = elements.flourishInput.value.trim().length <= MAX_BLOOM_LENGTH
  const bloomsValid = witherValid && buddingValid && flourishValid

  // Calculate and display soil cost
  if (hasSeason && hasEnv) {
    const cost = calculateSoilCost(state.selectedSeason!, state.selectedEnvironment!)
    const available = getSoilAvailable()
    const canAfford = canAffordSoil(cost)
    elements.soilCostDisplay.textContent = `Cost: ${cost} soil (${available} available)`
    elements.soilCostDisplay.classList.toggle('insufficient', !canAfford)
  } else {
    elements.soilCostDisplay.textContent = ''
    elements.soilCostDisplay.classList.remove('insufficient')
  }

  // Check if form is ready and affordable (leaf is now required)
  const isFormComplete = hasTitle && hasSeason && hasEnv && hasLeaf && bloomsValid
  const cost = hasSeason && hasEnv ? calculateSoilCost(state.selectedSeason!, state.selectedEnvironment!) : 0
  const isAffordable = canAffordSoil(cost)
  elements.setBtn.disabled = !isFormComplete || !isAffordable

  // Show cost on button
  if (cost > 0) {
    elements.setBtn.innerHTML = `Plant <span class="btn-soil-cost">(-${cost.toFixed(2)})</span>`
  } else {
    elements.setBtn.textContent = 'Plant'
  }
}
