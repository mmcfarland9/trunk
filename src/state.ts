import type { NodeData, ViewMode, Sprout, SproutState, SproutSeason, SproutEnvironment, SoilState, WaterState, SunState, SunEntry, SoilEntry, Leaf, NotificationSettings, WaterLogEntry } from './types'
import { STORAGE_KEY } from './constants'
import presetData from '../assets/trunk-map-preset.json'
import { safeSetItem, type StorageResult } from './utils/safe-storage'

// --- Schema Versioning & Migration ---
// The _version field tracks schema version for safe migrations over time.
// When you need to change the data structure:
// 1. Increment CURRENT_SCHEMA_VERSION
// 2. Add a migration function to MIGRATIONS
// 3. The migration runs automatically on load

const CURRENT_SCHEMA_VERSION = 2

export type StoredState = {
  _version: number
  nodes: Record<string, NodeData>
  sunLog?: SunEntry[] // Global shine journal log
  soilLog?: SoilEntry[] // Soil gains and losses
}

type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>

// Migration functions: each transforms from version N to N+1
const MIGRATIONS: Record<number, MigrationFn> = {
  // Version 1 → 2: Remove 1w sprouts, add leaf names, remove leaf status
  2: (data) => {
    const nodes = data.nodes as Record<string, unknown>

    Object.values(nodes).forEach((node: unknown) => {
      const n = node as {
        sprouts?: Array<{ season: string; title: string; leafId?: string; createdAt?: string }>,
        leaves?: Array<{ id: string; name?: string; status?: string }>
      }

      // Convert 1w sprouts to 2w
      if (n.sprouts) {
        n.sprouts.forEach(sprout => {
          if (sprout.season === '1w') {
            sprout.season = '2w'
          }
        })
      }

      // Add name to leaves, remove status
      if (n.leaves) {
        n.leaves.forEach(leaf => {
          if (!leaf.name) {
            // Derive name from most recent sprout on this leaf (by createdAt)
            const leafSprouts = n.sprouts?.filter(s => s.leafId === leaf.id) || []
            const sorted = leafSprouts.sort((a, b) =>
              new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            )
            const mostRecent = sorted[0]
            leaf.name = mostRecent?.title || 'Unnamed Saga'
          }
          delete leaf.status
        })
      }
    })

    return data
  },
}

/**
 * Run schema migrations on raw data from import or localStorage.
 * Exported for use by import-export.ts.
 */
