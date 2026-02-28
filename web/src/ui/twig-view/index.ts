import type { TwigViewApi, Sprout, SproutSeason, SproutEnvironment } from '../../types'
import { preventDoubleClick } from '../../utils/debounce'
import { SEASONS, ENVIRONMENTS } from '../../utils/sprout-labels'
import { calculateSoilCost, canAffordSoil, getPresetLabel } from '../../state'
import {
  appendEvent,
  getState,
  getSproutsForTwig,
  getLeavesForTwig,
  toSprout,
  generateSproutId,
  generateLeafId,
  type DerivedLeaf,
} from '../../events'
import { buildPanel, getElements } from './build-panel'
import { createFormState, getCurrentNodeId, getEndDate, formatDate } from './sprout-form'
import { renderHistoryCard, renderActiveCard, renderLeafCard } from './sprout-cards'
import { updateFormState } from './form-validation'
import {
  handleDeleteAction,
  handleOpenLeafAction,
  handleWaterAction,
  handleHarvestAction,
  handleEditAction,
} from './event-handlers'
import { setupConfirmDialog } from './confirm'
import { setupKeyboard } from './keyboard'
import { populateLeafSelect, setupLeafSelect } from './leaf-select'

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
  }

  // Delegated click handler
  container.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement
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
    state.selectedSeason = null
    state.selectedEnvironment = null
    elements.sproutTitleInput.value = ''
    elements.witherInput.value = ''
    elements.buddingInput.value = ''
    elements.flourishInput.value = ''
    elements.leafSelect.value = ''
    elements.newLeafNameInput.value = ''
    elements.newLeafNameInput.classList.add('hidden')
    elements.seasonBtns.forEach((btn) => {
      btn.classList.remove('is-active')
      btn.setAttribute('aria-pressed', 'false')
    })
    elements.envBtns.forEach((btn) => {
      btn.classList.remove('is-active')
      btn.setAttribute('aria-pressed', 'false')
    })
    elements.envHints.forEach((h) => h.classList.remove('is-visible'))
    elements.endDateDisplay.textContent = ''
    elements.soilCostDisplay.textContent = ''
    updateForm()
  }

  // Season selector
  elements.seasonBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const season = btn.dataset.season as SproutSeason
      if (!SEASONS.includes(season)) return
      state.selectedSeason = state.selectedSeason === season ? null : season
      elements.seasonBtns.forEach((b) => {
        const isActive = b.dataset.season === state.selectedSeason
        b.classList.toggle('is-active', isActive)
        b.setAttribute('aria-pressed', String(isActive))
      })
      if (state.selectedSeason) {
        const endDate = getEndDate(state.selectedSeason)
        elements.endDateDisplay.textContent = `Ends on ${formatDate(endDate)}`
      } else {
        elements.endDateDisplay.textContent = ''
      }
      updateForm()
    })
  })

  // Environment selector
  elements.envBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const env = btn.dataset.env as SproutEnvironment
      if (!ENVIRONMENTS.includes(env)) return
      state.selectedEnvironment = state.selectedEnvironment === env ? null : env
      elements.envBtns.forEach((b) => {
        const isActive = b.dataset.env === state.selectedEnvironment
        b.classList.toggle('is-active', isActive)
        b.setAttribute('aria-pressed', String(isActive))
      })
      elements.envHints.forEach((h) =>
        h.classList.toggle('is-visible', h.dataset.for === state.selectedEnvironment),
      )
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

      resetForm()
      renderSprouts()
      callbacks.onSoilChange?.()
    }),
  )

  setupKeyboard(container, callbacks, open, close)

  function doPopulateLeafSelect(): void {
    populateLeafSelect(elements.leafSelect, getLeaves)
  }

  function open(twigNode: HTMLButtonElement): void {
    state.currentTwigNode = twigNode
    const nodeId = twigNode.dataset.nodeId
    if (!nodeId) return

    const label = getPresetLabel(nodeId) || twigNode.dataset.defaultLabel || ''
    elements.titleInput.value = label
    elements.noteInput.value = ''

    resetForm()
    doPopulateLeafSelect()
    renderSprouts()
    container.classList.remove('hidden')
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
  }
}
