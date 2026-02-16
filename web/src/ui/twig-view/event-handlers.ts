import type { Sprout, SproutSeason, SproutEnvironment } from '../../types'
import type { FormState } from './sprout-form'
import { SOIL_UPROOT_REFUND_RATE } from '../../generated/constants'
import { appendEvent, getState, getSproutsForTwig, toSprout } from '../../events'

type HandlerCallbacks = {
  onSoilChange?: () => void
  onOpenLeaf?: (leafId: string, twigId: string, branchIndex: number) => void
  onWaterClick?: (sprout: { id: string, title: string }) => void
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
  renderSprouts: () => void
): Promise<void> {
  const id = card.dataset.id
  if (!id) return

  const sprouts = getSprouts(state)
  const sprout = sprouts.find(s => s.id === id)
  if (!sprout || sprout.state !== 'active') return

  const hasLeafHistory = sprout.leafId && sprouts.some(
    s => s.id !== sprout.id && s.leafId === sprout.leafId
  )
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
  close: () => void
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
  callbacks: HandlerCallbacks
): void {
  if (!callbacks.onWaterClick) return
  const card = actionEl.closest('.sprout-card') as HTMLElement
  const id = card?.dataset.id
  if (!id) return

  const sprouts = getSprouts(state)
  const sprout = sprouts.find(s => s.id === id)
  if (!sprout) return

  callbacks.onWaterClick({ id: sprout.id, title: sprout.title })
}

/**
 * Handles harvest button click on a ready sprout card.
 */
export function handleHarvestAction(
  actionEl: HTMLElement,
  state: FormState,
  callbacks: HandlerCallbacks
): void {
  const card = actionEl.closest('.sprout-card') as HTMLElement
  const id = card?.dataset.id
  if (!id) return

  const sprouts = getSprouts(state)
  const sprout = sprouts.find(s => s.id === id)
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
