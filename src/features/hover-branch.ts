import type { AppContext } from '../types'
import { getViewMode, getHoveredBranchIndex, setHoveredBranchIndex } from '../state'
import { enterBranchView, updateVisibility } from './navigation'
import type { NavigationCallbacks } from './navigation'

const SECTOR_COUNT = 8
const SECTOR_ANGLE = (Math.PI * 2) / SECTOR_COUNT
const HOVER_MIN_RADIUS_RATIO = 0.55

export function setupHoverBranch(ctx: AppContext, callbacks: NavigationCallbacks): void {
  const { canvas } = ctx.elements

  function clearHover(): void {
    if (getHoveredBranchIndex() !== null) {
      setHoveredBranchIndex(null)
      updateVisibility(ctx)
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
    const radius = Math.hypot(dx, dy)
    const ringRadius = getBranchRingRadius(ctx, centerX, centerY, rect)

    if (!ringRadius || radius < ringRadius * HOVER_MIN_RADIUS_RATIO) {
      clearHover()
      return
    }

    const hoveredIndex = getBranchIndexFromAngle(dx, dy)
    if (hoveredIndex !== getHoveredBranchIndex()) {
      setHoveredBranchIndex(hoveredIndex)
      updateVisibility(ctx)
    }
  }

  function handleClick(event: MouseEvent): void {
    if (getViewMode() !== 'overview') return
    const target = event.target as HTMLElement | null
    if (target?.closest('button.circle')) return

    const hoveredIndex = getHoveredBranchIndex()
    if (hoveredIndex === null) return

    enterBranchView(hoveredIndex, ctx, callbacks)
  }

  canvas.addEventListener('mousemove', handleMove)
  canvas.addEventListener('mouseleave', clearHover)
  canvas.addEventListener('click', handleClick)
}

function getBranchRingRadius(
  ctx: AppContext,
  centerX: number,
  centerY: number,
  canvasRect: DOMRect
): number | null {
  const branch = ctx.branches[0]
  if (!branch) return null

  const baseX = Number.parseFloat(branch.wrapper.dataset.baseX || '')
  const baseY = Number.parseFloat(branch.wrapper.dataset.baseY || '')
  if (Number.isFinite(baseX) && Number.isFinite(baseY)) {
    return Math.hypot(baseX - centerX, baseY - centerY)
  }

  const rect = branch.main.getBoundingClientRect()
  const x = rect.left - canvasRect.left + rect.width / 2
  const y = rect.top - canvasRect.top + rect.height / 2
  return Math.hypot(x - centerX, y - centerY)
}

function getBranchIndexFromAngle(dx: number, dy: number): number {
  const angle = Math.atan2(dy, dx)
  const normalized = (angle + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)
  return Math.floor((normalized + SECTOR_ANGLE / 2) / SECTOR_ANGLE) % SECTOR_COUNT
}
