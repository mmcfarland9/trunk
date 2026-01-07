import type { NodeData, ViewMode, Sprout, SproutState } from './types'
import { STORAGE_KEY } from './constants'

// --- Sprout Helpers ---

export function generateSproutId(): string {
  return `sprout-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function getSproutsByState(sprouts: Sprout[], state: SproutState): Sprout[] {
  return sprouts.filter(s => s.state === state)
}

export function getActiveSprouts(sprouts: Sprout[]): Sprout[] {
  return getSproutsByState(sprouts, 'active')
}

export function getDraftSprouts(sprouts: Sprout[]): Sprout[] {
  return getSproutsByState(sprouts, 'draft')
}

export function getHistorySprouts(sprouts: Sprout[]): Sprout[] {
  return sprouts.filter(s => s.state === 'completed' || s.state === 'failed')
}

export function canAddActiveSprout(sprouts: Sprout[]): boolean {
  return getActiveSprouts(sprouts).length < 3
}

// --- Node State ---

function normalizeNodeData(value: unknown): NodeData | null {
  if (!value || typeof value !== 'object') return null
  const payload = value as {
    label?: unknown
    note?: unknown
    detail?: unknown
    goal?: unknown
    goalType?: unknown
    goalValue?: unknown
    goalTitle?: unknown
    sprouts?: unknown
  }
  const label = typeof payload.label === 'string' ? payload.label : ''
  const noteValue = typeof payload.note === 'string' ? payload.note : ''
  const legacyDetail = typeof payload.detail === 'string' ? payload.detail : ''
  const note = noteValue || legacyDetail

  // Check for existing sprouts array
  let sprouts: Sprout[] | undefined
  if (Array.isArray(payload.sprouts)) {
    sprouts = payload.sprouts.filter((s): s is Sprout =>
      s && typeof s === 'object' &&
      typeof s.id === 'string' &&
      typeof s.title === 'string'
    )
    if (sprouts.length === 0) sprouts = undefined
  }

  // Migrate legacy goal fields to sprouts (only if no sprouts exist)
  if (!sprouts) {
    const legacyGoal = payload.goal === 'true'
    const hasLegacyGoal = payload.goalType || payload.goalValue || payload.goalTitle || legacyGoal
    if (hasLegacyGoal) {
      const goalType = (payload.goalType === 'binary' || payload.goalType === 'continuous') ? payload.goalType : 'binary'
      const goalValue = typeof payload.goalValue === 'number' ? payload.goalValue : (legacyGoal ? 100 : 0)
      const goalTitle = typeof payload.goalTitle === 'string' ? payload.goalTitle : ''

      // Only migrate if there's actual goal data
      if (goalValue > 0 || goalTitle) {
        sprouts = [{
          id: generateSproutId(),
          type: goalType === 'continuous' ? 'sapling' : 'seed',
          title: goalTitle || 'Migrated goal',
          season: '1m', // Default season for migrated goals
          state: goalValue === 100 ? 'completed' : 'active',
          createdAt: new Date().toISOString(),
          activatedAt: new Date().toISOString(),
          result: goalValue,
        }]
      }
    }
  }

  if (!label && !note && !sprouts) return null
  return { label, note, sprouts }
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
let activeTwigId: string | null = null
let hoveredBranchIndex: number | null = null
let sidebarHover = false
let focusedNode: HTMLButtonElement | null = null
let activeNode: HTMLButtonElement | null = null

export function getViewMode(): ViewMode {
  return viewMode
}

export function setViewModeState(mode: ViewMode, branchIndex?: number, twigId?: string): void {
  viewMode = mode
  if (mode === 'twig') {
    // Twig view requires both branch index and twig ID
    activeBranchIndex = typeof branchIndex === 'number' ? branchIndex : activeBranchIndex ?? 0
    activeTwigId = twigId ?? null
    hoveredBranchIndex = null
  } else if (mode === 'branch') {
    activeBranchIndex = typeof branchIndex === 'number' ? branchIndex : activeBranchIndex ?? 0
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

export function isTwigView(): boolean {
  return viewMode === 'twig' && activeTwigId !== null
}
