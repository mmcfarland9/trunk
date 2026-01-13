import type { NodeData, ViewMode, Sprout, SproutState, SproutSeason, SproutEnvironment, SoilState, WaterState, Leaf, WaterEntry } from './types'
import { STORAGE_KEY } from './constants'

// --- Soil System ---
// Soil represents limited focus/energy. 1 soil = 1 simple weekly goal.

const SOIL_STORAGE_KEY = 'trunk-soil-v1'
const DEFAULT_SOIL_CAPACITY = 5

// Base costs by season (curved for longer goals)
const SEASON_BASE_COST: Record<SproutSeason, number> = {
  '1w': 1,
  '2w': 2,
  '1m': 3,
  '3m': 5,
  '6m': 8,
  '1y': 12,
}

// Environment multipliers
const ENVIRONMENT_MULTIPLIER: Record<SproutEnvironment, number> = {
  fertile: 1,
  firm: 1.5,
  barren: 2,
}

// Capacity rewards for successful completion
const ENVIRONMENT_REWARD: Record<SproutEnvironment, number> = {
  fertile: 0,
  firm: 1,
  barren: 2,
}

export function calculateSoilCost(season: SproutSeason, environment: SproutEnvironment): number {
  // Barren is always flat cost of 3
  if (environment === 'barren') {
    return 3
  }
  const base = SEASON_BASE_COST[season]
  const multiplier = ENVIRONMENT_MULTIPLIER[environment]
  return Math.ceil(base * multiplier)
}

export function getCapacityReward(environment: SproutEnvironment): number {
  return ENVIRONMENT_REWARD[environment]
}

function loadSoilState(): SoilState {
  try {
    const raw = localStorage.getItem(SOIL_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed.available === 'number' && typeof parsed.capacity === 'number') {
        return parsed
      }
    }
  } catch (error) {
    console.warn('Could not read soil state', error)
  }
  return { available: DEFAULT_SOIL_CAPACITY, capacity: DEFAULT_SOIL_CAPACITY }
}

function saveSoilState(): void {
  try {
    localStorage.setItem(SOIL_STORAGE_KEY, JSON.stringify(soilState))
  } catch (error) {
    console.warn('Could not save soil state', error)
  }
}

export const soilState: SoilState = loadSoilState()

export function getSoilAvailable(): number {
  return soilState.available
}

export function getSoilCapacity(): number {
  return soilState.capacity
}

export function canAffordSoil(cost: number): boolean {
  return soilState.available >= cost
}

export function spendSoil(cost: number): boolean {
  if (!canAffordSoil(cost)) return false
  soilState.available -= cost
  saveSoilState()
  return true
}

export function recoverSoil(amount: number, capacityBonus: number = 0): void {
  soilState.available = Math.min(soilState.available + amount, soilState.capacity + capacityBonus)
  if (capacityBonus > 0) {
    soilState.capacity += capacityBonus
  }
  saveSoilState()
}

export function recoverPartialSoil(amount: number, fraction: number): void {
  const recovered = Math.floor(amount * fraction)
  soilState.available = Math.min(soilState.available + recovered, soilState.capacity)
  saveSoilState()
}

export function resetSoil(): void {
  soilState.available = DEFAULT_SOIL_CAPACITY
  soilState.capacity = DEFAULT_SOIL_CAPACITY
  saveSoilState()
}

// --- Water System ---
// Water represents daily/recurring attention capacity.
// Resets to full capacity each day.

const WATER_STORAGE_KEY = 'trunk-water-v1'
const DEFAULT_WATER_CAPACITY = 3

type WaterStoredState = WaterState & { lastResetDate?: string }

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0] // YYYY-MM-DD
}

function loadWaterState(): WaterStoredState {
  try {
    const raw = localStorage.getItem(WATER_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed.available === 'number' && typeof parsed.capacity === 'number') {
        return {
          available: parsed.available,
          capacity: parsed.capacity,
          lastResetDate: parsed.lastResetDate,
        }
      }
    }
  } catch (error) {
    console.warn('Could not read water state', error)
  }
  return { available: DEFAULT_WATER_CAPACITY, capacity: DEFAULT_WATER_CAPACITY, lastResetDate: getDateString(new Date()) }
}

