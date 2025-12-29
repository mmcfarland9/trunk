import type { AppContext, ViewMode } from '../types'
import {
  getViewMode,
  setViewModeState,
  getActiveBranchIndex,
  getHoveredBranchIndex,
  getFocusedCircle,
  isBranchView,
} from '../state'
import {
  setCircleVisibility,
  setFocusedCircle,
  updateFocus,
  getCirclePlaceholder,
  animateGuideLines,
} from '../ui'

let zoomTimeoutId = 0

export type NavigationCallbacks = {
  onPositionNodes: () => void
  onUpdateStats: () => void
}

export function updateVisibility(ctx: AppContext): void {
  const { canvas, center } = ctx.elements
  const { branches } = ctx
  const activeBranchIndex = getActiveBranchIndex()
  const hoveredBranchIndex = getHoveredBranchIndex()
  const isBranch = isBranchView()
  const isPreview = !isBranch && hoveredBranchIndex !== null

  canvas.classList.toggle('is-zoomed', isBranch)
  canvas.classList.toggle('is-previewing', isPreview)
  center.classList.toggle('is-minimized', isBranch)

  // Keep the minimized trunk centered; camera handles the pan
  if (isBranch && activeBranchIndex !== null) {
    center.style.setProperty('--minimized-x', '50%')
    center.style.setProperty('--minimized-y', '50%')
  } else {
    center.style.removeProperty('--minimized-x')
    center.style.removeProperty('--minimized-y')
  }

  branches.forEach((branch, index) => {
    const isActive = isBranch && index === activeBranchIndex
    const isPreviewed = !isBranch && hoveredBranchIndex === index
    branch.wrapper.classList.toggle('is-hidden', isBranch && !isActive)
    branch.wrapper.classList.toggle('is-active', isActive)
    branch.wrapper.classList.toggle('is-preview', isPreviewed)

    setCircleVisibility(branch.main, !isBranch || isActive)
    branch.subs.forEach((sub) => {
      const shouldShow = isBranch ? isActive : isPreviewed
      setCircleVisibility(sub, shouldShow)
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
    }, 420)
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
  const focusedCircle = getFocusedCircle()
  const fallback =
    focusedCircle?.dataset.branchIndex !== undefined
      ? ctx.branches[Number(focusedCircle.dataset.branchIndex)]?.main ?? null
      : focusedCircle

  setViewMode('overview', ctx, callbacks)

  if (fallback) {
    setFocusedCircle(fallback, ctx, (target) => updateFocus(target, ctx))
  } else {
    updateFocus(null, ctx)
  }
}

export function enterBranchView(
  index: number,
  ctx: AppContext,
  callbacks: NavigationCallbacks,
  focusCircle?: HTMLButtonElement | null,
  openEditor = false
): void {
  setViewMode('branch', ctx, callbacks, index)

  const target = focusCircle ?? ctx.branches[index]?.main ?? null
  if (!target) return

  setFocusedCircle(target, ctx, (t) => updateFocus(t, ctx))

  if (openEditor) {
    window.setTimeout(() => {
      ctx.editor.open(target, getCirclePlaceholder(target))
    }, 220)
  }
}

export function findNextOpenCircle(
  allCircles: HTMLButtonElement[],
  startFrom?: HTMLButtonElement | null
): HTMLButtonElement | null {
  if (!allCircles.length) return null

  const startIndex = startFrom ? allCircles.indexOf(startFrom) : -1

  for (let offset = 1; offset <= allCircles.length; offset += 1) {
    const index = (startIndex + offset + allCircles.length) % allCircles.length
    const candidate = allCircles[index]
    if (candidate.dataset.filled !== 'true') {
      return candidate
    }
  }

  return null
}

export function openCircleForEditing(
  circle: HTMLButtonElement,
  ctx: AppContext,
  callbacks: NavigationCallbacks
): void {
  const branchIndex = circle.dataset.branchIndex
  const isCenter = circle.dataset.circleId === 'center'
  const viewMode = getViewMode()
  const activeBranchIndex = getActiveBranchIndex()

  if (branchIndex !== undefined) {
    const index = Number(branchIndex)
    if (viewMode !== 'branch' || activeBranchIndex !== index) {
      enterBranchView(index, ctx, callbacks, circle, true)
      return
    }
  } else if (isCenter && viewMode === 'branch') {
    setViewMode('overview', ctx, callbacks)
    window.setTimeout(() => {
      setFocusedCircle(circle, ctx, (t) => updateFocus(t, ctx))
      ctx.editor.open(circle, getCirclePlaceholder(circle))
    }, 220)
    return
  }

  setFocusedCircle(circle, ctx, (t) => updateFocus(t, ctx))
  circle.focus({ preventScroll: true })
  ctx.editor.open(circle, getCirclePlaceholder(circle))
}