export function runMigrations(raw: Record<string, unknown>): StoredState {
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
//
// === THE BONSAI MODEL ===
// Capacity grows slowly over years, with diminishing returns as you approach max.
// Max capacity (100) is a lifetime goal - essentially unreachable.
// See docs/progression-system.md for full math and examples.

const DEFAULT_SOIL_CAPACITY = 10  // Room for ~5 concurrent 2-week sprouts
const MAX_SOIL_CAPACITY = 100    // Lifetime ceiling - mythical to achieve

// Recovery rates (slow, bonsai-style)
// Water: Quick daily engagement with active sprouts
// Sun: Thoughtful weekly reflection on life facets (twigs)
const SOIL_RECOVERY_PER_WATER = 0.05  // 3x/day = 0.15/day = ~1.05/week
const SOIL_RECOVERY_PER_SUN = 0.35    // 1x/week - meaningful but supplementary

// Base costs by season (longer goals require building up capacity)
const SEASON_BASE_COST: Record<SproutSeason, number> = {
  '2w': 2,   // Minimum commitment
  '1m': 3,
  '3m': 5,   // Requires ~5 capacity (need to grow first)
  '6m': 8,   // Serious commitment
  '1y': 12,  // Major life goal
}

// Environment multipliers (harder = costs more)
// - Fertile: "I know how to do this" - comfort zone, support, experience
// - Firm: "This will take effort" - stretching, obstacles, learning required
// - Barren: "This is genuinely hard" - new skill, no safety net, real risk
const ENVIRONMENT_COST_MULT: Record<SproutEnvironment, number> = {
  fertile: 1,    // Normal cost
  firm: 1.5,     // 50% more expensive
  barren: 2,     // Double cost (but double reward)
}

// === CAPACITY REWARD SYSTEM ===
// Formula: base × environment × result × diminishing
// All factors multiply together for final reward.

// Base rewards by season - scaled so per-week rate is roughly equal
// with slight bonus for longer commitments (~40% better from 1w→1y)
const SEASON_BASE_REWARD: Record<SproutSeason, number> = {
  '2w': 0.26,   // ~0.13/week
  '1m': 0.56,   // ~0.14/week
  '3m': 1.95,   // ~0.15/week
  '6m': 4.16,   // ~0.16/week
  '1y': 8.84,   // ~0.17/week
}

// Environment reward multiplier (harder = better return on risk)
const ENVIRONMENT_REWARD_MULT: Record<SproutEnvironment, number> = {
  fertile: 1.1,   // Safe path - 10% bonus
  firm: 1.75,     // Some friction - 17% bonus
  barren: 2.4,    // Real challenge - 20% bonus
}

// Result multiplier (1-5 scale from sprout completion)
// Compressed spread: showing up matters, every attempt grows you
const RESULT_REWARD_MULT: Record<number, number> = {
  1: 0.4,   // You showed up - 40% reward
  2: 0.55,  // Partial effort
  3: 0.7,   // Solid, honest work
  4: 0.85,  // Strong execution
  5: 1.0,   // Excellence - full reward
}

export function calculateSoilCost(season: SproutSeason, environment: SproutEnvironment): number {
  const base = SEASON_BASE_COST[season]
  const multiplier = ENVIRONMENT_COST_MULT[environment]
  return Math.ceil(base * multiplier)
}

// Calculate capacity reward with diminishing returns
// As you approach MAX_SOIL_CAPACITY, growth slows toward zero
export function calculateCapacityReward(
  season: SproutSeason,
  environment: SproutEnvironment,
  result: number,
  currentCapacity: number
): number {
  const base = SEASON_BASE_REWARD[season]
  const envMult = ENVIRONMENT_REWARD_MULT[environment]
  const resultMult = RESULT_REWARD_MULT[result] ?? RESULT_REWARD_MULT[3] // Default to 0.7

  // Quadratic diminishing returns - growth slows dramatically as you approach max
  const diminishingFactor = Math.max(0, Math.pow(1 - (currentCapacity / MAX_SOIL_CAPACITY), 2))

  return base * envMult * resultMult * diminishingFactor
}

// Legacy function for backwards compatibility - returns base reward without diminishing
export function getCapacityReward(environment: SproutEnvironment, season: SproutSeason): number {
  return SEASON_BASE_REWARD[season] * ENVIRONMENT_REWARD_MULT[environment]
}

export function getMaxSoilCapacity(): number {
  return MAX_SOIL_CAPACITY
}

// How much soil is recovered per watering (sprout-level, daily)
export function getSoilRecoveryRate(): number {
  return SOIL_RECOVERY_PER_WATER
}

// How much soil is recovered per sun shine (twig-level, weekly)
export function getSunRecoveryRate(): number {
  return SOIL_RECOVERY_PER_SUN
}

// --- Unified Resource State ---

const DEFAULT_WATER_CAPACITY = 3
const DEFAULT_SUN_CAPACITY = 1  // Weekly, so just 1

// --- Reset Time System ---
// Both water (daily) and sun (weekly) reset at 6:00 AM
const RESET_HOUR = 6 // 6:00 AM local time

// Get the most recent daily reset time (6am today or yesterday if before 6am)
export function getTodayResetTime(): Date {
  const now = getDebugDate()
  const reset = new Date(now)
  reset.setHours(RESET_HOUR, 0, 0, 0)

  // If we haven't hit 6am yet, reset time is yesterday at 6am
  if (now < reset) {
    reset.setDate(reset.getDate() - 1)
  }
  return reset
}

// Get the most recent weekly reset time (Sunday at 6am)
export function getWeekResetTime(): Date {
  const now = getDebugDate()
  const reset = new Date(now)
  reset.setHours(RESET_HOUR, 0, 0, 0)

  // Find most recent Sunday
  const daysSinceSunday = reset.getDay() // 0 = Sunday
  reset.setDate(reset.getDate() - daysSinceSunday)

  // If today is Sunday but before 6am, go back a week
  if (now.getDay() === 0 && now < reset) {
    reset.setDate(reset.getDate() - 7)
  }

  return reset
}

// Get next daily reset time (tomorrow at 6am, or today at 6am if before 6am)
export function getNextWaterReset(): Date {
  const reset = getTodayResetTime()
  reset.setDate(reset.getDate() + 1)
  return reset
}

// Get next weekly reset time (next Sunday at 6am)
export function getNextSunReset(): Date {
  const reset = getWeekResetTime()
  reset.setDate(reset.getDate() + 7)
  return reset
}

// Format reset time as "Resets Wed 01/22 at 6:00 AM"
export function formatResetTime(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const day = days[date.getDay()]
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const dayNum = String(date.getDate()).padStart(2, '0')

  let hours = date.getHours()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `Resets ${day} ${month}/${dayNum} at ${hours}:${minutes} ${ampm}`
}

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

      return migrated
    }
  } catch (error) {
    console.warn('Could not read resource state', error)
  }

  return defaults
}

