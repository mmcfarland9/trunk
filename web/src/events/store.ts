/**
 * Event Store - manages the event log and derived state.
 *
 * This is the central state management for the event-sourced system.
 * - Events are append-only and immutable
 * - State is derived by replaying events
 * - Derived state is cached and invalidated on new events
 */

import type { TrunkEvent } from './types'
import { validateEvent } from './types'
export { validateEvent } from './types'
import type { DerivedState, WateringStreak } from './derive'
import {
  deriveState,
  deriveWaterAvailable,
  deriveSunAvailable,
  deriveWateringStreak,
  wasSproutWateredThisWeek,
  wasSproutWateredToday,
  getTodayResetTime,
  getWeekResetTime,
} from './derive'
import { safeSetItem } from '../utils/safe-storage'
import sharedConstants from '../../../shared/constants.json'

const STORAGE_KEY = sharedConstants.storage.keys.events

// The event log - source of truth
let events: TrunkEvent[] = []

// Cached derived state (invalidated on event append)
// REVIEW: Dirty flag approach — marks state stale on append, re-derives on next read.
// Alternative: full incremental derivation (SKIP-level complexity).
let cachedState: DerivedState | null = null

// Cached water/sun availability (invalidated on relevant events or reset boundary)
let cachedWaterAvailable: number | null = null
let cachedSunAvailable: number | null = null
let cachedWaterAt: number | null = null
let cachedSunAt: number | null = null
let cachedStreak: WateringStreak | null = null

// Error callbacks
let onQuotaError: (() => void) | null = null
let onSaveError: ((error: unknown) => void) | null = null

// Sync callback - called when events are appended
let onEventAppended: ((event: TrunkEvent) => void) | null = null

/**
 * Load events from localStorage
 */
function loadEvents(): TrunkEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const valid: TrunkEvent[] = []
        for (const item of parsed) {
          if (validateEvent(item)) {
            valid.push(item)
          } else {
          }
        }
        return valid
      }
    }
  } catch (_error) {}
  return []
}

/**
 * Save events to localStorage
 */
function saveEvents(): void {
  const result = safeSetItem(STORAGE_KEY, JSON.stringify(events))
  if (!result.success) {
    if (result.isQuotaError) {
      onQuotaError?.()
    } else {
      onSaveError?.(new Error('Storage unavailable'))
    }
  }
}

/**
 * Initialize the event store
 */
export function initEventStore(): void {
  events = loadEvents()
  invalidateCache()
}

/**
 * Set error callbacks
 */
export function setEventStoreErrorCallbacks(
  quotaCallback: () => void,
  errorCallback?: (error: unknown) => void,
): void {
  onQuotaError = quotaCallback
  onSaveError = errorCallback ?? null
}

/**
 * Set sync callback - called when events are appended
 */
export function setEventSyncCallback(callback: ((event: TrunkEvent) => void) | null): void {
  onEventAppended = callback
}

/**
 * Invalidate all cached state
 */
function invalidateCache(): void {
  cachedState = null
  cachedWaterAvailable = null
  cachedSunAvailable = null
  cachedWaterAt = null
  cachedSunAt = null
  cachedStreak = null
}

/**
 * Selectively invalidate caches based on event type.
 * Derived state is always invalidated. Water/sun/streak caches are
 * only cleared when the event type could affect their values.
 */
function invalidateCacheForEvent(eventType: string): void {
  cachedState = null
  if (eventType === 'sprout_watered') {
    cachedWaterAvailable = null
    cachedWaterAt = null
    cachedStreak = null
  } else if (eventType === 'sun_shone') {
    cachedSunAvailable = null
    cachedSunAt = null
  }
}

/**
 * Append an event to the log
 */
export function appendEvent(event: TrunkEvent): void {
  events.push(event)
  invalidateCacheForEvent(event.type)
  saveEvents()
  // Sync to cloud if callback is set
  onEventAppended?.(event)
}

/**
 * Append multiple events at once
 */
export function appendEvents(newEvents: TrunkEvent[]): void {
  // C16: Use loop instead of spread to avoid stack overflow on large arrays
  for (const e of newEvents) events.push(e)
  invalidateCache()
  saveEvents()
  // Sync each to cloud if callback is set
  if (onEventAppended) {
    for (const e of newEvents) onEventAppended?.(e)
  }
}

