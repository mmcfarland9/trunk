import type { Sprout, SproutSeason, SproutEnvironment } from '../../types'
import type { FormState } from './sprout-form'
import type { SproutEditedEvent } from '../../events/types'
import {
  SOIL_UPROOT_REFUND_RATE,
  MAX_TITLE_LENGTH,
  MAX_BLOOM_LENGTH,
} from '../../generated/constants'
import { appendEvent, getState, getSproutsForTwig, getLeavesForTwig, toSprout } from '../../events'
import { escapeHtml } from '../../utils/escape-html'
import { getSeasonLabel, getEnvironmentLabel } from '../../utils/sprout-labels'

type HandlerCallbacks = {
  onSoilChange?: () => void
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

type ConfirmDialog = {
  show: (message: string, confirmLabel?: string) => Promise<boolean>
}

/**
 * Gets sprouts for the current twig from the form state.
 */
function getSprouts(state: FormState): Sprout[] {
  const nodeId = state.currentTwigNode?.dataset.nodeId
  if (!nodeId) return []
  const derivedState = getState()
  const derivedSprouts = getSproutsForTwig(derivedState, nodeId)
  return derivedSprouts.map(toSprout)
}

/**
 * Handles delete (uproot) action on an active sprout card.
 */
export async function handleDeleteAction(
  card: HTMLElement,
  state: FormState,
  confirmDialog: ConfirmDialog,
  callbacks: HandlerCallbacks,
  renderSprouts: () => void,
): Promise<void> {
  const id = card.dataset.id
  if (!id) return

  const sprouts = getSprouts(state)
  const sprout = sprouts.find((s) => s.id === id)
  if (!sprout || sprout.state !== 'active') return

  const hasLeafHistory =
    sprout.leafId && sprouts.some((s) => s.id !== sprout.id && s.leafId === sprout.leafId)
  const soilReturn = sprout.soilCost * SOIL_UPROOT_REFUND_RATE
  const soilMsg = soilReturn > 0 ? ` (+${soilReturn} soil returned)` : ''
  const confirmMsg = hasLeafHistory
    ? `Are you sure you want to uproot this sprout? This will only affect the most recent part of this leaf's history.${soilMsg}`
    : `Are you sure you want to uproot this sprout?${soilMsg}`

  const confirmed = await confirmDialog.show(confirmMsg, 'Uproot')
  if (!confirmed) return

  appendEvent({
    type: 'sprout_uprooted',
    timestamp: new Date().toISOString(),
    sproutId: sprout.id,
    soilReturned: soilReturn,
  })
  callbacks.onSoilChange?.()
  renderSprouts()
}

/**
 * Handles opening a leaf view.
 */
export function handleOpenLeafAction(
  el: HTMLElement,
  e: MouseEvent,
  state: FormState,
  callbacks: HandlerCallbacks,
  close: () => void,
): void {
  const target = e.target as HTMLElement
  if (target.closest('button') || target.closest('input') || target.closest('textarea')) return

  const leafId = el.dataset.leafId
  const nodeId = state.currentTwigNode?.dataset.nodeId
  const branchIndex = state.currentTwigNode?.dataset.branchIndex
  if (leafId && nodeId && branchIndex !== undefined && callbacks.onOpenLeaf) {
    close()
    callbacks.onOpenLeaf(leafId, nodeId, parseInt(branchIndex, 10))
  }
}

/**
 * Handles water button click on an active sprout card.
 */
export function handleWaterAction(
  actionEl: HTMLElement,
  state: FormState,
  callbacks: HandlerCallbacks,
): void {
  if (!callbacks.onWaterClick) return
  const card = actionEl.closest('.sprout-card') as HTMLElement
  const id = card?.dataset.id
  if (!id) return

  const sprouts = getSprouts(state)
  const sprout = sprouts.find((s) => s.id === id)
  if (!sprout) return

  callbacks.onWaterClick({ id: sprout.id, title: sprout.title })
}

/**
 * Handles harvest button click on a ready sprout card.
 */
export function handleHarvestAction(
  actionEl: HTMLElement,
  state: FormState,
  callbacks: HandlerCallbacks,
): void {
  const card = actionEl.closest('.sprout-card') as HTMLElement
  const id = card?.dataset.id
  if (!id) return

  const sprouts = getSprouts(state)
  const sprout = sprouts.find((s) => s.id === id)
  if (!sprout) return

  const nodeId = state.currentTwigNode?.dataset.nodeId
  const twigLabel = state.currentTwigNode?.dataset.defaultLabel || 'Twig'

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

/**
 * Handles edit button click on an active sprout card.
 * Replaces card content with an inline edit form.
 */
export function handleEditAction(
  card: HTMLElement,
  state: FormState,
  renderSprouts: () => void,
): void {
  const id = card.dataset.id
  if (!id) return

  const sprouts = getSprouts(state)
  const sprout = sprouts.find((s) => s.id === id)
  if (!sprout || sprout.state !== 'active') return

  const nodeId = state.currentTwigNode?.dataset.nodeId
  if (!nodeId) return

  // Build leaf options from the current twig
  const derivedState = getState()
  const leaves = getLeavesForTwig(derivedState, nodeId)
  const leafOptions = leaves
    .map(
      (l) =>
        `<option value="${escapeHtml(l.id)}" ${l.id === sprout.leafId ? 'selected' : ''}>${escapeHtml(l.name)}</option>`,
    )
    .join('')

  card.innerHTML = `
    <div class="sprout-edit-form">
      <p class="sprout-edit-readonly">${escapeHtml(getSeasonLabel(sprout.season))} · ${escapeHtml(getEnvironmentLabel(sprout.environment))}</p>
      <input type="text" class="edit-title" value="${escapeHtml(sprout.title)}" placeholder="Title" maxlength="${MAX_TITLE_LENGTH}" />
      <input type="text" class="edit-wither" value="${escapeHtml(sprout.bloomWither || '')}" placeholder="🥀 Wither" maxlength="${MAX_BLOOM_LENGTH}" />
      <input type="text" class="edit-budding" value="${escapeHtml(sprout.bloomBudding || '')}" placeholder="🌱 Budding" maxlength="${MAX_BLOOM_LENGTH}" />
      <input type="text" class="edit-flourish" value="${escapeHtml(sprout.bloomFlourish || '')}" placeholder="🌲 Flourish" maxlength="${MAX_BLOOM_LENGTH}" />
      <select class="edit-leaf">${leafOptions}</select>
      <div class="sprout-edit-actions">
        <button type="button" class="action-btn action-btn-passive action-btn-neutral edit-cancel-btn">Cancel</button>
        <button type="button" class="action-btn action-btn-progress action-btn-twig edit-save-btn">Save</button>
      </div>
    </div>
  `

  const titleInput = card.querySelector<HTMLInputElement>('.edit-title')!
  const witherInput = card.querySelector<HTMLInputElement>('.edit-wither')!
  const buddingInput = card.querySelector<HTMLInputElement>('.edit-budding')!
  const flourishInput = card.querySelector<HTMLInputElement>('.edit-flourish')!
  const leafSelect = card.querySelector<HTMLSelectElement>('.edit-leaf')!
  const cancelBtn = card.querySelector<HTMLButtonElement>('.edit-cancel-btn')!
  const saveBtn = card.querySelector<HTMLButtonElement>('.edit-save-btn')!

  titleInput.focus()

  cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    renderSprouts()
  })

  saveBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    const newTitle = titleInput.value.trim()
    if (!newTitle) return

    // Build sparse update — only include fields that changed
    const event: SproutEditedEvent = {
      type: 'sprout_edited',
      timestamp: new Date().toISOString(),
      sproutId: sprout.id,
    }

    if (newTitle !== sprout.title) event.title = newTitle
    const newWither = witherInput.value.trim() || undefined
    if (newWither !== (sprout.bloomWither || undefined)) event.bloomWither = newWither
    const newBudding = buddingInput.value.trim() || undefined
    if (newBudding !== (sprout.bloomBudding || undefined)) event.bloomBudding = newBudding
    const newFlourish = flourishInput.value.trim() || undefined
    if (newFlourish !== (sprout.bloomFlourish || undefined)) event.bloomFlourish = newFlourish
    const newLeafId = leafSelect.value
    if (newLeafId !== sprout.leafId) event.leafId = newLeafId

    // Only emit if something actually changed
    const hasChanges =
      event.title !== undefined ||
      event.bloomWither !== undefined ||
      event.bloomBudding !== undefined ||
      event.bloomFlourish !== undefined ||
      event.leafId !== undefined

    if (hasChanges) {
      appendEvent(event)
    }

    renderSprouts()
  })
}