function saveResourceState(): void {
  const result = safeSetItem(RESOURCES_STORAGE_KEY, JSON.stringify(resourceState))
  if (!result.success) {
    if (result.isQuotaError) {
      console.warn('localStorage quota exceeded while saving resources')
      onQuotaError?.()
    } else {
      console.warn('Could not save resource state')
    }
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

export function spendSoil(cost: number, reason?: string, context?: string): boolean {
  if (!canAffordSoil(cost)) return false
  soilState.available -= cost
  if (reason) {
    addSoilEntry(-cost, reason, context)
  }
  saveResourceState()
  return true
}

export function recoverSoil(amount: number, capacityBonus: number = 0, reason?: string, context?: string): void {
  const prevAvailable = soilState.available
  soilState.available = Math.min(soilState.available + amount, soilState.capacity + capacityBonus)
  const actualRecovered = soilState.available - prevAvailable
  if (reason && actualRecovered > 0) {
    addSoilEntry(actualRecovered, reason, context)
  }
  if (capacityBonus > 0) {
    soilState.capacity += capacityBonus
  }
  saveResourceState()
}

export function recoverPartialSoil(amount: number, fraction: number, reason?: string, context?: string): void {
  const recovered = amount * fraction
  const prevAvailable = soilState.available
  soilState.available = Math.min(soilState.available + recovered, soilState.capacity)
  const actualRecovered = soilState.available - prevAvailable
  if (reason && actualRecovered > 0) {
    addSoilEntry(actualRecovered, reason, context)
  }
  saveResourceState()
}

// --- Water API (Derived from logs) ---
// Water availability is derived from waterEntries across all sprouts.
// No stored counter - timestamps are the truth.

// Cache for water count to avoid O(n*m*k) iteration on every call
let waterCountCache: { resetTime: number; count: number } | null = null

// Cache for all water entries (for water can dialog)
let waterEntriesCache: WaterLogEntry[] | null = null

// Invalidate water caches (called when water entry is added)
export function invalidateWaterCountCache(): void {
  waterCountCache = null
  waterEntriesCache = null
}

// Count water entries since today's reset time (6am)
export function getWaterUsedToday(): number {
  const resetTime = getTodayResetTime()
  const resetMs = resetTime.getTime()

  // Return cached count if valid for current reset period
  if (waterCountCache && waterCountCache.resetTime === resetMs) {
    return waterCountCache.count
  }

  // Recalculate
  let count = 0
  for (const data of Object.values(nodeState)) {
    for (const sprout of data.sprouts ?? []) {
      for (const entry of sprout.waterEntries ?? []) {
        if (new Date(entry.timestamp) >= resetTime) {
          count++
        }
      }
    }
  }

  // Cache the result
  waterCountCache = { resetTime: resetMs, count }
  return count
}

export function getWaterAvailable(): number {
  return Math.max(0, waterState.capacity - getWaterUsedToday())
}

export function getWaterCapacity(): number {
  return waterState.capacity
}

// Get all water entries across all sprouts (cached)
export function getAllWaterEntries(): WaterLogEntry[] {
  if (waterEntriesCache) {
    return waterEntriesCache
  }

  const entries: WaterLogEntry[] = []

  for (const [nodeId, data] of Object.entries(nodeState)) {
    if (!nodeId.includes('twig') || !data.sprouts) continue
    const twigLabel = data.label || nodeId

    for (const sprout of data.sprouts) {
      if (!sprout.waterEntries) continue
      for (const entry of sprout.waterEntries) {
        entries.push({
          timestamp: entry.timestamp,
          content: entry.content,
          prompt: entry.prompt,
          sproutTitle: sprout.title,
          twigLabel,
        })
      }
    }
  }

  // Sort reverse chronological and cache
  waterEntriesCache = entries.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
  return waterEntriesCache
}

export function canAffordWater(cost: number = 1): boolean {
  return getWaterAvailable() >= cost
}

// spendWater now just validates - the actual "spending" happens when waterEntry is added
export function spendWater(cost: number = 1): boolean {
  return canAffordWater(cost)
}

// Check if a sprout was watered this week (for per-sprout weekly cooldown)
// Sprouts only need watering once per week - prevents fatigue
export function wasWateredThisWeek(sprout: Sprout): boolean {
  if (!sprout.waterEntries?.length) return false
  const resetTime = getWeekResetTime()
  return sprout.waterEntries.some(entry => new Date(entry.timestamp) >= resetTime)
}

// --- Sun API (Derived from logs) ---
// Sun availability is derived from sunLog entries.
// No stored counter - timestamps are the truth.

// Count sun entries since this week's reset time (Sunday 6am)
export function getSunUsedThisWeek(): number {
  const resetTime = getWeekResetTime()
  return sunLog.filter(entry => new Date(entry.timestamp) >= resetTime).length
}

export function getSunAvailable(): number {
  return Math.max(0, sunState.capacity - getSunUsedThisWeek())
}

export function getSunCapacity(): number {
  return sunState.capacity
}

export function canAffordSun(cost: number = 1): boolean {
  return getSunAvailable() >= cost
}

// spendSun now just validates - the actual "spending" happens when sunLog entry is added
export function spendSun(cost: number = 1): boolean {
  return canAffordSun(cost)
}

// --- Reset All Resources ---

export function resetResources(): void {
  // Reset clock offset first so dates are real time
  clockOffset = 0

  soilState.available = DEFAULT_SOIL_CAPACITY
  soilState.capacity = DEFAULT_SOIL_CAPACITY
  waterState.available = DEFAULT_WATER_CAPACITY
  waterState.capacity = DEFAULT_WATER_CAPACITY
  waterState.lastResetDate = getDateString(new Date())
  sunState.available = DEFAULT_SUN_CAPACITY
  sunState.capacity = DEFAULT_SUN_CAPACITY
  sunState.lastResetDate = getWeekString(new Date())

  // Clear sun log so wasShoneThisWeek() returns false
  sunLog.length = 0

  // Clear soil log
  soilLog.length = 0

  // Clear water entries from all sprouts
  for (const data of Object.values(nodeState)) {
    if (data.sprouts) {
      for (const sprout of data.sprouts) {
        sprout.waterEntries = []
      }
    }
  }

  // Invalidate water count cache
  invalidateWaterCountCache()

  saveResourceState()
  saveState()
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

// Leaf status is now derived from sprouts, not stored
// Helper to check if a leaf has active sprouts
export function isLeafActive(sprouts: Sprout[], leafId: string): boolean {
  return getSproutsByLeaf(sprouts, leafId).some(s => s.state === 'active')
}

export function createLeaf(twigId: string, name: string): Leaf {
  if (!nodeState[twigId]) {
    nodeState[twigId] = { label: '', note: '' }
  }
  if (!nodeState[twigId].leaves) {
    nodeState[twigId].leaves = []
  }

  const leaf: Leaf = {
    id: generateLeafId(),
    name,
    createdAt: new Date().toISOString(),
  }

  nodeState[twigId].leaves.push(leaf)
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

  invalidateWaterCountCache()
  saveState()
  return true
}

// Add a sun entry to the global shine log
// Includes context about the randomly selected twig or leaf
export function addSunEntry(
  content: string,
  prompt: string | undefined,
  context: SunEntry['context']
): void {
  sunLog.push({
    timestamp: getDebugDate().toISOString(),
    content,
    prompt,
    context,
  })
  saveState()
}

export function getSunLog(): SunEntry[] {
  return sunLog
}

export function wasShoneThisWeek(): boolean {
  if (!sunLog.length) return false

  const thisWeek = getWeekString(getDebugDate())
  return sunLog.some(entry => {
    const entryWeek = getWeekString(new Date(entry.timestamp))
    return entryWeek === thisWeek
  })
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
    leaves?: unknown
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

  // Check for existing leaves array
  let leaves: Leaf[] | undefined
  if (Array.isArray(payload.leaves)) {
    leaves = payload.leaves.filter((l): l is Leaf =>
      l && typeof l === 'object' &&
      typeof l.id === 'string'
    )
    if (leaves.length === 0) leaves = undefined
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

  if (!label && !note && !sprouts && !leaves) return null
  return { label, note, sprouts, leaves }
}

// Preset labels are the permanent map structure - twigs/branches/trunk labels never change
const presetLabels: Record<string, { label: string; note: string }> = {}
const circles = (presetData as { circles?: Record<string, { label?: string; note?: string }> }).circles
if (circles) {
  Object.entries(circles).forEach(([key, value]) => {
    if (value && typeof value === 'object') {
      const label = typeof value.label === 'string' ? value.label : ''
      const note = typeof value.note === 'string' ? value.note : ''
      presetLabels[key] = { label, note }
    }
  })
}
// Preset loaded - 73 nodes of permanent map structure

// Get the permanent label for a node from the preset
export function getPresetLabel(nodeId: string): string {
  return presetLabels[nodeId]?.label || ''
}

// Get the permanent note for a node from the preset
export function getPresetNote(nodeId: string): string {
  return presetLabels[nodeId]?.note || ''
}

function loadPreset(): Record<string, NodeData> {
  // Convert preset labels to NodeData format
  const preset: Record<string, NodeData> = {}
  Object.entries(presetLabels).forEach(([key, value]) => {
    if (value.label || value.note) {
      preset[key] = { label: value.label, note: value.note }
    }
  })
  return preset
}

function loadState(): Record<string, NodeData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      // No saved data - load from preset
      return loadPreset()
    }
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

      // If no data was loaded (e.g., empty object), load preset
      if (Object.keys(nextState).length === 0) {
        return loadPreset()
      }

      // Save migrated data back if version changed
      if (!parsed._version || parsed._version < CURRENT_SCHEMA_VERSION) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          _version: CURRENT_SCHEMA_VERSION,
          nodes: nextState,
        }))
      }

      return nextState
    }
  } catch (error) {
    console.warn('Could not read saved notes', error)
  }
  // Fallback to preset if parsing failed
  return loadPreset()
}