function saveWaterState(): void {
  try {
    localStorage.setItem(WATER_STORAGE_KEY, JSON.stringify(waterState))
  } catch (error) {
    console.warn('Could not save water state', error)
  }
}

const waterState: WaterStoredState = loadWaterState()

// Check and reset water daily (uses debug clock for testing)
export function checkWaterDailyReset(): boolean {
  const today = getDateString(getDebugDate())
  if (waterState.lastResetDate !== today) {
    waterState.available = waterState.capacity
    waterState.lastResetDate = today
    saveWaterState()
    return true // Did reset
  }
  return false // No reset needed
}

export function getWaterAvailable(): number {
  checkWaterDailyReset()
  return waterState.available
}

export function getWaterCapacity(): number {
  return waterState.capacity
}

export function canAffordWater(cost: number = 1): boolean {
  checkWaterDailyReset()
  return waterState.available >= cost
}

export function spendWater(cost: number = 1): boolean {
  checkWaterDailyReset()
  if (!canAffordWater(cost)) return false
  waterState.available -= cost
  saveWaterState()
  return true
}

// --- Debug Clock ---
// Internal clock that starts synced with real time but can be manipulated
let clockOffset = 0 // milliseconds offset from real time

export function getDebugNow(): number {
  return Date.now() + clockOffset
}

export function getDebugDate(): Date {
  return new Date(getDebugNow())
}

export function advanceClockByDays(days: number): void {
  clockOffset += days * 24 * 60 * 60 * 1000
}

export function resetClock(): void {
  clockOffset = 0
}

export function getClockOffset(): number {
  return clockOffset
}

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

// --- Leaf Helpers ---

