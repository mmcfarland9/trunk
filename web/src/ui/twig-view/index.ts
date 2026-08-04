import {
  appendEvent,
  type DerivedLeaf,
  type DerivedSprout,
  generateLeafId,
  generateSproutId,
  getLeafById,
  getLeavesForTwig,
  getSeedlingsForTwig,
  getSproutsByLeaf,
  getSproutsForTwig,
  getState,
  toSprout,
} from '../../events'
import { calculateSoilCost, canAffordSoil, getPresetLabel, getPresetNote } from '../../state'
import type { Sprout, SproutEnvironment, SproutSeason, TwigViewApi } from '../../types'
import { preventDoubleClick } from '../../utils/debounce'
import { ENVIRONMENTS, SEASONS } from '../../utils/sprout-labels'
import { buildPanel, getElements } from './build-panel'
import { setupConfirmDialog } from './confirm'
import {
  handleDeleteAction,
  handleEditAction,
  handleHarvestAction,
  handleOpenLeafAction,
  handleWaterAction,
} from './event-handlers'
import { updateFormState } from './form-validation'
import { setupKeyboard } from './keyboard'
import { populateLeafSelect, setupLeafSelect } from './leaf-select'
import {
  createSeedling,
  deleteSeedling,
  getSeedlingById,
  handleSeedlingDeleteClick,
  renderSeedlings,
  startInlineSeedlingEdit,
} from './seedlings'
import { renderActiveCard, renderHistoryCard, renderLeafCard } from './sprout-cards'
import { createFormState, formatDate, getCurrentNodeId, getEndDate } from './sprout-form'

type TwigViewCallbacks = {
  onClose: () => void
  onSave: () => void
  onSoilChange?: () => void
  onNavigate?: (direction: 'prev' | 'next') => HTMLButtonElement | null
  onOpenLeaf?: (leafId: string, twigId: string, branchIndex: number) => void
  onWaterClick?: (sprout: { id: string; title: string }) => void
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
    leafId?: string
  }) => void
}

