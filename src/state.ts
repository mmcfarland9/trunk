import type { NodeData, ViewMode, Sprout, SproutState, SproutSeason, SproutEnvironment, SoilState, WaterState, SunState, Leaf } from './types'
import { STORAGE_KEY } from './constants'

// --- Schema Versioning & Migration ---
// The _version field tracks schema version for safe migrations over time.
// When you need to change the data structure:
// 1. Increment CURRENT_SCHEMA_VERSION
// 2. Add a migration function to MIGRATIONS
// 3. The migration runs automatically on load

const CURRENT_SCHEMA_VERSION = 1

type StoredState = {
  _version: number
  nodes: Record<string, NodeData>
}

type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>

// Migration functions: each transforms from version N to N+1
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MIGRATIONS: Record<number, MigrationFn> = {
  // Example: Version 1 → 2 migration
  // 2: (data) => {
  //   // Transform v1 structure to v2
  //   return { ...data, newField: 'default' }
  // },
}

function runMigrations(raw: Record<string, unknown>): StoredState {
  let version = typeof raw._version === 'number' ? raw._version : 0
  let data = raw

  // Legacy data (no _version field) gets version 0
  // We normalize it to version 1 structure
  if (version === 0) {
    // Old format: { trunk: {...}, branch-0: {...}, ... }
    // New format: { _version: 1, nodes: { trunk: {...}, ... } }
    const nodes: Record<string, unknown> = {}
    Object.entries(data).forEach(([key, value]) => {
      if (key !== '_version' && value && typeof value === 'object') {
        nodes[key] = value
      }
    })
    data = { _version: 1, nodes }
    version = 1
  }

  // Run any pending migrations
  while (version < CURRENT_SCHEMA_VERSION) {
    const migration = MIGRATIONS[version + 1]
    if (migration) {
      data = migration(data)
    }
    version++
  }

  return {
    _version: CURRENT_SCHEMA_VERSION,
    nodes: (data.nodes || {}) as Record<string, NodeData>,
  }
}

// Journal entry cap - prevents localStorage overflow over decades
const MAX_WATER_ENTRIES_PER_SPROUT = 365  // 1 year of daily entries
const MAX_SUN_ENTRIES_PER_SPROUT = 52     // 1 year of weekly entries

function capJournalEntries(sprout: Sprout): void {
  if (sprout.waterEntries && sprout.waterEntries.length > MAX_WATER_ENTRIES_PER_SPROUT) {
    // Keep most recent entries, remove oldest
    sprout.waterEntries = sprout.waterEntries.slice(-MAX_WATER_ENTRIES_PER_SPROUT)
  }
  if (sprout.sunEntries && sprout.sunEntries.length > MAX_SUN_ENTRIES_PER_SPROUT) {
    sprout.sunEntries = sprout.sunEntries.slice(-MAX_SUN_ENTRIES_PER_SPROUT)
  }
}

// --- Resource System (Unified) ---
// All resources (soil, water, sun) stored together for simpler backup/migration.

const RESOURCES_STORAGE_KEY = 'trunk-resources-v1'

// Legacy keys (for migration from old separate storage)
const LEGACY_SOIL_KEY = 'trunk-soil-v1'
const LEGACY_WATER_KEY = 'trunk-water-v1'
const LEGACY_SUN_KEY = 'trunk-sun-v1'

// --- Soil System ---
// Soil represents limited focus/energy. Start small, grow through success.
// Philosophy: Earn your way to bigger goals through consistent small wins.

const DEFAULT_SOIL_CAPACITY = 4  // Start humble - room for a few 1-week goals

// Recovery rate per watering (daily engagement is rewarded)
const SOIL_RECOVERY_PER_WATER = 0.25  // 3 waters/day = 0.75 soil/day = ~5/week

// Base costs by season (longer goals require building up capacity)
const SEASON_BASE_COST: Record<SproutSeason, number> = {
  '1w': 1,   // Cheap - the building blocks
  '2w': 2,
  '1m': 3,
  '3m': 5,   // Requires ~5 capacity (need to grow first)
  '6m': 8,   // Serious commitment
  '1y': 12,  // Major life goal
}

// Environment multipliers (harder = costs more)
const ENVIRONMENT_MULTIPLIER: Record<SproutEnvironment, number> = {
  fertile: 1,    // Normal cost
  firm: 1.5,     // 50% more expensive
  barren: 2,     // Double cost (but double reward)
}

// Capacity rewards for successful completion (environment component)
const ENVIRONMENT_REWARD: Record<SproutEnvironment, number> = {
  fertile: 0,    // Safe mode - no growth
  firm: 0.5,     // Small capacity boost
  barren: 1,     // Significant capacity boost
}