export function generateLeafId(): string {
  return `leaf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function getTwigLeaves(twigId: string): Leaf[] {
  return nodeState[twigId]?.leaves || []
}

export function getLeafById(twigId: string, leafId: string): Leaf | undefined {
  return getTwigLeaves(twigId).find(l => l.id === leafId)
}

export function getSproutsByLeaf(sprouts: Sprout[], leafId: string): Sprout[] {
  return sprouts.filter(s => s.leafId === leafId)
}

export function getUnassignedSprouts(sprouts: Sprout[]): Sprout[] {
  return sprouts.filter(s => !s.leafId)
}

export function updateLeafStatus(twigId: string, leafId: string): void {
  const data = nodeState[twigId]
  if (!data?.leaves) return

  const leaf = data.leaves.find(l => l.id === leafId)
  if (!leaf) return

  const sprouts = getSproutsByLeaf(data.sprouts || [], leafId)
  const hasActive = sprouts.some(s => s.state === 'active')

  if (hasActive) {
    leaf.status = 'active'
  } else if (sprouts.length > 0) {
    leaf.status = 'dormant'
  }
}

export function createLeaf(twigId: string): Leaf {
  if (!nodeState[twigId]) {
    nodeState[twigId] = { label: '', note: '' }
  }
  if (!nodeState[twigId].leaves) {
    nodeState[twigId].leaves = []
  }

  const leaf: Leaf = {
    id: generateLeafId(),
    status: 'active',
    createdAt: new Date().toISOString(),
  }

  nodeState[twigId].leaves!.push(leaf)
  saveState()
  return leaf
}

export function deleteLeaf(twigId: string, leafId: string): void {
  const data = nodeState[twigId]
  if (!data?.leaves) return

  // Remove leaf
  data.leaves = data.leaves.filter(l => l.id !== leafId)
  if (data.leaves.length === 0) data.leaves = undefined

  // Unassign sprouts from this leaf
  if (data.sprouts) {
    data.sprouts.forEach(s => {
      if (s.leafId === leafId) {
        s.leafId = undefined
      }
    })
  }

  saveState()
}

// --- Water Entry Helpers ---

export function addWaterEntry(
  twigId: string,
  sproutId: string,
  content: string,
  prompt?: string
): boolean {
  const data = nodeState[twigId]
  if (!data?.sprouts) return false

  const sprout = data.sprouts.find(s => s.id === sproutId)
  if (!sprout) return false

  if (!sprout.waterEntries) {
    sprout.waterEntries = []
  }

  sprout.waterEntries.push({
    timestamp: new Date().toISOString(),
    content,
    prompt,
  })

  saveState()
  return true
}

export function getLeafWaterEntries(
  twigId: string,
  leafId: string
): Array<WaterEntry & { sproutId: string; sproutTitle: string }> {
  const data = nodeState[twigId]
  if (!data?.sprouts) return []

  const entries: Array<WaterEntry & { sproutId: string; sproutTitle: string }> = []

  getSproutsByLeaf(data.sprouts, leafId).forEach(sprout => {
    (sprout.waterEntries || []).forEach(entry => {
      entries.push({
        ...entry,
        sproutId: sprout.id,
        sproutTitle: sprout.title,
      })
    })
  })

  // Sort by timestamp descending
  return entries.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

// --- Grafting ---

export function graftSprout(
  twigId: string,
  parentSproutId: string,
  newSproutData: Omit<Sprout, 'id' | 'createdAt' | 'leafId' | 'graftedFromId'>
): Sprout | null {
  const data = nodeState[twigId]
  if (!data?.sprouts) return null

  const parentSprout = data.sprouts.find(s => s.id === parentSproutId)
  if (!parentSprout || !parentSprout.leafId) return null

  const newSprout: Sprout = {
    ...newSproutData,
    id: generateSproutId(),
    createdAt: new Date().toISOString(),
    leafId: parentSprout.leafId,
    graftedFromId: parentSproutId,
  }

  data.sprouts.push(newSprout)

  // Update leaf status to active
  updateLeafStatus(twigId, parentSprout.leafId)

  saveState()
  return newSprout
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
      const goalValue = typeof payload.goalValue === 'number' ? payload.goalValue : (legacyGoal ? 100 : 0)
      const goalTitle = typeof payload.goalTitle === 'string' ? payload.goalTitle : ''

      // Only migrate if there's actual goal data
      if (goalValue > 0 || goalTitle) {
        sprouts = [{
          id: generateSproutId(),
          title: goalTitle || 'Migrated goal',
          season: '1m', // Default season for migrated goals
          environment: 'fertile', // Default environment for migrated goals
          state: goalValue === 100 ? 'completed' : 'active',
          soilCost: 3, // Default cost for 1m greenhouse
          createdAt: new Date().toISOString(),
          activatedAt: new Date().toISOString(),
          result: goalValue === 100 ? 5 : undefined, // Map 100% completion to 5/5
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
let activeLeafId: string | null = null
let hoveredBranchIndex: number | null = null
let sidebarHover = false
let focusedNode: HTMLButtonElement | null = null
let activeNode: HTMLButtonElement | null = null

export function getViewMode(): ViewMode {
  return viewMode
}

export function setViewModeState(mode: ViewMode, branchIndex?: number, twigId?: string, leafId?: string): void {
  viewMode = mode
  if (mode === 'leaf') {
    // Leaf view requires branch index, twig ID, and leaf ID
    activeBranchIndex = typeof branchIndex === 'number' ? branchIndex : activeBranchIndex ?? 0
    activeTwigId = twigId ?? activeTwigId
    activeLeafId = leafId ?? null
    hoveredBranchIndex = null
  } else if (mode === 'twig') {
    // Twig view requires both branch index and twig ID
    activeBranchIndex = typeof branchIndex === 'number' ? branchIndex : activeBranchIndex ?? 0
    activeTwigId = twigId ?? null
    activeLeafId = null
    hoveredBranchIndex = null
  } else if (mode === 'branch') {
    activeBranchIndex = typeof branchIndex === 'number' ? branchIndex : activeBranchIndex ?? 0
    activeTwigId = null
    activeLeafId = null
    hoveredBranchIndex = null
  } else {
    activeBranchIndex = null
    activeTwigId = null
    activeLeafId = null
    hoveredBranchIndex = null
  }
}

export function getActiveLeafId(): string | null {
  return activeLeafId
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

export function isLeafView(): boolean {
  return viewMode === 'leaf' && activeLeafId !== null
}
