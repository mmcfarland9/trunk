import type { TwigViewApi, Sprout, SproutSeason, SproutEnvironment } from '../types'
import { escapeHtml } from '../utils/escape-html'
import { preventDoubleClick } from '../utils/debounce'
import {
  SEASONS,
  ENVIRONMENTS,
  getSeasonLabel,
  getEnvironmentLabel,
  getEnvironmentFormHint,
  getResultEmoji,
} from '../utils/sprout-labels'
import {
  calculateSoilCost,
  getSoilAvailable,
  canAffordSoil,
  getPresetLabel,
} from '../state'
import {
  appendEvent,
  getState,
  getSproutsForTwig,
  getLeavesForTwig,
  getLeafById,
  toSprout,
  generateSproutId,
  generateLeafId,
  checkSproutWateredThisWeek,
  type DerivedLeaf,
} from '../events'
import sharedConstants from '../../../shared/constants.json'

type TwigViewCallbacks = {
  onClose: () => void
  onSave: () => void
  onSoilChange?: () => void
  onNavigate?: (direction: 'prev' | 'next') => HTMLButtonElement | null
  onOpenLeaf?: (leafId: string, twigId: string, branchIndex: number) => void
  onWaterClick?: (sprout: { id: string, title: string, twigId: string, twigLabel: string, season: string }) => void
  onHarvestClick?: (sprout: {
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
}

// Labels and emojis imported from ../utils/sprout-labels

function getEndDate(season: SproutSeason, startDate: Date = new Date()): Date {
  const end = new Date(startDate)
  switch (season) {
    case '2w': end.setDate(end.getDate() + 14); break
    case '1m': end.setMonth(end.getMonth() + 1); break
    case '3m': end.setMonth(end.getMonth() + 3); break
    case '6m': end.setMonth(end.getMonth() + 6); break
    case '1y': end.setFullYear(end.getFullYear() + 1); break
  }
  // Set to 9am CST (UTC-6 = 15:00 UTC)
  end.setUTCHours(15, 0, 0, 0)
  return end
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isReady(sprout: Sprout): boolean {
  // A sprout without an endDate is not ready (endDate is set when planted)
  if (!sprout.endDate) return false
  return new Date(sprout.endDate).getTime() <= Date.now()
}

function getDaysRemaining(sprout: Sprout): number {
  if (!sprout.endDate) return 0
  const end = new Date(sprout.endDate).getTime()
  const now = Date.now()
  const diff = end - now
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

// wasWateredThisWeek uses checkSproutWateredThisWeek from events

export function buildTwigView(mapPanel: HTMLElement, callbacks: TwigViewCallbacks): TwigViewApi {
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

  // Element references
  const titleInput = container.querySelector<HTMLInputElement>('.twig-title-input')!
  const noteInput = container.querySelector<HTMLTextAreaElement>('.twig-note-input')!
  const sproutTitleInput = container.querySelector<HTMLInputElement>('.sprout-title-input')!
  const seasonBtns = container.querySelectorAll<HTMLButtonElement>('.sprout-season-btn')
  const endDateDisplay = container.querySelector<HTMLDivElement>('.sprout-end-date')!
  const envBtns = container.querySelectorAll<HTMLButtonElement>('.sprout-env-btn')
  const envHints = container.querySelectorAll<HTMLSpanElement>('.env-hint')
  const soilCostDisplay = container.querySelector<HTMLDivElement>('.sprout-soil-cost')!
  const witherInput = container.querySelector<HTMLInputElement>('.sprout-wither-input')!
  const buddingInput = container.querySelector<HTMLInputElement>('.sprout-budding-input')!
  const flourishInput = container.querySelector<HTMLInputElement>('.sprout-flourish-input')!
  const leafSelect = container.querySelector<HTMLSelectElement>('.sprout-leaf-select')!
  const newLeafNameInput = container.querySelector<HTMLInputElement>('.sprout-new-leaf-name')!
  const setBtn = container.querySelector<HTMLButtonElement>('.sprout-set-btn')!
  const activeCount = container.querySelector<HTMLSpanElement>('.active-count')!
  const cultivatedCount = container.querySelector<HTMLSpanElement>('.cultivated-count')!
  const activeList = container.querySelector<HTMLDivElement>('.active-sprouts-list')!
  const historyList = container.querySelector<HTMLDivElement>('.history-sprouts-list')!
  const confirmDialog = container.querySelector<HTMLDivElement>('.confirm-dialog')!
  const confirmMessage = container.querySelector<HTMLParagraphElement>('.confirm-dialog-message')!
  const confirmCancelBtn = container.querySelector<HTMLButtonElement>('.confirm-dialog-cancel')!
  const confirmConfirmBtn = container.querySelector<HTMLButtonElement>('.confirm-dialog-confirm')!

  // Form state
  let selectedSeason: SproutSeason | null = null
  let selectedEnvironment: SproutEnvironment | null = null
  let currentTwigNode: HTMLButtonElement | null = null
  let confirmResolve: ((value: boolean) => void) | null = null

  function showConfirm(message: string, confirmLabel: string = 'Uproot'): Promise<boolean> {
    confirmMessage.textContent = message
    confirmConfirmBtn.textContent = confirmLabel
    confirmDialog.classList.remove('hidden')
    confirmConfirmBtn.focus()
    return new Promise((resolve) => {
      confirmResolve = resolve
    })
  }

  function hideConfirm(result: boolean): void {
    confirmDialog.classList.add('hidden')
    if (confirmResolve) {
      confirmResolve(result)
      confirmResolve = null
    }
  }

  confirmCancelBtn.addEventListener('click', () => hideConfirm(false))
  confirmConfirmBtn.addEventListener('click', () => hideConfirm(true))

  function getCurrentNodeId(): string | null {
    return currentTwigNode?.dataset.nodeId || null
  }

  function getSprouts(): Sprout[] {
    const nodeId = getCurrentNodeId()
    if (!nodeId) return []
    // Read from derived event state (source of truth)
    const state = getState()
    const derivedSprouts = getSproutsForTwig(state, nodeId)
    return derivedSprouts.map(toSprout)
  }

  // Helper functions to filter sprouts by state
  function getActiveSprouts(sprouts: Sprout[]): Sprout[] {
    return sprouts.filter(s => s.state === 'active')
  }

  function getHistorySprouts(sprouts: Sprout[]): Sprout[] {
    return sprouts.filter(s => s.state === 'completed')
  }

  // Helper to get leaves for current twig
  function getLeaves(): DerivedLeaf[] {
    const nodeId = getCurrentNodeId()
    if (!nodeId) return []
    const state = getState()
    return getLeavesForTwig(state, nodeId)
  }

  // Helper to filter sprouts by leaf
  function filterSproutsByLeaf(sprouts: Sprout[], leafId: string): Sprout[] {
    return sprouts.filter(s => s.leafId === leafId)
  }

  // Max lengths for form fields
  const MAX_TITLE_LENGTH = 60
  const MAX_LEAF_NAME_LENGTH = 40
  const MAX_BLOOM_LENGTH = 60

  function updateFormState(): void {
    const title = sproutTitleInput.value.trim()
    const hasTitle = title.length > 0 && title.length <= MAX_TITLE_LENGTH
    const hasSeason = selectedSeason !== null
    const hasEnv = selectedEnvironment !== null

    // Leaf is required - either existing leaf selected or new leaf name provided
    const leafValue = leafSelect.value
    const isNewLeaf = leafValue === '__new__'
    const newLeafName = newLeafNameInput.value.trim()
    const hasLeaf = isNewLeaf
      ? newLeafName.length > 0 && newLeafName.length <= MAX_LEAF_NAME_LENGTH
      : leafValue !== ''

    // Validate bloom lengths (optional but must be within limits if provided)
    const witherValid = witherInput.value.trim().length <= MAX_BLOOM_LENGTH
    const buddingValid = buddingInput.value.trim().length <= MAX_BLOOM_LENGTH
    const flourishValid = flourishInput.value.trim().length <= MAX_BLOOM_LENGTH
    const bloomsValid = witherValid && buddingValid && flourishValid

    // Calculate and display soil cost
    if (hasSeason && hasEnv) {
      const cost = calculateSoilCost(selectedSeason!, selectedEnvironment!)
      const available = getSoilAvailable()
      const canAfford = canAffordSoil(cost)
      soilCostDisplay.textContent = `Cost: ${cost} soil (${available} available)`
      soilCostDisplay.classList.toggle('insufficient', !canAfford)
    } else {
      soilCostDisplay.textContent = ''
      soilCostDisplay.classList.remove('insufficient')
    }

    // Check if form is ready and affordable (leaf is now required)
    const isFormComplete = hasTitle && hasSeason && hasEnv && hasLeaf && bloomsValid
    const cost = hasSeason && hasEnv ? calculateSoilCost(selectedSeason!, selectedEnvironment!) : 0
    const isAffordable = canAffordSoil(cost)
    setBtn.disabled = !isFormComplete || !isAffordable

    // Show cost on button
    if (cost > 0) {
      setBtn.innerHTML = `Plant <span class="btn-soil-cost">(-${cost.toFixed(2)})</span>`
    } else {
      setBtn.textContent = 'Plant'
    }
  }

  function renderHistoryCard(s: Sprout): string {
    const hasLeaf = !!s.leafId

    const hasBloom = s.bloomWither || s.bloomBudding || s.bloomFlourish
    const bloomHtml = hasBloom ? `
      <p class="sprout-card-bloom">
        ${s.bloomWither ? `<span class="bloom-item">🥀 <em>${escapeHtml(s.bloomWither)}</em></span>` : ''}
        ${s.bloomBudding ? `<span class="bloom-item">🌱 <em>${escapeHtml(s.bloomBudding)}</em></span>` : ''}
        ${s.bloomFlourish ? `<span class="bloom-item">🌲 <em>${escapeHtml(s.bloomFlourish)}</em></span>` : ''}
      </p>
    ` : ''

    // All completed sprouts - result indicates outcome, no "failed" state
    return `
      <div class="sprout-card sprout-history-card is-completed ${hasLeaf ? 'is-clickable' : ''}" data-id="${escapeHtml(s.id)}" ${hasLeaf ? `data-leaf-id="${escapeHtml(s.leafId || '')}" data-action="open-leaf"` : ''}>
        <div class="sprout-card-header">
          <span class="sprout-card-season">${getSeasonLabel(s.season)}</span>
          <button type="button" class="sprout-delete-btn" data-action="delete" aria-label="Uproot">x</button>
        </div>
        <p class="sprout-card-title">${escapeHtml(s.title)}</p>
        ${bloomHtml}
        <div class="sprout-result-section">
          <span class="sprout-result-display">${getResultEmoji(s.result || 1)} ${s.result || 1}/5</span>
          <span class="sprout-card-date">${s.completedAt ? formatDate(new Date(s.completedAt)) : ''}</span>
        </div>
        ${s.reflection ? `<p class="sprout-card-reflection">${escapeHtml(s.reflection)}</p>` : ''}
      </div>
    `
  }

  function renderActiveCard(s: Sprout): string {
    const ready = isReady(s)
    const daysLeft = getDaysRemaining(s)
    const hasLeaf = !!s.leafId
    const watered = checkSproutWateredThisWeek(s.id)

    const hasBloom = s.bloomWither || s.bloomBudding || s.bloomFlourish
    const bloomHtml = hasBloom ? `
      <p class="sprout-card-bloom">
        ${s.bloomWither ? `<span class="bloom-item">🥀 <em>${escapeHtml(s.bloomWither)}</em></span>` : ''}
        ${s.bloomBudding ? `<span class="bloom-item">🌱 <em>${escapeHtml(s.bloomBudding)}</em></span>` : ''}
        ${s.bloomFlourish ? `<span class="bloom-item">🌲 <em>${escapeHtml(s.bloomFlourish)}</em></span>` : ''}
      </p>
    ` : ''

    return `
      <div class="sprout-card sprout-active-card ${ready ? 'is-ready' : 'is-growing'} ${hasLeaf ? 'is-clickable' : ''}" data-id="${escapeHtml(s.id)}" ${hasLeaf ? `data-leaf-id="${escapeHtml(s.leafId || '')}" data-action="open-leaf"` : ''}>
        <div class="sprout-card-header">
          <span class="sprout-card-season">${getSeasonLabel(s.season)}</span>
          <button type="button" class="sprout-delete-btn" data-action="delete" aria-label="Uproot">x</button>
        </div>
        <p class="sprout-card-title">${escapeHtml(s.title)}</p>
        ${bloomHtml}

        ${ready ? `
          <div class="sprout-ready-footer">
            <p class="sprout-card-status">Ready to harvest</p>
            <button type="button" class="action-btn action-btn-progress action-btn-harvest sprout-harvest-btn" data-action="harvest">Harvest</button>
          </div>
        ` : `
          <div class="sprout-growing-footer">
            <p class="sprout-days-remaining">${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining</p>
            <button type="button" class="action-btn ${watered ? 'action-btn-passive' : 'action-btn-progress'} action-btn-water sprout-water-btn" data-action="water" ${watered ? 'disabled' : ''}>${watered ? 'Watered' : `Water <span class="btn-soil-gain">(+${sharedConstants.soil.recoveryRates.waterUse.toFixed(2)})</span>`}</button>
          </div>
        `}
      </div>
    `
  }

  function renderLeafCard(leafId: string, sprouts: Sprout[], isGrowing: boolean): string {
    const state = getState()
    const leaf = getLeafById(state, leafId)
    const leafName = leaf?.name || 'Unnamed Saga'

    if (isGrowing) {
      // Get all active sprouts for this leaf
      const activeSprouts = sprouts.filter(s => s.state === 'active')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

      if (activeSprouts.length === 0) return ''

      // If only one active sprout, render normally in a leaf wrapper
      if (activeSprouts.length === 1) {
        return `
          <div class="leaf-card" data-leaf-id="${escapeHtml(leafId)}" data-action="open-leaf">
            ${renderActiveCard(activeSprouts[0])}
          </div>
        `
      }

      // Multiple active sprouts - render each as full card, grouped with border and name
      return `
        <div class="leaf-card-group is-clickable" data-leaf-id="${escapeHtml(leafId)}" data-action="open-leaf">
          <div class="leaf-card-group-header">${escapeHtml(leafName)}</div>
          <div class="leaf-card-group-sprouts">
            ${activeSprouts.map(s => renderActiveCard(s)).join('')}
          </div>
        </div>
      `
    } else {
      // Cultivated - show most recent completed sprout
      const completedSprouts = sprouts.filter(s => s.state === 'completed')
      const topSprout = completedSprouts.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0]

      if (!topSprout) return ''

      const layerCount = Math.min(completedSprouts.length, 3)
      return `
        <div class="leaf-card" data-leaf-id="${escapeHtml(leafId)}" data-layers="${layerCount}" data-action="open-leaf">
          ${renderHistoryCard(topSprout)}
        </div>
      `
    }
  }

  function renderSprouts(): void {
    const sprouts = getSprouts()
    const active = getActiveSprouts(sprouts)
    const history = getHistorySprouts(sprouts)

    // Get all leaves
    const leaves = getLeaves()
    const leafIdSet = new Set(leaves.map((l: DerivedLeaf) => l.id))

    // Determine which leaves have active sprouts (these go in Growing)
    const activeLeafIds = new Set(active.filter(s => s.leafId).map(s => s.leafId!))

    // Standalone active sprouts (no leaf or orphaned leaf)
    const standaloneActive = active.filter(s => !s.leafId || !leafIdSet.has(s.leafId))

    // Cultivated leaves = leaves without any active sprouts
    const cultivatedLeaves = leaves.filter(l => !activeLeafIds.has(l.id))
    // Only count leaves that actually have history sprouts
    const cultivatedLeavesWithHistory = cultivatedLeaves.filter((leaf: DerivedLeaf) =>
      filterSproutsByLeaf(history, leaf.id).length > 0
    )
    const unassignedHistory = history.filter(s => !s.leafId || !leafIdSet.has(s.leafId))

    // Update counts (count leaves, not individual sprouts)
    const growingCount = standaloneActive.length + activeLeafIds.size
    const cultivatedCountVal = cultivatedLeavesWithHistory.length + unassignedHistory.length
    activeCount.textContent = `(${growingCount})`
    cultivatedCount.textContent = `(${cultivatedCountVal})`

    // Render Growing column - one card per leaf with active sprout
    let activeHtml = ''

    leaves.forEach((leaf: DerivedLeaf) => {
      if (!activeLeafIds.has(leaf.id)) return
      const leafSprouts = sprouts.filter((s: Sprout) => s.leafId === leaf.id)
      if (leafSprouts.length === 0) return
      activeHtml += renderLeafCard(leaf.id, leafSprouts, true)
    })

    // Standalone active sprouts (no leaf yet)
    activeHtml += standaloneActive.map(s => renderActiveCard(s)).join('')

    activeList.innerHTML = activeHtml || '<p class="empty-message">No growing sprouts</p>'

    // Render Cultivated column - one card per leaf without active sprouts
    let historyHtml = ''

    cultivatedLeavesWithHistory.forEach((leaf: DerivedLeaf) => {
      const leafSprouts = sprouts.filter((s: Sprout) => s.leafId === leaf.id)
      if (leafSprouts.length === 0) return
      historyHtml += renderLeafCard(leaf.id, leafSprouts, false)
    })

    // Unassigned history sprouts (orphaned)
    if (unassignedHistory.length > 0) {
      historyHtml += unassignedHistory.map(s => renderHistoryCard(s)).join('')
    }

    historyList.innerHTML = historyHtml || '<p class="empty-message">No history</p>'
  }

  // --- Delegated click handlers ---

  async function handleDeleteAction(card: HTMLElement): Promise<void> {
    const id = card.dataset.id
    if (!id) return

    const sprouts = getSprouts()
    const sprout = sprouts.find(s => s.id === id)
    if (!sprout) return

    let confirmMsg: string
    if (sprout.state === 'active') {
      const hasLeafHistory = sprout.leafId && sprouts.some(
        s => s.id !== sprout.id && s.leafId === sprout.leafId
      )
      const soilReturn = sprout.soilCost * 0.25
      const soilMsg = soilReturn > 0 ? ` (+${soilReturn} soil returned)` : ''
      confirmMsg = hasLeafHistory
        ? `Are you sure you want to uproot this sprout? This will only affect the most recent part of this leaf's history.${soilMsg}`
        : `Are you sure you want to uproot this sprout?${soilMsg}`
    } else {
      confirmMsg = 'Are you sure you want to prune this leaf? This will remove the entire history of this leaf.'
    }

    const confirmLabel = sprout.state === 'active' ? 'Uproot' : 'Prune'
    const confirmed = await showConfirm(confirmMsg, confirmLabel)
    if (!confirmed) return

    if (sprout.state === 'active') {
      const soilReturn = sprout.soilCost * 0.25
      appendEvent({
        type: 'sprout_uprooted',
        timestamp: new Date().toISOString(),
        sproutId: sprout.id,
        soilReturned: soilReturn,
      })
      callbacks.onSoilChange?.()
    }

    renderSprouts()
  }

  function handleOpenLeafAction(el: HTMLElement, e: MouseEvent): void {
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input') || target.closest('textarea')) return

    const leafId = el.dataset.leafId
    const nodeId = getCurrentNodeId()
    const branchIndex = currentTwigNode?.dataset.branchIndex
    if (leafId && nodeId && branchIndex !== undefined && callbacks.onOpenLeaf) {
      close()
      callbacks.onOpenLeaf(leafId, nodeId, parseInt(branchIndex, 10))
    }
  }

  function handleWaterAction(actionEl: HTMLElement): void {
    // Sprout ID from card (regular water btn) or from data-sprout-id (stacked water btn)
    const card = actionEl.closest('.sprout-card') as HTMLElement | null
    const sproutId = actionEl.dataset.sproutId || card?.dataset.id
    if (!sproutId) return

    const sprouts = getSprouts()
    const sprout = sprouts.find(s => s.id === sproutId)
    if (!sprout) return

    const nodeId = getCurrentNodeId()
    const twigLabel = currentTwigNode?.dataset.defaultLabel || 'Twig'

    if (callbacks.onWaterClick && nodeId) {
      callbacks.onWaterClick({
        id: sprout.id,
        title: sprout.title,
        twigId: nodeId,
        twigLabel,
        season: getSeasonLabel(sprout.season),
      })
    }
  }

  function handleHarvestAction(actionEl: HTMLElement): void {
    const card = actionEl.closest('.sprout-card') as HTMLElement
    const id = card?.dataset.id
    if (!id) return

    const sprouts = getSprouts()
    const sprout = sprouts.find(s => s.id === id)
    if (!sprout) return

    const nodeId = getCurrentNodeId()
    const twigLabel = currentTwigNode?.dataset.defaultLabel || 'Twig'

    if (callbacks.onHarvestClick && nodeId) {
      callbacks.onHarvestClick({
        id: sprout.id,
        title: sprout.title,
        twigId: nodeId,
        twigLabel,
        season: sprout.season,
        environment: sprout.environment,
        soilCost: sprout.soilCost,
        bloomWither: sprout.bloomWither,
        bloomBudding: sprout.bloomBudding,
        bloomFlourish: sprout.bloomFlourish,
      })
    }
  }

  // Single delegated click listener on the container (set up once, not per render)
  container.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement
    const actionEl = target.closest<HTMLElement>('[data-action]')
    if (!actionEl) return

    const action = actionEl.dataset.action
    switch (action) {
      case 'delete': {
        e.stopPropagation()
        const card = actionEl.closest('.sprout-card') as HTMLElement
        if (card) handleDeleteAction(card)
        break
      }
      case 'water': {
        e.stopPropagation()
        handleWaterAction(actionEl)
        break
      }
      case 'harvest': {
        e.stopPropagation()
        handleHarvestAction(actionEl)
        break
      }
      case 'open-leaf': {
        handleOpenLeafAction(actionEl, e)
        break
      }
    }
  })

  function resetForm(): void {
    selectedSeason = null
    selectedEnvironment = null
    sproutTitleInput.value = ''
    witherInput.value = ''
    buddingInput.value = ''
    flourishInput.value = ''
    leafSelect.value = ''
    newLeafNameInput.value = ''
    newLeafNameInput.classList.add('hidden')
    seasonBtns.forEach(btn => btn.classList.remove('is-active'))
    envBtns.forEach(btn => btn.classList.remove('is-active'))
    envHints.forEach(h => h.classList.remove('is-visible'))
    endDateDisplay.textContent = ''
    soilCostDisplay.textContent = ''
    updateFormState()
  }

  // Season selector
  seasonBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const season = btn.dataset.season as SproutSeason
      selectedSeason = selectedSeason === season ? null : season
      seasonBtns.forEach(b => b.classList.toggle('is-active', b.dataset.season === selectedSeason))
      // Update end date display
      if (selectedSeason) {
        const endDate = getEndDate(selectedSeason)
        endDateDisplay.textContent = `Ends on ${formatDate(endDate)}`
      } else {
        endDateDisplay.textContent = ''
      }
      updateFormState()
    })
  })

  // Environment selector
  envBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const env = btn.dataset.env as SproutEnvironment
      selectedEnvironment = selectedEnvironment === env ? null : env
      envBtns.forEach(b => b.classList.toggle('is-active', b.dataset.env === selectedEnvironment))
      envHints.forEach(h => h.classList.toggle('is-visible', h.dataset.for === selectedEnvironment))
      updateFormState()
    })
  })

  // Sprout title input
  sproutTitleInput.addEventListener('input', updateFormState)

  // Leaf select - show/hide new leaf name input
  leafSelect.addEventListener('change', () => {
    if (leafSelect.value === '__new__') {
      newLeafNameInput.classList.remove('hidden')
      newLeafNameInput.focus()
    } else {
      newLeafNameInput.classList.add('hidden')
      newLeafNameInput.value = ''
    }
    updateFormState()
  })

  // New leaf name input validation
  newLeafNameInput.addEventListener('input', updateFormState)

  // Bloom inputs validation
  witherInput.addEventListener('input', updateFormState)
  buddingInput.addEventListener('input', updateFormState)
  flourishInput.addEventListener('input', updateFormState)

  // Set button - create sprout (with double-click prevention)
  setBtn.addEventListener('click', preventDoubleClick(() => {
    if (!selectedSeason || !selectedEnvironment) return
    const title = sproutTitleInput.value.trim()
    if (!title) return

    const cost = calculateSoilCost(selectedSeason, selectedEnvironment)
    if (!canAffordSoil(cost)) return  // Soil will be spent when event is appended

    const nodeId = getCurrentNodeId()
    if (!nodeId) return

    // Determine leaf assignment based on leaf picker
    let leafId: string | undefined
    const leafChoice = leafSelect.value
    if (leafChoice === '__new__') {
      // Create new leaf with the provided name
      const leafName = newLeafNameInput.value.trim() || title
      leafId = generateLeafId()
      // Emit leaf_created event
      appendEvent({
        type: 'leaf_created',
        timestamp: new Date().toISOString(),
        leafId,
        twigId: nodeId,
        name: leafName,
      })
    } else if (leafChoice) {
      // Use existing leaf
      leafId = leafChoice
    }
    // If leafChoice is "", sprout is standalone (no leafId)

    const now = new Date()
    const bloomWither = witherInput.value.trim() || undefined
    const bloomBudding = buddingInput.value.trim() || undefined
    const bloomFlourish = flourishInput.value.trim() || undefined
    const sproutId = generateSproutId()
    const timestamp = now.toISOString()

    // Emit sprout_planted event
    appendEvent({
      type: 'sprout_planted',
      timestamp,
      sproutId,
      twigId: nodeId,
      title,
      season: selectedSeason,
      environment: selectedEnvironment,
      soilCost: cost,
      leafId,
      bloomWither,
      bloomBudding,
      bloomFlourish,
    })

    // State is derived from events, no need to update legacy nodeState
    resetForm()
    renderSprouts()
    callbacks.onSoilChange?.()
  }))

  // Keyboard handler (arrow keys for secret twig navigation)
  function handleKeydown(e: KeyboardEvent): void {
    if (container.classList.contains('hidden')) return

    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopImmediatePropagation()
      close()
      callbacks.onClose()
      return
    }

    if (e.key === 'ArrowLeft' && e.metaKey && callbacks.onNavigate) {
      e.preventDefault()
      const prevTwig = callbacks.onNavigate('prev')
      if (prevTwig) open(prevTwig)
      return
    }

    if (e.key === 'ArrowRight' && e.metaKey && callbacks.onNavigate) {
      e.preventDefault()
      const nextTwig = callbacks.onNavigate('next')
      if (nextTwig) open(nextTwig)
      return
    }
  }
  document.addEventListener('keydown', handleKeydown)

  function populateLeafSelect(): void {
    // Clear existing options except first two (placeholder and new)
    while (leafSelect.options.length > 2) {
      leafSelect.remove(2)
    }
    // Add existing leaves for this twig
    const leaves = getLeaves()
    leaves.forEach((leaf: DerivedLeaf) => {
      const option = document.createElement('option')
      option.value = leaf.id
      option.textContent = leaf.name
      leafSelect.appendChild(option)
    })
    // Reset to placeholder
    leafSelect.selectedIndex = 0
  }

  function open(twigNode: HTMLButtonElement): void {
    currentTwigNode = twigNode
    const nodeId = twigNode.dataset.nodeId
    if (!nodeId) return

    // Labels come from preset constants
    const label = getPresetLabel(nodeId) || twigNode.dataset.defaultLabel || ''

    titleInput.value = label
    noteInput.value = '' // Notes are no longer stored

    resetForm()
    populateLeafSelect()
    renderSprouts()
    container.classList.remove('hidden')
  }

  function close(): void {
    container.classList.add('hidden')
    currentTwigNode = null
  }

  function isOpen(): boolean {
    return !container.classList.contains('hidden')
  }

  function refresh(): void {
    if (isOpen()) {
      renderSprouts()
    }
  }

  return {
    container,
    open,
    close,
    isOpen,
    refresh,
  }
}