export const nodeState: Record<string, NodeData> = loadState()
export let lastSavedAt: Date | null = null

// Global sun log - philosophical reflections on randomly selected twigs/leaves
function loadSunLog(): SunEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.sunLog && Array.isArray(parsed.sunLog)) {
        return parsed.sunLog
      }
    }
  } catch (error) {
    console.warn('Could not load sun log', error)
  }
  return []
}

export const sunLog: SunEntry[] = loadSunLog()

// Global soil log - tracks soil gains and losses
function loadSoilLog(): SoilEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.soilLog && Array.isArray(parsed.soilLog)) {
        return parsed.soilLog
      }
    }
  } catch (error) {
    console.warn('Could not load soil log', error)
  }
  return []
}

export const soilLog: SoilEntry[] = loadSoilLog()

// Add a soil entry to the log
export function addSoilEntry(amount: number, reason: string, context?: string): void {
  soilLog.push({
    timestamp: getDebugDate().toISOString(),
    amount,
    reason,
    context,
  })
  // Don't call saveState here - it will be called by the caller
}

// Callbacks for storage errors - set by main.ts
let onQuotaError: (() => void) | null = null
let onSaveError: ((error: unknown) => void) | null = null

// Retry queue for failed saves
let pendingSave = false
let saveRetryTimeout: number | null = null
const SAVE_RETRY_DELAY = 5000 // 5 seconds

