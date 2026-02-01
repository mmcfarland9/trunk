/**
 * Resource management for soil, water, and sun.
 *
 * Philosophy: Resources represent limited focus/energy. Start small, grow through success.
 * Earn your way to bigger goals through consistent small wins.
 *
 * === THE BONSAI MODEL ===
 * Capacity grows slowly over years, with diminishing returns as you approach max.
 * Max capacity (120) is a lifetime goal - essentially unreachable.
 * Realistic ceiling after ~50 years of effort is ~100 capacity.
 * See shared/formulas.md for full math and examples.
 */

import type { SoilState, WaterState, SunState, SproutSeason, SproutEnvironment } from '../types'
import {
  SOIL_STARTING_CAPACITY,
  SOIL_MAX_CAPACITY,
  SOIL_WATER_RECOVERY,
  SOIL_SUN_RECOVERY,
  PLANTING_COSTS,
  ENVIRONMENT_MULTIPLIERS,
  RESULT_MULTIPLIERS,
  SEASONS,
  WATER_DAILY_CAPACITY,
  WATER_RESET_HOUR,
  SUN_WEEKLY_CAPACITY,
  STORAGE_KEYS,
} from '../generated/constants'
import { safeSetItem } from '../utils/safe-storage'

// --- Constants ---

const DEFAULT_SOIL_CAPACITY = SOIL_STARTING_CAPACITY
const MAX_SOIL_CAPACITY = SOIL_MAX_CAPACITY
const SOIL_RECOVERY_PER_WATER = SOIL_WATER_RECOVERY
const SOIL_RECOVERY_PER_SUN = SOIL_SUN_RECOVERY
const DEFAULT_WATER_CAPACITY = WATER_DAILY_CAPACITY
const DEFAULT_SUN_CAPACITY = SUN_WEEKLY_CAPACITY
const RESET_HOUR = WATER_RESET_HOUR

// Legacy keys for migration from old separate storage
const RESOURCES_STORAGE_KEY = STORAGE_KEYS.resources
const LEGACY_SOIL_KEY = 'trunk-soil-v1'
const LEGACY_WATER_KEY = 'trunk-water-v1'
const LEGACY_SUN_KEY = 'trunk-sun-v1'

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

export function setDebugDate(date: Date): void {
  clockOffset = date.getTime() - Date.now()
}

export function resetClockOffset(): void {
  clockOffset = 0
}

// --- Reset Time System ---

/**
 * Get the most recent daily reset time (6am today or yesterday if before 6am)
 */
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

/**
 * Get the most recent weekly reset time (Sunday at 6am)
 */
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

/**
 * Get next daily reset time (tomorrow at 6am, or today at 6am if before 6am)
 */
export function getNextWaterReset(): Date {
  const reset = getTodayResetTime()
  reset.setDate(reset.getDate() + 1)
  return reset
}

/**
 * Get next weekly reset time (next Sunday at 6am)
 */
export function getNextSunReset(): Date {
  const reset = getWeekResetTime()
  reset.setDate(reset.getDate() + 7)
  return reset
}

/**
 * Format reset time as "Resets Wed 01/22 at 6:00 AM"
 */
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

// --- Utility Functions ---

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0] // YYYY-MM-DD
}