// Capacity rewards for successful completion (season component)
// Longer commitments = bigger rewards when you follow through
const SEASON_REWARD: Record<SproutSeason, number> = {
  '1w': 0,       // Quick wins don't grow capacity
  '2w': 0.25,    // Slight boost
  '1m': 0.5,     // Meaningful commitment
  '3m': 1,       // Real dedication
  '6m': 1.5,     // Major achievement
  '1y': 2,       // Life-changing
}

export function calculateSoilCost(season: SproutSeason, environment: SproutEnvironment): number {
  const base = SEASON_BASE_COST[season]
  const multiplier = ENVIRONMENT_MULTIPLIER[environment]
  return Math.ceil(base * multiplier)
}

// Total capacity reward = environment difficulty + season length
export function getCapacityReward(environment: SproutEnvironment, season: SproutSeason): number {
  return ENVIRONMENT_REWARD[environment] + SEASON_REWARD[season]
}

// How much soil is recovered per watering
export function getSoilRecoveryRate(): number {
  return SOIL_RECOVERY_PER_WATER
}

// --- Unified Resource State ---

const DEFAULT_WATER_CAPACITY = 3
const DEFAULT_SUN_CAPACITY = 1  // Weekly, so just 1

type ResourceStoredState = {
  soil: SoilState
  water: WaterState & { lastResetDate?: string }
  sun: SunState & { lastResetDate?: string }
}

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0] // YYYY-MM-DD
}

