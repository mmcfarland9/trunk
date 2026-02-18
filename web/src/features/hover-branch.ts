import type { AppContext } from '../types'
import { getViewMode, getHoveredBranchIndex, setHoveredBranchIndex, getHoveredTwigId, setHoveredTwigId, getFocusedNode, getActiveBranchIndex } from '../state'
import type { NavigationCallbacks } from './navigation'

export type HoverBranchCallbacks = {
  enterBranchView: (index: number, ctx: AppContext, callbacks: NavigationCallbacks) => void
  enterTwigView: (twig: HTMLButtonElement, branchIndex: number, ctx: AppContext, callbacks: NavigationCallbacks) => void
  returnToOverview: (ctx: AppContext, callbacks: NavigationCallbacks) => void
  returnToBranchView: (ctx: AppContext, callbacks: NavigationCallbacks) => void
  updateVisibility: (ctx: AppContext) => void
  updateScopedProgress: (ctx: AppContext) => void
  updateSidebarSprouts: (ctx: AppContext) => void
  updateFocus: (target: HTMLButtonElement | null, ctx: AppContext) => void
}

export type HoverTwigCallbacks = {
  updateFocus: (target: HTMLButtonElement | null, ctx: AppContext) => void
  updateSidebarSprouts: (ctx: AppContext) => void
}

const HOVER_MIN_RADIUS_RATIO = 0.55
const HOVER_MAX_RADIUS_RATIO = 1.35
const SCROLL_THRESHOLD = 150 // pixels of scroll delta needed to trigger zoom

export function setupHoverBranch(ctx: AppContext, navCallbacks: NavigationCallbacks, cb: HoverBranchCallbacks): void {
  const { canvas } = ctx.elements
  let scrollAccumulator = 0

  function clearHover(): void {
    if (getHoveredBranchIndex() !== null) {
      setHoveredBranchIndex(null)
      cb.updateVisibility(ctx)
      const focused = getFocusedNode()
      cb.updateFocus(focused, ctx)
      cb.updateScopedProgress(ctx)
      cb.updateSidebarSprouts(ctx)
    }
    scrollAccumulator = 0
  }

  function handleMove(event: MouseEvent): void {
    if (getViewMode() !== 'overview') {
      clearHover()
      return
    }

    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const dx = x - centerX
    const dy = y - centerY
    const ellipseRadii = getEllipseRadii(ctx, rect, centerX, centerY)

    if (!ellipseRadii) {
      clearHover()
      return
    }

    const normalizedDist = Math.hypot(dx / ellipseRadii.x, dy / ellipseRadii.y)

    if (normalizedDist < HOVER_MIN_RADIUS_RATIO || normalizedDist > HOVER_MAX_RADIUS_RATIO) {
      clearHover()
      return
    }

    const hoveredIndex = getBranchIndexFromPosition(ctx, rect, dx, dy)
    if (hoveredIndex !== getHoveredBranchIndex()) {
      setHoveredBranchIndex(hoveredIndex)
      scrollAccumulator = 0 // reset scroll when changing branches
      cb.updateVisibility(ctx)
      const branchGroup = ctx.branchGroups[hoveredIndex]
      if (branchGroup) {
        cb.updateFocus(branchGroup.branch, ctx)
        cb.updateScopedProgress(ctx)
        cb.updateSidebarSprouts(ctx)
      }
    }
  }

  function handleClick(event: MouseEvent): void {
    if (getViewMode() !== 'overview') return
    const target = event.target as HTMLElement | null
    if (target?.closest('button.node')) return

    const hoveredIndex = getHoveredBranchIndex()
    if (hoveredIndex === null) return

    cb.enterBranchView(hoveredIndex, ctx, navCallbacks)
  }

  function handleWheel(event: WheelEvent): void {
    const viewMode = getViewMode()

    // Natural scrolling (macOS default): swipe down = negative deltaY
    // Swipe toward you (down) = "dive in" to branch
    // Swipe away (up) = "back out" to overview
    if (viewMode === 'overview') {
      const hoveredIndex = getHoveredBranchIndex()
      if (hoveredIndex === null) return

      // Swipe down / toward you = negative deltaY = zoom in
      if (event.deltaY < 0) {
        scrollAccumulator += Math.abs(event.deltaY)
        if (scrollAccumulator >= SCROLL_THRESHOLD) {
          event.preventDefault()
          scrollAccumulator = 0
          cb.enterBranchView(hoveredIndex, ctx, navCallbacks)
        }
      } else {
        scrollAccumulator = Math.max(0, scrollAccumulator - event.deltaY)
      }
      return
    }

    if (viewMode === 'branch') {
      const activeBranchIndex = getActiveBranchIndex()
      if (activeBranchIndex === null) return

      // Check if hovering over a twig for scroll-in
      const target = event.target as HTMLElement | null
      const twigNode = target?.closest('.twig') as HTMLButtonElement | null

      // Swipe down / toward you = negative deltaY = zoom into twig
      if (event.deltaY < 0 && twigNode) {
        scrollAccumulator += Math.abs(event.deltaY)
        if (scrollAccumulator >= SCROLL_THRESHOLD) {
          event.preventDefault()
          scrollAccumulator = 0
          cb.enterTwigView(twigNode, activeBranchIndex, ctx, navCallbacks)
        }
        return
      }

      // Swipe up / away from you = positive deltaY = zoom out
      if (event.deltaY > 0) {
        scrollAccumulator += event.deltaY
        if (scrollAccumulator >= SCROLL_THRESHOLD) {
          event.preventDefault()
          scrollAccumulator = 0
          cb.returnToOverview(ctx, navCallbacks)
        }
      } else {
        scrollAccumulator = Math.max(0, scrollAccumulator + event.deltaY)
      }
      return
    }

    if (viewMode === 'twig') {
      // Swipe up / away from you = positive deltaY = zoom out to branch
      if (event.deltaY > 0) {
        scrollAccumulator += event.deltaY
        if (scrollAccumulator >= SCROLL_THRESHOLD) {
          event.preventDefault()
          scrollAccumulator = 0
          cb.returnToBranchView(ctx, navCallbacks)
        }
      } else {
        scrollAccumulator = Math.max(0, scrollAccumulator + event.deltaY)
      }
    }
  }

  canvas.addEventListener('mousemove', handleMove)
  canvas.addEventListener('mouseleave', clearHover)
  canvas.addEventListener('click', handleClick)
  canvas.addEventListener('wheel', handleWheel, { passive: false })
}

