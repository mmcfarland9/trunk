import type { AppContext } from '../types'
import { getViewMode, getHoveredBranchIndex, setHoveredBranchIndex, getFocusedCircle } from '../state'
import { enterBranchView, updateVisibility } from './navigation'
import { updateScopedProgress } from './progress'
import type { NavigationCallbacks } from './navigation'
import { updateFocus } from '../ui'

const HOVER_MIN_RADIUS_RATIO = 0.55
const HOVER_MAX_RADIUS_RATIO = 1.35

export function setupHoverBranch(ctx: AppContext, callbacks: NavigationCallbacks): void {
  const { canvas } = ctx.elements

  function clearHover(): void {
    if (getHoveredBranchIndex() !== null) {
      setHoveredBranchIndex(null)
      updateVisibility(ctx)
      // Revert sidebar to focused circle
      const focused = getFocusedCircle()
      updateFocus(focused, ctx)
      updateScopedProgress(ctx, focused)
    }
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

    // Normalize to ellipse space (if on ellipse, normalized distance = 1)
    const normalizedDist = Math.hypot(dx / ellipseRadii.x, dy / ellipseRadii.y)

    if (normalizedDist < HOVER_MIN_RADIUS_RATIO || normalizedDist > HOVER_MAX_RADIUS_RATIO) {
      clearHover()
      return
    }

    const hoveredIndex = getBranchIndexFromPosition(ctx, rect, dx, dy)
    if (hoveredIndex !== getHoveredBranchIndex()) {
      setHoveredBranchIndex(hoveredIndex)
      updateVisibility(ctx)
      // Update sidebar to show hovered branch
      const branch = ctx.branches[hoveredIndex]
      if (branch) {
        updateFocus(branch.main, ctx)
        updateScopedProgress(ctx, branch.main)
      }
    }
  }

  function handleClick(event: MouseEvent): void {
    if (getViewMode() !== 'overview') return
    const target = event.target as HTMLElement | null
    if (target?.closest('.circle-editor')) return
    if (target?.closest('button.circle')) return

    const hoveredIndex = getHoveredBranchIndex()
    if (hoveredIndex === null) return

    enterBranchView(hoveredIndex, ctx, callbacks)
  }

  canvas.addEventListener('mousemove', handleMove)
  canvas.addEventListener('mouseleave', clearHover)
  canvas.addEventListener('click', handleClick)
}

function getEllipseRadii(
  ctx: AppContext,
  canvasRect: DOMRect,
  centerX: number,
  centerY: number
): { x: number; y: number } | null {
  // Branch 0 is at top (-π/2), Branch 2 is at right (0)
  const branchTop = ctx.branches[0]
  const branchRight = ctx.branches[2]
  if (!branchTop || !branchRight) return null

  const topRect = branchTop.main.getBoundingClientRect()
  const rightRect = branchRight.main.getBoundingClientRect()
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
  const { branches } = ctx
  const mouseAngle = Math.atan2(dy, dx)
  const centerX = canvasRect.width / 2
  const centerY = canvasRect.height / 2

  // Get actual angles of each branch from their current positions
  const branchAngles = branches.map((b) => {
    const bRect = b.main.getBoundingClientRect()
    const bx = bRect.left - canvasRect.left + bRect.width / 2
    const by = bRect.top - canvasRect.top + bRect.height / 2
    return Math.atan2(by - centerY, bx - centerX)
  })

  // Find which branch the mouse is closest to (angularly)
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