/**
 * Get the full event log (read-only).
 * Returns the internal array directly — TypeScript's `readonly` type prevents
 * mutation at compile time. Avoids O(n) copy + freeze on every call.
 */
export function getEvents(): readonly TrunkEvent[] {
  return events
}

/**
 * Get derived state (cached)
 */
export function getState(): DerivedState {
  if (!cachedState) {
    cachedState = deriveState(events)
  }
  return cachedState
}

/**
 * Get water available (cached, invalidates on daily reset boundary)
 */
export function getWaterAvailable(now: Date = new Date()): number {
  const resetMs = getTodayResetTime(now).getTime()
  if (cachedWaterAvailable !== null && cachedWaterAt !== null && cachedWaterAt >= resetMs) {
    return cachedWaterAvailable
  }
  cachedWaterAvailable = deriveWaterAvailable(events, now)
  cachedWaterAt = now.getTime()
  return cachedWaterAvailable
}

/**
 * Get watering streak (cached, invalidates on new events)
 */
export function getWateringStreak(now: Date = new Date()): WateringStreak {
  if (!cachedStreak) {
    cachedStreak = deriveWateringStreak(events, now)
  }
  return cachedStreak
}

/**
 * Get sun available (cached, invalidates on weekly reset boundary)
 */
export function getSunAvailable(now: Date = new Date()): number {
  const resetMs = getWeekResetTime(now).getTime()
  if (cachedSunAvailable !== null && cachedSunAt !== null && cachedSunAt >= resetMs) {
    return cachedSunAvailable
  }
  cachedSunAvailable = deriveSunAvailable(events, now)
  cachedSunAt = now.getTime()
  return cachedSunAvailable
}

/**
 * Check if sprout was watered this week
 */
export function checkSproutWateredThisWeek(sproutId: string, now: Date = new Date()): boolean {
  return wasSproutWateredThisWeek(events, sproutId, now)
}

/**
 * Check if sprout was watered today (since 6am reset)
 */
export function checkSproutWateredToday(sproutId: string, now: Date = new Date()): boolean {
  return wasSproutWateredToday(events, sproutId, now)
}

// ============================================================================
// RESOURCE GETTERS - Read from derived state
// These replace the legacy localStorage-based resource functions
// ============================================================================

/**
 * Get soil available (derived from events)
 */
export function getSoilAvailable(): number {
  return getState().soilAvailable
}

/**
 * Get soil capacity (derived from events)
 */
export function getSoilCapacity(): number {
  return getState().soilCapacity
}

/**
 * Check if we can afford a soil cost
 */
export function canAffordSoil(cost: number): boolean {
  return getState().soilAvailable >= cost
}

/**
 * Check if we can afford water (have water available today)
 */
export function canAffordWater(cost: number = 1): boolean {
  return getWaterAvailable() >= cost
}

/**
 * Check if we can afford sun (have sun available this week)
 */
export function canAffordSun(cost: number = 1): boolean {
  return getSunAvailable() >= cost
}

/**
 * Get water capacity (constant from shared config)
 */
export function getWaterCapacity(): number {
  return sharedConstants.water.dailyCapacity
}

/**
 * Get sun capacity (constant from shared config)
 */
export function getSunCapacity(): number {
  return sharedConstants.sun.weeklyCapacity
}

/**
 * Clear all events (for testing/reset)
 */
export function clearEvents(): void {
  events = []
  invalidateCache()
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore
  }
}

/**
 * Replace all events (for import or full sync).
 * Validates events before storing; invalid events are filtered with a warning.
 */
export function replaceEvents(newEvents: TrunkEvent[]): void {
  const valid: TrunkEvent[] = []
  for (const event of newEvents) {
    if (validateEvent(event)) {
      valid.push(event)
    } else {
    }
  }
  events = valid
  invalidateCache()
  saveEvents()
}

/**
 * Get event count
 */
export function getEventCount(): number {
  return events.length
}

/**
 * Export events for backup
 */
export function exportEvents(): TrunkEvent[] {
  return [...events]
}
