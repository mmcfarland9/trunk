import type { AppContext, ViewMode } from '../types'
import { ZOOM_TRANSITION_DURATION, EDITOR_OPEN_DELAY } from '../constants'
import { getViewMode, setViewModeState, getActiveBranchIndex, getHoveredBranchIndex, isBranchView } from '../state'
import {
  setNodeVisibility,
  setFocusedNode,
  updateFocus,
  getNodePlaceholder,
} from '../ui/node-ui'
import { animateGuideLines } from '../ui/layout'

let zoomTimeoutId = 0
const fadeTimeouts = new Map<number, number>() // branchIndex -> timeoutId

export type NavigationCallbacks = {
  onPositionNodes: () => void
  onUpdateStats: () => void
}

export function updateVisibility(ctx: AppContext): void {
  const { canvas, trunk, periodSection } = ctx.elements
  const { branchGroups } = ctx
  const activeBranchIndex = getActiveBranchIndex()
  const hoveredBranchIndex = getHoveredBranchIndex()
  const isBranch = isBranchView()
  const isPreview = !isBranch && hoveredBranchIndex !== null

  canvas.classList.toggle('is-zoomed', isBranch)
  canvas.classList.toggle('is-previewing', isPreview)
  trunk.classList.toggle('is-minimized', isBranch)
  periodSection.style.display = isBranch ? 'none' : ''

  if (isBranch && activeBranchIndex !== null) {
    // Position trunk asterisk farther away from the active branch
    const angle = (Math.PI / 4) * activeBranchIndex - Math.PI / 2
    const offset = 18 // percentage offset from center
    const offsetX = 50 - Math.cos(angle) * offset
    const offsetY = 50 - Math.sin(angle) * offset
    trunk.style.setProperty('--minimized-x', `${offsetX}%`)
    trunk.style.setProperty('--minimized-y', `${offsetY}%`)
  } else {
    trunk.style.removeProperty('--minimized-x')
    trunk.style.removeProperty('--minimized-y')
  }

  branchGroups.forEach((branchGroup, index) => {
    const isActive = isBranch && index === activeBranchIndex
    const isPreviewed = !isBranch && hoveredBranchIndex === index
    const wasPreview = branchGroup.group.classList.contains('is-preview')

    branchGroup.group.classList.toggle('is-hidden', isBranch && !isActive)
    branchGroup.group.classList.toggle('is-active', isActive)
    branchGroup.group.classList.toggle('is-preview', isPreviewed)

    setNodeVisibility(branchGroup.branch, !isBranch || isActive)

    // Delay hiding leaves when exiting preview for smooth fade-out (only in overview mode)
    const shouldShow = isBranch ? isActive : isPreviewed

    // Cancel any pending fade-out timeout for this branch
    const existingTimeout = fadeTimeouts.get(index)
    if (existingTimeout) {
      window.clearTimeout(existingTimeout)
      fadeTimeouts.delete(index)
    }

    if (!isBranch && wasPreview && !isPreviewed && !shouldShow) {
      // Let the fade-out transition play before hiding with randomized timing
      const maxDelay = 400
      const baseDuration = 800
      const durationVariance = 600
      let maxTotalTime = 0

      branchGroup.leaves.forEach((leaf) => {
        const delay = Math.random() * maxDelay
        const duration = baseDuration + Math.random() * durationVariance
        leaf.style.setProperty('--fade-delay', `${delay}ms`)
        leaf.style.setProperty('--fade-duration', `${duration}ms`)
        leaf.classList.add('is-fading')
        maxTotalTime = Math.max(maxTotalTime, delay + duration)
      })

      const timeoutId = window.setTimeout(() => {
        fadeTimeouts.delete(index)
        branchGroup.leaves.forEach((leaf) => {
          leaf.classList.remove('is-fading')
          leaf.style.removeProperty('--fade-delay')
          leaf.style.removeProperty('--fade-duration')
          setNodeVisibility(leaf, false)
        })
      }, maxTotalTime + 50)
      fadeTimeouts.set(index, timeoutId)
    } else {
      branchGroup.leaves.forEach((leaf) => {
        leaf.classList.remove('is-fading')
        leaf.style.removeProperty('--fade-delay')
        leaf.style.removeProperty('--fade-duration')
        setNodeVisibility(leaf, shouldShow)
      })
    }
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
  setViewMode('overview', ctx, callbacks)
  callbacks.onUpdateStats() // Update sidebar to show branches

  // Clear focus so trunk info shows in sidebar
  setFocusedNode(null, ctx, (target) => updateFocus(target, ctx))
}

export function enterBranchView(
  index: number,
  ctx: AppContext,
  callbacks: NavigationCallbacks,
  focusNode?: HTMLButtonElement | null,
  openEditor = false
): void {
  setViewMode('branch', ctx, callbacks, index)
  callbacks.onUpdateStats() // Update sidebar to show leaves

  const target = focusNode ?? ctx.branchGroups[index]?.branch ?? null
  if (!target) return

  setFocusedNode(target, ctx, (t) => updateFocus(t, ctx))

  if (openEditor) {
    window.setTimeout(() => {
      ctx.editor.open(target, getNodePlaceholder(target))
    }, EDITOR_OPEN_DELAY)
  }
}

