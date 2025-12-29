import type { AppContext, ViewMode } from '../types'
import {
  getViewMode,
  setViewModeState,
  getActiveBranchIndex,
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
import { getBranchLabel } from './progress'

let zoomTimeoutId = 0

export type NavigationCallbacks = {
  onPositionNodes: () => void
  onUpdateStats: () => void
}

export function updateZoomTitle(ctx: AppContext): void {
  const { zoomTitle } = ctx.elements
  const { branches } = ctx
  const viewMode = getViewMode()
  const activeBranchIndex = getActiveBranchIndex()

  if (viewMode === 'branch' && activeBranchIndex !== null) {
    const label = getBranchLabel(branches[activeBranchIndex].main, activeBranchIndex)
    zoomTitle.textContent = `${label} leaves`
  }
}

export function updateVisibility(ctx: AppContext): void {
  const { canvas, center, zoomTitle } = ctx.elements
  const { branches } = ctx
  const activeBranchIndex = getActiveBranchIndex()
  const isBranch = isBranchView()

  canvas.classList.toggle('is-zoomed', isBranch)
  center.classList.toggle('is-minimized', isBranch)

  // Position minimized center opposite to the active branch
  if (isBranch && activeBranchIndex !== null) {
    const branchAngle = (Math.PI / 4) * activeBranchIndex - Math.PI / 2
    // Opposite angle - center should appear on the other side
    const oppositeAngle = branchAngle + Math.PI
    // Position relative to canvas center, offset by a percentage
    const offsetPercent = 0.38
    const offsetX = Math.cos(oppositeAngle) * offsetPercent * 100
    const offsetY = Math.sin(oppositeAngle) * offsetPercent * 100
    center.style.setProperty('--minimized-x', `calc(50% + ${offsetX}%)`)
    center.style.setProperty('--minimized-y', `calc(50% + ${offsetY}%)`)
    const driftPercent = 6
    const driftX = Math.cos(branchAngle) * -driftPercent
    const driftY = Math.sin(branchAngle) * -driftPercent
    canvas.style.setProperty('--zoom-drift-x', `${driftX}%`)
    canvas.style.setProperty('--zoom-drift-y', `${driftY}%`)
  } else {
    center.style.removeProperty('--minimized-x')
    center.style.removeProperty('--minimized-y')
    canvas.style.removeProperty('--zoom-drift-x')
    canvas.style.removeProperty('--zoom-drift-y')
  }

  branches.forEach((branch, index) => {
    const isActive = isBranch && index === activeBranchIndex
    branch.wrapper.classList.toggle('is-hidden', isBranch && !isActive)
    branch.wrapper.classList.toggle('is-active', isActive)

    setCircleVisibility(branch.main, !isBranch || isActive)
    branch.subs.forEach((sub) => {
      setCircleVisibility(sub, isBranch && isActive)
    })
  })

  zoomTitle.classList.toggle('is-hidden', !isBranch)
  zoomTitle.setAttribute('aria-hidden', isBranch ? 'false' : 'true')
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
  ctx.elements.canvas.dataset.zoomDirection = mode === 'branch' ? 'in' : 'out'

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
  updateZoomTitle(ctx)
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
