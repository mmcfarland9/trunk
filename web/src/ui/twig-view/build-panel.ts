import {
  SEASONS,
  ENVIRONMENTS,
  getEnvironmentLabel,
  getEnvironmentFormHint,
} from '../../utils/sprout-labels'

/**
 * Builds the twig view panel DOM structure.
 * Returns the container element with all static markup.
 */
export function buildPanel(mapPanel: HTMLElement): HTMLDivElement {
  const container = document.createElement('div')
  container.className = 'twig-view hidden'

  container.innerHTML = `
    <div class="twig-view-header">
      <div class="twig-title-section">
        <input type="text" class="twig-title-input" readonly tabindex="-1" />
        <textarea class="twig-note-input" readonly tabindex="-1" rows="1"></textarea>
      </div>
    </div>
    <div class="twig-view-body">
      <div class="sprout-column sprout-drafts">
        <h3 class="column-title">New</h3>
        <div class="sprout-draft-form">
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
            ${SEASONS.map((s) => `<button type="button" class="sprout-season-btn" data-season="${s}" aria-pressed="false">${s}</button>`).join('')}
          </div>
          <div class="sprout-end-date"></div>
          <label class="sprout-field-label">Environment <span class="field-hint">(difficulty)</span></label>
          <div class="sprout-environment-selector">
            ${ENVIRONMENTS.map((e) => `<button type="button" class="sprout-env-btn" data-env="${e}" aria-pressed="false">${getEnvironmentLabel(e)}</button>`).join('')}
          </div>
          <div class="env-hint-area">
            ${ENVIRONMENTS.map((e) => `<span class="env-hint" data-for="${e}">${getEnvironmentFormHint(e)}</span>`).join('')}
          </div>
          <label class="sprout-field-label">Bloom <span class="field-hint">(outcomes)</span></label>
          <input type="text" class="sprout-wither-input" placeholder="What does withering look like?" maxlength="60" />
          <input type="text" class="sprout-budding-input" placeholder="What does budding look like?" maxlength="60" />
          <input type="text" class="sprout-flourish-input" placeholder="What does flourishing look like?" maxlength="60" />
          <div class="sprout-soil-cost" aria-live="polite"></div>
          <div class="action-btn-group action-btn-group-right">
            <button type="button" class="action-btn action-btn-progress action-btn-twig sprout-set-btn" disabled></button>
          </div>
        </div>
      </div>
      <div class="sprout-column sprout-active">
        <h3 class="column-title">Growing <span class="active-count">(0)</span></h3>
        <div class="active-sprouts-list"></div>
      </div>
      <div class="sprout-column sprout-history">
        <h3 class="column-title">Cultivated <span class="cultivated-count">(0)</span></h3>
        <div class="history-sprouts-list"></div>
      </div>
    </div>
    <div class="confirm-dialog hidden">
      <div class="confirm-dialog-box" role="alertdialog" aria-modal="true" aria-describedby="confirm-dialog-message">
        <p id="confirm-dialog-message" class="confirm-dialog-message"></p>
        <div class="confirm-dialog-actions">
          <button type="button" class="action-btn action-btn-passive action-btn-neutral confirm-dialog-cancel">Cancel</button>
          <button type="button" class="action-btn action-btn-progress action-btn-error confirm-dialog-confirm">Uproot</button>
        </div>
      </div>
    </div>
  `

  mapPanel.append(container)
  return container
}

/**
 * Extracts element references from the container.
 * Returns all the DOM elements needed by the twig view.
 */
export function getElements(container: HTMLDivElement) {
  return {
    titleInput: container.querySelector<HTMLInputElement>('.twig-title-input')!,
    noteInput: container.querySelector<HTMLTextAreaElement>('.twig-note-input')!,
    sproutTitleInput: container.querySelector<HTMLInputElement>('.sprout-title-input')!,
    seasonBtns: container.querySelectorAll<HTMLButtonElement>('.sprout-season-btn'),
    endDateDisplay: container.querySelector<HTMLDivElement>('.sprout-end-date')!,
    envBtns: container.querySelectorAll<HTMLButtonElement>('.sprout-env-btn'),
    envHints: container.querySelectorAll<HTMLSpanElement>('.env-hint'),
    soilCostDisplay: container.querySelector<HTMLDivElement>('.sprout-soil-cost')!,
    witherInput: container.querySelector<HTMLInputElement>('.sprout-wither-input')!,
    buddingInput: container.querySelector<HTMLInputElement>('.sprout-budding-input')!,
    flourishInput: container.querySelector<HTMLInputElement>('.sprout-flourish-input')!,
    leafSelect: container.querySelector<HTMLSelectElement>('.sprout-leaf-select')!,
    newLeafNameInput: container.querySelector<HTMLInputElement>('.sprout-new-leaf-name')!,
    setBtn: container.querySelector<HTMLButtonElement>('.sprout-set-btn')!,
    activeCount: container.querySelector<HTMLSpanElement>('.active-count')!,
    cultivatedCount: container.querySelector<HTMLSpanElement>('.cultivated-count')!,
    activeList: container.querySelector<HTMLDivElement>('.active-sprouts-list')!,
    historyList: container.querySelector<HTMLDivElement>('.history-sprouts-list')!,
    confirmDialog: container.querySelector<HTMLDivElement>('.confirm-dialog')!,
    confirmMessage: container.querySelector<HTMLParagraphElement>('.confirm-dialog-message')!,
    confirmCancelBtn: container.querySelector<HTMLButtonElement>('.confirm-dialog-cancel')!,
    confirmConfirmBtn: container.querySelector<HTMLButtonElement>('.confirm-dialog-confirm')!,
  }
}