function scheduleSaveRetry(): void {
  if (saveRetryTimeout) return
  pendingSave = true
  saveRetryTimeout = window.setTimeout(() => {
    saveRetryTimeout = null
    if (pendingSave) {
      pendingSave = false
      saveState()
    }
  }, SAVE_RETRY_DELAY)
}

export function setStorageErrorCallbacks(
  quotaCallback: () => void,
  errorCallback?: (error: unknown) => void
): void {
  onQuotaError = quotaCallback
  onSaveError = errorCallback ?? null
}

export function saveState(onSaved?: () => void): StorageResult {
  // Save with version for future migrations
  // No caps on logs - full history preserved for accurate state reconstruction
  const data = JSON.stringify({
    _version: CURRENT_SCHEMA_VERSION,
    nodes: nodeState,
    sunLog,
    soilLog,
  })

  const result = safeSetItem(STORAGE_KEY, data)

  if (result.success) {
    lastSavedAt = new Date()
    pendingSave = false // Clear any pending retry
    onSaved?.()
  } else if (result.isQuotaError) {
    console.warn('localStorage quota exceeded')
    onQuotaError?.()
    // Don't retry quota errors - user needs to clear space
  } else {
    console.warn('Could not save notes - will retry')
    onSaveError?.(new Error('Storage unavailable'))
    scheduleSaveRetry() // Schedule retry for transient errors
  }

  return result
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

let hoveredTwigId: string | null = null

export function getHoveredTwigId(): string | null {
  return hoveredTwigId
}

export function setHoveredTwigId(id: string | null): void {
  hoveredTwigId = id
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

// --- Notification Settings ---
// Stored separately from main state for cleaner separation
// Backend integration comes later - this is just local storage for now

const SETTINGS_STORAGE_KEY = 'trunk-settings-v1'

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  email: '',
  checkInFrequency: 'off',
  preferredTime: 'morning',
  events: {
    harvestReady: true,
    shineAvailable: true,
  },
}

function loadNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // Merge with defaults to handle any missing fields
      return {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...parsed,
        events: {
          ...DEFAULT_NOTIFICATION_SETTINGS.events,
          ...parsed?.events,
        },
      }
    }
  } catch (error) {
    console.warn('Could not load notification settings', error)
  }
  return { ...DEFAULT_NOTIFICATION_SETTINGS }
}

let notificationSettings: NotificationSettings = loadNotificationSettings()

export function getNotificationSettings(): NotificationSettings {
  return notificationSettings
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  notificationSettings = settings
  const result = safeSetItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  if (!result.success && result.isQuotaError) {
    console.warn('localStorage quota exceeded while saving settings')
    onQuotaError?.()
  }
  // TODO: sync settings to backend when available
}
