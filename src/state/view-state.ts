import type { ViewMode } from '../types'

let viewMode: ViewMode = 'overview'
let activeBranchIndex: number | null = null
let hoveredBranchIndex: number | null = null
let focusedCircle: HTMLButtonElement | null = null
let activeCircle: HTMLButtonElement | null = null

export function getViewMode(): ViewMode {
  return viewMode
}

export function setViewModeState(mode: ViewMode, branchIndex?: number): void {
  viewMode = mode
  if (mode === 'branch') {
    activeBranchIndex = typeof branchIndex === 'number' ? branchIndex : activeBranchIndex ?? 0
    hoveredBranchIndex = null
  } else {
    activeBranchIndex = null
    hoveredBranchIndex = null
  }
}

export function getActiveBranchIndex(): number | null {
  return activeBranchIndex
}

export function getHoveredBranchIndex(): number | null {
  return hoveredBranchIndex
}

export function setHoveredBranchIndex(index: number | null): void {
  hoveredBranchIndex = index
}

export function getFocusedCircle(): HTMLButtonElement | null {
  return focusedCircle
}

export function setFocusedCircleState(circle: HTMLButtonElement | null): void {
  focusedCircle = circle
}

export function getActiveCircle(): HTMLButtonElement | null {
  return activeCircle
}

export function setActiveCircle(circle: HTMLButtonElement | null): void {
  activeCircle = circle
}

export function isBranchView(): boolean {
  return viewMode === 'branch' && activeBranchIndex !== null
}
