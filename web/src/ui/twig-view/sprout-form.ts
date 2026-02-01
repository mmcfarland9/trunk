/**
 * Builds the sprout creation form for the twig view.
 * Extracted from twig-view.ts for better modularity.
 */

import {
  SEASONS,
  ENVIRONMENTS,
  getEnvironmentLabel,
  getEnvironmentFormHint,
} from '../../utils/sprout-labels'

export type SproutFormElements = {
  formContainer: HTMLDivElement
  titleInput: HTMLInputElement
  seasonButtons: HTMLButtonElement[]
  endDateDisplay: HTMLDivElement
  envButtons: HTMLButtonElement[]
  envHints: HTMLSpanElement[]
  soilCostDisplay: HTMLDivElement
  witherInput: HTMLInputElement
  buddingInput: HTMLInputElement
  flourishInput: HTMLInputElement
  leafSelect: HTMLSelectElement
  newLeafNameInput: HTMLInputElement
  plantButton: HTMLButtonElement
}

/**
 * Builds the sprout draft form and appends it to the container.
 * Returns references to all interactive form elements.
 */
export function buildSproutForm(container: HTMLElement): SproutFormElements {
  const formContainer = document.createElement('div')
  formContainer.className = 'sprout-draft-form'

  formContainer.innerHTML = `
    <label class="sprout-field-label">Leaf <span class="field-hint">(saga)</span></label>
    <select class="sprout-leaf-select">
      <option value="" disabled selected>Select a leaf...</option>
      <option value="__new__">+ Create new leaf</option>
    </select>
    <input type="text" class="sprout-new-leaf-name hidden" placeholder="New leaf name" maxlength="40" />
    <p class="sprout-section-title">Sprout <span class="field-hint">(task)</span></p>
    <input type="text" class="sprout-title-input" placeholder="Describe this sprout." maxlength="60" />
    <label class="sprout-field-label">Season <span class="field-hint">(period)</span></label>
    <div class="sprout-season-selector">
      ${SEASONS.map(s => `<button type="button" class="sprout-season-btn" data-season="${s}">${s}</button>`).join('')}
    </div>
    <div class="sprout-end-date"></div>
    <label class="sprout-field-label">Environment <span class="field-hint">(difficulty)</span></label>
    <div class="sprout-environment-selector">
      ${ENVIRONMENTS.map(e => `<button type="button" class="sprout-env-btn" data-env="${e}">${getEnvironmentLabel(e)}</button>`).join('')}
    </div>
    <div class="env-hint-area">
      ${ENVIRONMENTS.map(e => `<span class="env-hint" data-for="${e}">${getEnvironmentFormHint(e)}</span>`).join('')}
    </div>
    <label class="sprout-field-label">Bloom <span class="field-hint">(outcomes)</span></label>
    <input type="text" class="sprout-wither-input" placeholder="What does withering look like?" maxlength="60" />
    <input type="text" class="sprout-budding-input" placeholder="What does budding look like?" maxlength="60" />
    <input type="text" class="sprout-flourish-input" placeholder="What does flourishing look like?" maxlength="60" />
    <div class="sprout-soil-cost"></div>
    <div class="action-btn-group action-btn-group-right">
      <button type="button" class="action-btn action-btn-progress action-btn-twig sprout-set-btn" disabled></button>
    </div>
  `

  container.append(formContainer)

  // Query all element references
  const titleInput = formContainer.querySelector<HTMLInputElement>('.sprout-title-input')!
  const seasonBtns = formContainer.querySelectorAll<HTMLButtonElement>('.sprout-season-btn')
  const endDateDisplay = formContainer.querySelector<HTMLDivElement>('.sprout-end-date')!
  const envBtns = formContainer.querySelectorAll<HTMLButtonElement>('.sprout-env-btn')
  const envHints = formContainer.querySelectorAll<HTMLSpanElement>('.env-hint')
  const soilCostDisplay = formContainer.querySelector<HTMLDivElement>('.sprout-soil-cost')!
  const witherInput = formContainer.querySelector<HTMLInputElement>('.sprout-wither-input')!
  const buddingInput = formContainer.querySelector<HTMLInputElement>('.sprout-budding-input')!
  const flourishInput = formContainer.querySelector<HTMLInputElement>('.sprout-flourish-input')!
  const leafSelect = formContainer.querySelector<HTMLSelectElement>('.sprout-leaf-select')!
  const newLeafNameInput = formContainer.querySelector<HTMLInputElement>('.sprout-new-leaf-name')!
  const plantButton = formContainer.querySelector<HTMLButtonElement>('.sprout-set-btn')!

  return {
    formContainer,
    titleInput,
    seasonButtons: Array.from(seasonBtns),
    endDateDisplay,
    envButtons: Array.from(envBtns),
    envHints: Array.from(envHints),
    soilCostDisplay,
    witherInput,
    buddingInput,
    flourishInput,
    leafSelect,
    newLeafNameInput,
    plantButton,
  }
}
