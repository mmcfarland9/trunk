/**
 * View state management.
 *
 * Manages navigation state including the current view mode, active branch/twig,
 * hover state, and focus tracking. This is purely in-memory state - not persisted.
 */

import type { ViewMode } from '../types'

// --- View State ---

let viewMode: ViewMode = 'overview'
let activeBranchIndex: number | null = null
let activeTwigId: string | null = null
let hoveredBranchIndex: number | null = null
let hoveredTwigId: string | null = null
let focusedNode: HTMLButtonElement | null = null
let activeNode: HTMLButtonElement | null = null

export function getViewMode(): ViewMode {
  return viewMode
}

export function setViewModeState(mode: ViewMode, branchIndex?: number, twigId?: string): void {
  viewMode = mode
  if (mode === 'leaf') {
    // Leaf view requires branch index, twig ID, and leaf ID
    activeBranchIndex = typeof branchIndex === 'number' ? branchIndex : (activeBranchIndex ?? 0)
    activeTwigId = twigId ?? activeTwigId
    hoveredBranchIndex = null
  } else if (mode === 'twig') {
    // Twig view requires both branch index and twig ID
    activeBranchIndex = typeof branchIndex === 'number' ? branchIndex : (activeBranchIndex ?? 0)
    activeTwigId = twigId ?? null
    hoveredBranchIndex = null
  } else if (mode === 'branch') {
    activeBranchIndex = typeof branchIndex === 'number' ? branchIndex : (activeBranchIndex ?? 0)
    activeTwigId = null
    hoveredBranchIndex = null
  } else {
    activeBranchIndex = null
    activeTwigId = null
    hoveredBranchIndex = null
  }
}

export function getActiveTwigId(): string | null {
  return activeTwigId
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

export function getHoveredTwigId(): string | null {
  return hoveredTwigId
}

export function setHoveredTwigId(id: string | null): void {
  hoveredTwigId = id
}

export function getFocusedNode(): HTMLButtonElement | null {
  return focusedNode
}

export function setFocusedNodeState(node: HTMLButtonElement | null): void {
  focusedNode = node
}

export function getActiveNode(): HTMLButtonElement | null {
  return activeNode
}

export function setActiveNode(node: HTMLButtonElement | null): void {
  activeNode = node
}

export function isBranchView(): boolean {
  return viewMode === 'branch' && activeBranchIndex !== null
}

export function isTwigView(): boolean {
  return viewMode === 'twig' && activeTwigId !== null
}
