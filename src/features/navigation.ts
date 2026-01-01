import type { AppContext, ViewMode } from '../types'
import { ZOOM_TRANSITION_DURATION, EDITOR_OPEN_DELAY } from '../constants'
import { getViewMode, setViewModeState, getActiveBranchIndex, getHoveredBranchIndex, getFocusedNode, isBranchView } from '../state'
import {
  setNodeVisibility,
  setFocusedNode,
  updateFocus,
  getNodePlaceholder,
} from '../ui/node-ui'
import { animateGuideLines } from '../ui/layout'

let zoomTimeoutId = 0

export type NavigationCallbacks = {
  onPositionNodes: () => void
  onUpdateStats: () => void
}

export function updateVisibility(ctx: AppContext): void {
  const { canvas, trunk } = ctx.elements
  const { branchGroups } = ctx
  const activeBranchIndex = getActiveBranchIndex()
  const hoveredBranchIndex = getHoveredBranchIndex()
  const isBranch = isBranchView()
  const isPreview = !isBranch && hoveredBranchIndex !== null

  canvas.classList.toggle('is-zoomed', isBranch)
  canvas.classList.toggle('is-previewing', isPreview)
  trunk.classList.toggle('is-minimized', isBranch)

  if (isBranch && activeBranchIndex !== null) {
    trunk.style.setProperty('--minimized-x', '50%')
    trunk.style.setProperty('--minimized-y', '50%')
  } else {
    trunk.style.removeProperty('--minimized-x')
    trunk.style.removeProperty('--minimized-y')
  }

  branchGroups.forEach((branchGroup, index) => {
    const isActive = isBranch && index === activeBranchIndex
    const isPreviewed = !isBranch && hoveredBranchIndex === index
    branchGroup.group.classList.toggle('is-hidden', isBranch && !isActive)
    branchGroup.group.classList.toggle('is-active', isActive)
    branchGroup.group.classList.toggle('is-preview', isPreviewed)

    setNodeVisibility(branchGroup.branch, !isBranch || isActive)
    branchGroup.leaves.forEach((leaf) => {
      const shouldShow = isBranch ? isActive : isPreviewed
      setNodeVisibility(leaf, shouldShow)
    })
  })

}

export function setViewMode(
  mode: ViewMode,
  ctx: AppContext,
  callbacks: NavigationCallbacks,
  branchIndex?: number
): void {
  const previousMode = getViewMode()
  const previousBranch = getActiveBranchIndex()

  setViewModeState(mode, branchIndex)

  const shouldAnimate = previousMode !== mode || previousBranch !== getActiveBranchIndex()

  if (shouldAnimate) {
    ctx.elements.canvas.classList.add('is-zooming')
    if (zoomTimeoutId) {
      window.clearTimeout(zoomTimeoutId)
    }
    zoomTimeoutId = window.setTimeout(() => {
      ctx.elements.canvas.classList.remove('is-zooming')
    }, ZOOM_TRANSITION_DURATION)
  }

  ctx.editor.close()
  updateVisibility(ctx)
  callbacks.onPositionNodes()
  if (shouldAnimate) {
    animateGuideLines(ctx)
  }
}

export function returnToOverview(
  ctx: AppContext,
  callbacks: NavigationCallbacks
): void {
  const focusedNode = getFocusedNode()
  const fallback =
    focusedNode?.dataset.branchIndex !== undefined
      ? ctx.branchGroups[Number(focusedNode.dataset.branchIndex)]?.branch ?? null
      : focusedNode

  setViewMode('overview', ctx, callbacks)

  if (fallback) {
    setFocusedNode(fallback, ctx, (target) => updateFocus(target, ctx))
  } else {
    updateFocus(null, ctx)
  }
}

export function enterBranchView(
  index: number,
  ctx: AppContext,
  callbacks: NavigationCallbacks,
  focusNode?: HTMLButtonElement | null,
  openEditor = false
): void {
  setViewMode('branch', ctx, callbacks, index)

  const target = focusNode ?? ctx.branchGroups[index]?.branch ?? null
  if (!target) return

  setFocusedNode(target, ctx, (t) => updateFocus(t, ctx))

  if (openEditor) {
    window.setTimeout(() => {
      ctx.editor.open(target, getNodePlaceholder(target))
    }, EDITOR_OPEN_DELAY)
  }
}

export function findNextOpenNode(
  allNodes: HTMLButtonElement[],
  startFrom?: HTMLButtonElement | null
): HTMLButtonElement | null {
  if (!allNodes.length) return null

  const startIndex = startFrom ? allNodes.indexOf(startFrom) : -1

  for (let offset = 1; offset <= allNodes.length; offset += 1) {
    const index = (startIndex + offset + allNodes.length) % allNodes.length
    const candidate = allNodes[index]
    if (candidate.dataset.filled !== 'true') {
      return candidate
    }
  }

  return null
}

export function openNodeForEditing(
  node: HTMLButtonElement,
  ctx: AppContext,
  callbacks: NavigationCallbacks
): void {
  const branchIndex = node.dataset.branchIndex
  const isTrunk = node.dataset.nodeId === 'trunk'
  const viewMode = getViewMode()
  const activeBranchIndex = getActiveBranchIndex()

  if (branchIndex !== undefined) {
    const index = Number(branchIndex)
    if (viewMode !== 'branch' || activeBranchIndex !== index) {
      enterBranchView(index, ctx, callbacks, node, true)
      return
    }
  } else if (isTrunk && viewMode === 'branch') {
    setViewMode('overview', ctx, callbacks)
    window.setTimeout(() => {
      setFocusedNode(node, ctx, (t) => updateFocus(t, ctx))
      ctx.editor.open(node, getNodePlaceholder(node))
    }, EDITOR_OPEN_DELAY)
    return
  }

  setFocusedNode(node, ctx, (t) => updateFocus(t, ctx))
  node.focus({ preventScroll: true })
  ctx.editor.open(node, getNodePlaceholder(node))
}