function getEllipseRadii(
  ctx: AppContext,
  canvasRect: DOMRect,
  centerX: number,
  centerY: number
): { x: number; y: number } | null {
  const branchTop = ctx.branchGroups[0]
  const branchRight = ctx.branchGroups[2]
  if (!branchTop || !branchRight) return null

  const topRect = branchTop.branch.getBoundingClientRect()
  const rightRect = branchRight.branch.getBoundingClientRect()
  const topY = topRect.top - canvasRect.top + topRect.height / 2
  const rightX = rightRect.left - canvasRect.left + rightRect.width / 2

  const radiusY = Math.abs(centerY - topY)
  const radiusX = Math.abs(rightX - centerX)

  if (radiusX === 0 || radiusY === 0) return null

  return { x: radiusX, y: radiusY }
}

function getBranchIndexFromPosition(
  ctx: AppContext,
  canvasRect: DOMRect,
  dx: number,
  dy: number
): number {
  const { branchGroups } = ctx
  const mouseAngle = Math.atan2(dy, dx)
  const centerX = canvasRect.width / 2
  const centerY = canvasRect.height / 2

  const branchAngles = branchGroups.map((group) => {
    const bRect = group.branch.getBoundingClientRect()
    const bx = bRect.left - canvasRect.left + bRect.width / 2
    const by = bRect.top - canvasRect.top + bRect.height / 2
    return Math.atan2(by - centerY, bx - centerX)
  })

  let closestIndex = 0
  let smallestDiff = Math.PI * 2

  for (let i = 0; i < branchAngles.length; i++) {
    let diff = Math.abs(mouseAngle - branchAngles[i])
    if (diff > Math.PI) diff = Math.PI * 2 - diff
    if (diff < smallestDiff) {
      smallestDiff = diff
      closestIndex = i
    }
  }

  return closestIndex
}

export function setupHoverTwig(ctx: AppContext, cb: HoverTwigCallbacks): void {
  // Add hover listeners to all twigs for branch view sidebar preview
  ctx.branchGroups.forEach(group => {
    group.twigs.forEach(twig => {
      twig.addEventListener('mouseenter', () => {
        if (getViewMode() !== 'branch') return
        const twigId = twig.dataset.nodeId
        if (!twigId || twigId === getHoveredTwigId()) return

        setHoveredTwigId(twigId)
        cb.updateFocus(twig, ctx)
        cb.updateSidebarSprouts(ctx)
      })

      twig.addEventListener('mouseleave', () => {
        if (getViewMode() !== 'branch') return
        if (getHoveredTwigId() === null) return

        setHoveredTwigId(null)
        // Reset focus to the branch
        const activeBranchIndex = getActiveBranchIndex()
        if (activeBranchIndex !== null) {
          const branchGroup = ctx.branchGroups[activeBranchIndex]
          if (branchGroup) {
            cb.updateFocus(branchGroup.branch, ctx)
          }
        }
        cb.updateSidebarSprouts(ctx)
      })
    })
  })
}
