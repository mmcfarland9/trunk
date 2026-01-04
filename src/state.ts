import type { NodeData, ViewMode } from './types'
import { STORAGE_KEY } from './constants'

// --- Node State ---

function normalizeNodeData(value: unknown): NodeData | null {
  if (!value || typeof value !== 'object') return null
  const payload = value as { label?: unknown; note?: unknown; detail?: unknown; goal?: unknown; goalType?: unknown; goalValue?: unknown; goalTitle?: unknown }
  const label = typeof payload.label === 'string' ? payload.label : ''
  const noteValue = typeof payload.note === 'string' ? payload.note : ''
  const legacyDetail = typeof payload.detail === 'string' ? payload.detail : ''
  const note = noteValue || legacyDetail
  // Migrate legacy goal field
  const legacyGoal = payload.goal === 'true'
  const goalType = (payload.goalType === 'binary' || payload.goalType === 'continuous') ? payload.goalType : 'binary'
  const goalValue = typeof payload.goalValue === 'number' ? payload.goalValue : (legacyGoal ? 100 : 0)
  const goalTitle = typeof payload.goalTitle === 'string' ? payload.goalTitle : ''
  if (!label && !note && goalValue === 0 && !goalTitle) return null
  return { label, note, goalType, goalValue, goalTitle }
}

function loadState(): Record<string, NodeData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      const nextState: Record<string, NodeData> = {}
      Object.entries(parsed as Record<string, unknown>).forEach(([key, value]) => {
        const normalized = normalizeNodeData(value)
        if (normalized) {
          // Migrate legacy 'center' key to 'trunk'
          const nodeKey = key === 'center' ? 'trunk' : key
          nextState[nodeKey] = normalized
        }
      })
      return nextState
    }
  } catch (error) {
    console.warn('Could not read saved notes', error)
  }
  return {}
}

export const nodeState: Record<string, NodeData> = loadState()
export let lastSavedAt: Date | null = null

export function saveState(onSaved?: () => void): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nodeState))
    lastSavedAt = new Date()
    onSaved?.()
  } catch (error) {
    console.warn('Could not save notes', error)
  }
}

export function clearState(): void {
  Object.keys(nodeState).forEach((key) => delete nodeState[key])
  lastSavedAt = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Could not clear saved notes', error)
  }
}

export function deleteNodeData(nodeId: string): void {
  delete nodeState[nodeId]
}

export function hasNodeData(): boolean {
  return Object.keys(nodeState).length > 0
}

// --- View State ---

let viewMode: ViewMode = 'overview'
let activeBranchIndex: number | null = null
let hoveredBranchIndex: number | null = null
let sidebarHover = false
let focusedNode: HTMLButtonElement | null = null
let activeNode: HTMLButtonElement | null = null

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

export function getIsSidebarHover(): boolean {
  return sidebarHover
}

export function setIsSidebarHover(value: boolean): void {
  sidebarHover = value
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