export function buildTwigView(mapPanel: HTMLElement, callbacks: TwigViewCallbacks): TwigViewApi {
  const container = buildPanel(mapPanel)
  const elements = getElements(container)
  const state = createFormState()

  const showConfirm = setupConfirmDialog(elements, state)

  // Helper functions
  function getSprouts(): Sprout[] {
    const nodeId = getCurrentNodeId(state)
    if (!nodeId) return []
    const derivedState = getState()
    const derivedSprouts = getSproutsForTwig(derivedState, nodeId)
    return derivedSprouts.map(toSprout)
  }

  function getActiveSprouts(sprouts: Sprout[]): Sprout[] {
    return sprouts.filter((s) => s.state === 'active')
  }

  function getHistorySprouts(sprouts: Sprout[]): Sprout[] {
    return sprouts.filter((s) => s.state === 'completed')
  }

  function getLeaves(): DerivedLeaf[] {
    const nodeId = getCurrentNodeId(state)
    if (!nodeId) return []
    const derivedState = getState()
    return getLeavesForTwig(derivedState, nodeId)
  }

  function filterSproutsByLeaf(sprouts: Sprout[], leafId: string): Sprout[] {
    return sprouts.filter((s) => s.leafId === leafId)
  }

  function updateForm(): void {
    updateFormState(state, {
      sproutTitleInput: elements.sproutTitleInput,
      leafSelect: elements.leafSelect,
      newLeafNameInput: elements.newLeafNameInput,
      witherInput: elements.witherInput,
      buddingInput: elements.buddingInput,
      flourishInput: elements.flourishInput,
      soilCostDisplay: elements.soilCostDisplay,
      setBtn: elements.setBtn,
    })
  }

  function renderSprouts(): void {
    const sprouts = getSprouts()
    const active = getActiveSprouts(sprouts)
    const history = getHistorySprouts(sprouts)

    const leaves = getLeaves()
    const leafIdSet = new Set(leaves.map((l: DerivedLeaf) => l.id))

    const activeLeafIds = new Set(active.filter((s) => s.leafId).map((s) => s.leafId!))

    const standaloneActive = active.filter((s) => !s.leafId || !leafIdSet.has(s.leafId))

    const cultivatedLeaves = leaves.filter((l) => !activeLeafIds.has(l.id))
    const cultivatedLeavesWithHistory = cultivatedLeaves.filter(
      (leaf: DerivedLeaf) => filterSproutsByLeaf(history, leaf.id).length > 0,
    )
    const unassignedHistory = history.filter((s) => !s.leafId || !leafIdSet.has(s.leafId))

    const growingCount = standaloneActive.length + activeLeafIds.size
    const cultivatedCountVal = cultivatedLeavesWithHistory.length + unassignedHistory.length
    elements.activeCount.textContent = `(${growingCount})`
    elements.cultivatedCount.textContent = `(${cultivatedCountVal})`

    let activeHtml = ''
    leaves.forEach((leaf: DerivedLeaf) => {
      if (!activeLeafIds.has(leaf.id)) return
      const leafSprouts = sprouts.filter((s: Sprout) => s.leafId === leaf.id)
      if (leafSprouts.length === 0) return
      activeHtml += renderLeafCard(leaf.id, leafSprouts, true)
    })
    activeHtml += standaloneActive.map((s) => renderActiveCard(s)).join('')
    elements.activeList.innerHTML = activeHtml || '<p class="empty-message">No growing sprouts</p>'

    let historyHtml = ''
    cultivatedLeavesWithHistory.forEach((leaf: DerivedLeaf) => {
      const leafSprouts = sprouts.filter((s: Sprout) => s.leafId === leaf.id)
      if (leafSprouts.length === 0) return
      historyHtml += renderLeafCard(leaf.id, leafSprouts, false)
    })
    if (unassignedHistory.length > 0) {
      historyHtml += unassignedHistory.map((s) => renderHistoryCard(s)).join('')
    }
    elements.historyList.innerHTML = historyHtml || '<p class="empty-message">No history</p>'

    renderSeedlingsList()
  }

  function renderSeedlingsList(): void {
    const nodeId = getCurrentNodeId(state)
    if (!nodeId) return
    const stateObj = getState()
    const seedlings = getSeedlingsForTwig(stateObj, nodeId)
    elements.seedlingsCount.textContent = `(${seedlings.length})`
    elements.seedlingsList.innerHTML = renderSeedlings(nodeId)
  }

  /** Show or hide the draft form's detail fields (leaf, season, environment, bloom). */
  function setDraftExpanded(expanded: boolean): void {
    elements.draftForm.classList.toggle('is-collapsed', !expanded)
    elements.draftToggle.setAttribute('aria-expanded', String(expanded))
    elements.draftToggle.textContent = expanded ? '−' : '+'
    elements.draftToggle.setAttribute(
      'aria-label',
      expanded ? 'Collapse sprout form' : 'Expand sprout form',
    )
  }

  /** Applies a season selection to state + button UI (null clears the selection). */
  function applySeasonSelection(season: SproutSeason | null): void {
    state.selectedSeason = season
    elements.seasonBtns.forEach((b) => {
      const isActive = b.dataset.season === season
      b.classList.toggle('is-active', isActive)
      b.setAttribute('aria-pressed', String(isActive))
    })
    elements.endDateDisplay.textContent = season ? `Ends on ${formatDate(getEndDate(season))}` : ''
  }

  /** Applies an environment selection to state + button/hint UI (null clears it). */
  function applyEnvironmentSelection(environment: SproutEnvironment | null): void {
    state.selectedEnvironment = environment
    elements.envBtns.forEach((b) => {
      const isActive = b.dataset.env === environment
      b.classList.toggle('is-active', isActive)
      b.setAttribute('aria-pressed', String(isActive))
    })
    for (const h of elements.envHints) {
      h.classList.toggle('is-visible', h.dataset.for === environment)
    }
  }

  function prefillPlantFromSeedling(seedlingId: string): void {
    const seedling = getSeedlingById(seedlingId)
    if (!seedling) return
    state.plantingSeedlingId = seedlingId
    setDraftExpanded(true)
    elements.sproutTitleInput.value = seedling.title
    elements.sproutTitleInput.focus()
    updateForm()
  }

  /** Returns the most recently planted sprout on a leaf, whatever its state. */
  function findLatestSproutOnLeaf(leafId: string): DerivedSprout | null {
    const sprouts = getSproutsByLeaf(getState(), leafId)
    let latest: DerivedSprout | null = null
    for (const sprout of sprouts) {
      if (!latest || sprout.plantedAt > latest.plantedAt) latest = sprout
    }
    return latest
  }

  /**
   * Continues a leaf: expands the draft form, preselects the leaf, and seeds the
   * fields from that leaf's most recent sprout. Everything stays editable.
   */
  function prefillPlantFromLeaf(leafId: string): void {
    if (!getLeafById(getState(), leafId)) return

    // The select is populated per-twig in open(); if this leaf's option isn't
    // there yet, repopulate first or the value assignment silently no-ops.
    const hasOption = Array.from(elements.leafSelect.options).some((o) => o.value === leafId)
    if (!hasOption) doPopulateLeafSelect()

    state.plantingSeedlingId = null
    setDraftExpanded(true)

    elements.leafSelect.value = leafId
    elements.newLeafNameInput.value = ''
    elements.newLeafNameInput.classList.add('hidden')

    const source = findLatestSproutOnLeaf(leafId)
    if (source) {
      elements.sproutTitleInput.value = source.title
      elements.witherInput.value = source.bloomWither ?? ''
      elements.buddingInput.value = source.bloomBudding ?? ''
      elements.flourishInput.value = source.bloomFlourish ?? ''
      applySeasonSelection(source.season)
      applyEnvironmentSelection(source.environment)
    }

    updateForm()
    elements.sproutTitleInput.focus()
  }

  // Delegated click handler
  container.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement

    // Seedling actions
    const seedlingActionEl = target.closest<HTMLElement>('[data-seedling-action]')
    if (seedlingActionEl) {
      const seedlingCard = seedlingActionEl.closest<HTMLElement>('.seedling-card')
      const seedlingId = seedlingCard?.dataset.seedlingId
      if (!seedlingId) return
      const seedlingAction = seedlingActionEl.dataset.seedlingAction

      switch (seedlingAction) {
        case 'delete':
          handleSeedlingDeleteClick(seedlingActionEl, seedlingId, renderSeedlingsList)
          break
        case 'plant':
          prefillPlantFromSeedling(seedlingId)
          break
        case 'edit':
          if (seedlingCard) startInlineSeedlingEdit(seedlingCard, seedlingId, renderSeedlingsList)
          break
      }
      return
    }

    const actionEl = target.closest<HTMLElement>('[data-action]')
    if (!actionEl) return

    const action = actionEl.dataset.action
    switch (action) {
      case 'delete': {
        e.stopPropagation()
        const card = actionEl.closest('.sprout-card') as HTMLElement
        if (card) {
          handleDeleteAction(card, state, { show: showConfirm }, callbacks, renderSprouts)
        }
        break
      }
      case 'water': {
        e.stopPropagation()
        handleWaterAction(actionEl, state, callbacks)
        break
      }
      case 'harvest': {
        e.stopPropagation()
        handleHarvestAction(actionEl, state, callbacks)
        break
      }
      case 'continue-leaf': {
        // stopPropagation matters: the card itself carries data-action="open-leaf",
        // so without it the leaf log would open on top of the prefilled form.
        e.stopPropagation()
        const leafId = actionEl.dataset.leafId
        if (leafId) prefillPlantFromLeaf(leafId)
        break
      }
      case 'edit': {
        e.stopPropagation()
        const card = actionEl.closest('.sprout-card') as HTMLElement
        if (card) {
          handleEditAction(card, state, renderSprouts)
        }
        break
      }
      case 'open-leaf': {
        handleOpenLeafAction(actionEl, e, state, callbacks, close)
        break
      }
    }
  })

  function resetForm(): void {
    state.plantingSeedlingId = null
    elements.sproutTitleInput.value = ''
    elements.witherInput.value = ''
    elements.buddingInput.value = ''
    elements.flourishInput.value = ''
    elements.leafSelect.value = ''
    elements.newLeafNameInput.value = ''
    elements.newLeafNameInput.classList.add('hidden')
    applySeasonSelection(null)
    applyEnvironmentSelection(null)
    elements.soilCostDisplay.textContent = ''
    setDraftExpanded(false)
    updateForm()
  }

  // Expand the draft form on any engagement with it, and let the toggle close it.
  elements.sproutTitleInput.addEventListener('focus', () => setDraftExpanded(true))
  elements.draftToggle.addEventListener('click', () => {
    const expanded = elements.draftForm.classList.contains('is-collapsed')
    setDraftExpanded(expanded)
    if (expanded) elements.sproutTitleInput.focus()
  })

  // Season selector
  elements.seasonBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const season = btn.dataset.season as SproutSeason
      if (!SEASONS.includes(season)) return
      applySeasonSelection(state.selectedSeason === season ? null : season)
      updateForm()
    })
  })

  // Environment selector
  elements.envBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const env = btn.dataset.env as SproutEnvironment
      if (!ENVIRONMENTS.includes(env)) return
      applyEnvironmentSelection(state.selectedEnvironment === env ? null : env)
      updateForm()
    })
  })

  // Form inputs
  elements.sproutTitleInput.addEventListener('input', updateForm)
  setupLeafSelect(elements.leafSelect, elements.newLeafNameInput, updateForm)
  elements.newLeafNameInput.addEventListener('input', updateForm)
  elements.witherInput.addEventListener('input', updateForm)
  elements.buddingInput.addEventListener('input', updateForm)
  elements.flourishInput.addEventListener('input', updateForm)

  // Seedling add input
  elements.seedlingsAddInput.addEventListener('input', () => {
    elements.seedlingsAddBtn.disabled = !elements.seedlingsAddInput.value.trim()
  })

  elements.seedlingsAddBtn.addEventListener('click', () => {
    const title = elements.seedlingsAddInput.value.trim()
    if (!title) return
    const nodeId = getCurrentNodeId(state)
    if (!nodeId) return
    createSeedling(nodeId, title)
    elements.seedlingsAddInput.value = ''
    elements.seedlingsAddBtn.disabled = true
    renderSeedlingsList()
  })

  elements.seedlingsAddInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      elements.seedlingsAddBtn.click()
    }
  })

  // Set button - create sprout
  elements.setBtn.addEventListener(
    'click',
    preventDoubleClick(() => {
      if (!state.selectedSeason || !state.selectedEnvironment) return
      const title = elements.sproutTitleInput.value.trim()
      if (!title) return

      const cost = calculateSoilCost(state.selectedSeason, state.selectedEnvironment)
      if (!canAffordSoil(cost)) return

      const nodeId = getCurrentNodeId(state)
      if (!nodeId) return

      let leafId: string
      const leafChoice = elements.leafSelect.value
      if (leafChoice === '__new__') {
        const leafName = elements.newLeafNameInput.value.trim() || title
        leafId = generateLeafId()
        appendEvent({
          type: 'leaf_created',
          timestamp: new Date().toISOString(),
          leafId,
          twigId: nodeId,
          name: leafName,
        })
      } else if (leafChoice) {
        leafId = leafChoice
      } else {
        return
      }

      const now = new Date()
      const bloomWither = elements.witherInput.value.trim() || undefined
      const bloomBudding = elements.buddingInput.value.trim() || undefined
      const bloomFlourish = elements.flourishInput.value.trim() || undefined
      const sproutId = generateSproutId()
      const timestamp = now.toISOString()

      appendEvent({
        type: 'sprout_planted',
        timestamp,
        sproutId,
        twigId: nodeId,
        title,
        season: state.selectedSeason,
        environment: state.selectedEnvironment,
        soilCost: cost,
        leafId,
        bloomWither,
        bloomBudding,
        bloomFlourish,
      })

      if (state.plantingSeedlingId) {
        deleteSeedling(state.plantingSeedlingId)
      }

      resetForm()
      renderSprouts()
      callbacks.onSoilChange?.()
    }),
  )

  const cleanupKeyboard = setupKeyboard(container, callbacks, open, close)

  function doPopulateLeafSelect(): void {
    populateLeafSelect(elements.leafSelect, getLeaves)
  }

  function open(twigNode: HTMLButtonElement): void {
    state.currentTwigNode = twigNode
    const nodeId = twigNode.dataset.nodeId
    if (!nodeId) return

    const label = getPresetLabel(nodeId) || twigNode.dataset.defaultLabel || ''
    elements.titleInput.value = label
    elements.noteInput.value = getPresetNote(nodeId) || ''

    resetForm()
    doPopulateLeafSelect()
    renderSprouts()
    container.classList.remove('hidden')

    // Auto-size the readonly subtitle now that the panel is visible, so a
    // wrapped note never clips (measuring while hidden returns scrollHeight 0).
    elements.noteInput.style.height = 'auto'
    elements.noteInput.style.height = `${elements.noteInput.scrollHeight}px`
  }

  function close(): void {
    container.classList.add('hidden')
    state.currentTwigNode = null
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
    cleanup: cleanupKeyboard,
    prefillPlantFromSeedling,
    prefillPlantFromLeaf,
  }
}