export function getWeekString(date: Date): string {
  // Get ISO week number for weekly reset
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${weekNo}`
}

// --- Resource State Types ---

type ResourceStoredState = {
  soil: SoilState
  water: WaterState & { lastResetDate?: string }
  sun: SunState & { lastResetDate?: string }
}

// --- Resource State Loading/Saving ---

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

// Callback for quota errors - set by node-state.ts
let onQuotaError: (() => void) | null = null

export function setResourceQuotaErrorCallback(callback: () => void): void {
  onQuotaError = callback
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

// --- Resource State ---

const resourceState: ResourceStoredState = loadResourceState()

// Convenience aliases for backward compatibility
const soilState = resourceState.soil
const waterState = resourceState.water
const sunState = resourceState.sun

// --- Soil Calculation Functions ---

export function calculateSoilCost(season: SproutSeason, environment: SproutEnvironment): number {
  return PLANTING_COSTS[season][environment]
}

/**
 * Calculate capacity reward with diminishing returns.
 * As you approach MAX_SOIL_CAPACITY, growth slows toward zero.
 */
export function calculateCapacityReward(
  season: SproutSeason,
  environment: SproutEnvironment,
  result: number,
  currentCapacity: number
): number {
  const base = SEASONS[season].baseReward
  const envMult = ENVIRONMENT_MULTIPLIERS[environment]
  const resultMult = RESULT_MULTIPLIERS[result as keyof typeof RESULT_MULTIPLIERS] ?? RESULT_MULTIPLIERS[3]

  // Diminishing returns (exponent 1.5) - growth slows as you approach max
  // More generous early, still meaningful late-game slowdown
  const diminishingFactor = Math.max(0, Math.pow(1 - (currentCapacity / MAX_SOIL_CAPACITY), 1.5))

  return base * envMult * resultMult * diminishingFactor
}

/**
 * Legacy function for backwards compatibility - returns base reward without diminishing
 */
export function getCapacityReward(environment: SproutEnvironment, season: SproutSeason): number {
  return SEASONS[season].baseReward * ENVIRONMENT_MULTIPLIERS[environment]
}

export function getMaxSoilCapacity(): number {
  return MAX_SOIL_CAPACITY
}

export function getSoilRecoveryRate(): number {
  return SOIL_RECOVERY_PER_WATER
}

export function getSunRecoveryRate(): number {
  return SOIL_RECOVERY_PER_SUN
}

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

// Callback for adding soil entries - set by node-state.ts
let addSoilEntryCallback: ((amount: number, reason: string, context?: string) => void) | null = null

export function setAddSoilEntryCallback(callback: (amount: number, reason: string, context?: string) => void): void {
  addSoilEntryCallback = callback
}

export function spendSoil(cost: number, reason?: string, context?: string): boolean {
  if (!canAffordSoil(cost)) return false
  soilState.available -= cost
  if (reason) {
    addSoilEntryCallback?.(-cost, reason, context)
  }
  saveResourceState()
  return true
}

export function recoverSoil(amount: number, capacityBonus: number = 0, reason?: string, context?: string): void {
  const prevAvailable = soilState.available
  soilState.available = Math.min(soilState.available + amount, soilState.capacity + capacityBonus)
  const actualRecovered = soilState.available - prevAvailable
  if (reason && actualRecovered > 0) {
    addSoilEntryCallback?.(actualRecovered, reason, context)
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
    addSoilEntryCallback?.(actualRecovered, reason, context)
  }
  saveResourceState()
}

// --- Water API ---

// Water count calculation callback - set by node-state.ts
let getWaterUsedTodayCallback: (() => number) | null = null

export function setGetWaterUsedTodayCallback(callback: () => number): void {
  getWaterUsedTodayCallback = callback
}

export function getWaterAvailable(): number {
  const used = getWaterUsedTodayCallback?.() ?? 0
  return Math.max(0, waterState.capacity - used)
}

export function getWaterCapacity(): number {
  return waterState.capacity
}

export function canAffordWater(cost: number = 1): boolean {
  return getWaterAvailable() >= cost
}

/**
 * spendWater now just validates - the actual "spending" happens when waterEntry is added
 */
export function spendWater(cost: number = 1): boolean {
  return canAffordWater(cost)
}

// --- Sun API ---

// Sun count calculation callback - set by node-state.ts
let getSunUsedThisWeekCallback: (() => number) | null = null

export function setGetSunUsedThisWeekCallback(callback: () => number): void {
  getSunUsedThisWeekCallback = callback
}

export function getSunAvailable(): number {
  const used = getSunUsedThisWeekCallback?.() ?? 0
  return Math.max(0, sunState.capacity - used)
}

export function getSunCapacity(): number {
  return sunState.capacity
}

export function canAffordSun(cost: number = 1): boolean {
  return getSunAvailable() >= cost
}

/**
 * spendSun now just validates - the actual "spending" happens when sunLog entry is added
 */
export function spendSun(cost: number = 1): boolean {
  return canAffordSun(cost)
}

// --- Reset Resources ---

// Callbacks for resetting node state data - set by node-state.ts
let clearWaterEntriesCallback: (() => void) | null = null
let clearSunLogCallback: (() => void) | null = null
let clearSoilLogCallback: (() => void) | null = null
let saveStateCallback: (() => void) | null = null

export function setResetCallbacks(callbacks: {
  clearWaterEntries: () => void
  clearSunLog: () => void
  clearSoilLog: () => void
  saveState: () => void
}): void {
  clearWaterEntriesCallback = callbacks.clearWaterEntries
  clearSunLogCallback = callbacks.clearSunLog
  clearSoilLogCallback = callbacks.clearSoilLog
  saveStateCallback = callbacks.saveState
}

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

  // Clear logs via callbacks
  clearSunLogCallback?.()
  clearSoilLogCallback?.()
  clearWaterEntriesCallback?.()

  saveResourceState()
  saveStateCallback?.()
}