function getWeekString(date: Date): string {
  // Get ISO week number for weekly reset
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${weekNo}`
}

function loadResourceState(): ResourceStoredState {
  const defaults: ResourceStoredState = {
    soil: { available: DEFAULT_SOIL_CAPACITY, capacity: DEFAULT_SOIL_CAPACITY },
    water: { available: DEFAULT_WATER_CAPACITY, capacity: DEFAULT_WATER_CAPACITY, lastResetDate: getDateString(new Date()) },
    sun: { available: DEFAULT_SUN_CAPACITY, capacity: DEFAULT_SUN_CAPACITY, lastResetDate: getWeekString(new Date()) },
  }

  try {
    // Try unified key first
    const raw = localStorage.getItem(RESOURCES_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        soil: parsed.soil || defaults.soil,
        water: parsed.water || defaults.water,
        sun: parsed.sun || defaults.sun,
      }
    }

    // Migrate from legacy separate keys
    const legacySoil = localStorage.getItem(LEGACY_SOIL_KEY)
    const legacyWater = localStorage.getItem(LEGACY_WATER_KEY)
    const legacySun = localStorage.getItem(LEGACY_SUN_KEY)

    if (legacySoil || legacyWater || legacySun) {
      const migrated: ResourceStoredState = {
        soil: legacySoil ? JSON.parse(legacySoil) : defaults.soil,
        water: legacyWater ? JSON.parse(legacyWater) : defaults.water,
        sun: legacySun ? JSON.parse(legacySun) : defaults.sun,
      }

      // Save to unified key
      localStorage.setItem(RESOURCES_STORAGE_KEY, JSON.stringify(migrated))

      // Clean up legacy keys
      localStorage.removeItem(LEGACY_SOIL_KEY)
      localStorage.removeItem(LEGACY_WATER_KEY)
      localStorage.removeItem(LEGACY_SUN_KEY)

      console.log('[MIGRATION] Resources migrated to unified storage')
      return migrated
    }
  } catch (error) {
    console.warn('Could not read resource state', error)
  }

  return defaults
}

function saveResourceState(): void {
  try {
    localStorage.setItem(RESOURCES_STORAGE_KEY, JSON.stringify(resourceState))
  } catch (error) {
    console.warn('Could not save resource state', error)
  }
}

const resourceState: ResourceStoredState = loadResourceState()

// Convenience aliases for backward compatibility
const soilState = resourceState.soil
const waterState = resourceState.water
const sunState = resourceState.sun

// --- Soil API ---

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
  saveResourceState()
  return true
}

export function recoverSoil(amount: number, capacityBonus: number = 0): void {
  soilState.available = Math.min(soilState.available + amount, soilState.capacity + capacityBonus)
  if (capacityBonus > 0) {
    soilState.capacity += capacityBonus
  }
  saveResourceState()
}

export function recoverPartialSoil(amount: number, fraction: number): void {
  const recovered = Math.floor(amount * fraction)
  soilState.available = Math.min(soilState.available + recovered, soilState.capacity)
  saveResourceState()
}

// --- Water API ---

export function checkWaterDailyReset(): boolean {
  const today = getDateString(getDebugDate())
  if (waterState.lastResetDate !== today) {
    waterState.available = waterState.capacity
    waterState.lastResetDate = today
    saveResourceState()
    return true
  }
  return false
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
  saveResourceState()
  return true
}

// --- Sun API (Weekly reset for planning/reflection) ---

export function checkSunWeeklyReset(): boolean {
  const thisWeek = getWeekString(getDebugDate())
  if (sunState.lastResetDate !== thisWeek) {
    sunState.available = sunState.capacity
    sunState.lastResetDate = thisWeek
    saveResourceState()
    return true
  }
  return false
}

export function getSunAvailable(): number {
  checkSunWeeklyReset()
  return sunState.available
}

export function getSunCapacity(): number {
  return sunState.capacity
}

export function canAffordSun(cost: number = 1): boolean {
  checkSunWeeklyReset()
  return sunState.available >= cost
}

export function spendSun(cost: number = 1): boolean {
  checkSunWeeklyReset()
  if (!canAffordSun(cost)) return false
  sunState.available -= cost
  saveResourceState()
  return true
}

// --- Reset All Resources ---

export function resetResources(): void {
  soilState.available = DEFAULT_SOIL_CAPACITY
  soilState.capacity = DEFAULT_SOIL_CAPACITY
  waterState.available = DEFAULT_WATER_CAPACITY
  waterState.capacity = DEFAULT_WATER_CAPACITY
  waterState.lastResetDate = getDateString(new Date())
  sunState.available = DEFAULT_SUN_CAPACITY
  sunState.capacity = DEFAULT_SUN_CAPACITY
  sunState.lastResetDate = getWeekString(new Date())
  saveResourceState()
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

export function getHistorySprouts(sprouts: Sprout[]): Sprout[] {
  return sprouts.filter(s => s.state === 'completed' || s.state === 'failed')
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

  console.log('[WATER] Entry added:', {
    twigId,
    sproutId,
    sproutTitle: sprout.title,
    waterEntriesCount: sprout.waterEntries.length,
  })

  saveState()
  return true
}

// Add a sun entry (shine) to a cultivated sprout
export function addSunEntry(
  twigId: string,
  sproutId: string,
  content: string,
  prompt?: string
): boolean {
  const data = nodeState[twigId]
  if (!data?.sprouts) return false

  const sprout = data.sprouts.find(s => s.id === sproutId)
  if (!sprout) return false

  if (!sprout.sunEntries) {
    sprout.sunEntries = []
  }

  sprout.sunEntries.push({
    timestamp: new Date().toISOString(),
    content,
    prompt,
  })

  console.log('[SHINE] Entry added:', {
    twigId,
    sproutId,
    sproutTitle: sprout.title,
    sunEntriesCount: sprout.sunEntries.length,
  })

  saveState()
  return true
}

// --- Grafting ---

// Graft from a leaf - creates a new sprout on an existing leaf
// This is a "renewal" of the leaf with a fresh season/environment
export function graftFromLeaf(
  twigId: string,
  leafId: string,
  newSproutData: Omit<Sprout, 'id' | 'createdAt' | 'leafId'>
): Sprout | null {
  const data = nodeState[twigId]
  if (!data) return null

  // Ensure sprouts array exists
  if (!data.sprouts) data.sprouts = []

  // Verify the leaf exists
  const leaf = data.leaves?.find(l => l.id === leafId)
  if (!leaf) return null

  const newSprout: Sprout = {
    ...newSproutData,
    id: generateSproutId(),
    createdAt: new Date().toISOString(),
    leafId,
  }

  data.sprouts.push(newSprout)

  // Update leaf status to active
  updateLeafStatus(twigId, leafId)

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
      // Run migrations to bring data to current schema
      const migrated = runMigrations(parsed as Record<string, unknown>)

      // Normalize each node's data
      const nextState: Record<string, NodeData> = {}
      Object.entries(migrated.nodes).forEach(([key, value]) => {
        const normalized = normalizeNodeData(value)
        if (normalized) {
          // Migrate legacy 'center' key to 'trunk'
          const nodeKey = key === 'center' ? 'trunk' : key
          nextState[nodeKey] = normalized
        }
      })

      // Save migrated data back if version changed
      if (!parsed._version || parsed._version < CURRENT_SCHEMA_VERSION) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          _version: CURRENT_SCHEMA_VERSION,
          nodes: nextState,
        }))
        console.log(`[MIGRATION] Data migrated from v${parsed._version || 0} to v${CURRENT_SCHEMA_VERSION}`)
      }

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
    // Cap journal entries before saving to prevent unbounded growth
    Object.values(nodeState).forEach(data => {
      data.sprouts?.forEach(capJournalEntries)
    })

    // Save with version for future migrations
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      _version: CURRENT_SCHEMA_VERSION,
      nodes: nodeState,
    }))
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
  if (mode === 'leaf') {
    // Leaf view requires branch index, twig ID, and leaf ID
    activeBranchIndex = typeof branchIndex === 'number' ? branchIndex : activeBranchIndex ?? 0
    activeTwigId = twigId ?? activeTwigId
    hoveredBranchIndex = null
  } else if (mode === 'twig') {
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
