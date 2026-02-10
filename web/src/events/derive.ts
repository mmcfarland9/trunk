/**
 * State derivation from event log.
 *
 * This is the core of event sourcing: all state is computed by replaying events.
 * The event log is immutable - we never modify events, only append new ones.
 */

import type { TrunkEvent } from './types'
import type { SproutSeason, SproutEnvironment, Sprout, WaterEntry, SunEntry } from '../types'
import constants from '../../../shared/constants.json'
import { getTodayResetTime, getWeekResetTime } from '../utils/calculations'

// Constants from shared config
const STARTING_CAPACITY = constants.soil.startingCapacity
const SOIL_RECOVERY_PER_WATER = constants.soil.recoveryRates.waterUse
const SOIL_RECOVERY_PER_SUN = constants.soil.recoveryRates.sunUse
const WATER_DAILY_CAPACITY = constants.water.dailyCapacity
const SUN_WEEKLY_CAPACITY = constants.sun.weeklyCapacity

/**
 * Derived sprout state (computed from events)
 */
export interface DerivedSprout {
  id: string
  twigId: string
  title: string
  season: SproutSeason
  environment: SproutEnvironment
  soilCost: number
  leafId?: string
  bloomWither?: string
  bloomBudding?: string
  bloomFlourish?: string
  // Derived state
  state: 'active' | 'completed' // No draft, no failed
  plantedAt: string
  harvestedAt?: string
  result?: number
  reflection?: string
  waterEntries: WaterEntry[]
}

/**
 * Derived leaf state
 */
export interface DerivedLeaf {
  id: string
  twigId: string
  name: string
  createdAt: string
}

/**
 * Full derived state from event log
 */
export interface DerivedState {
  // Resources
  soilCapacity: number
  soilAvailable: number
  // Entities
  sprouts: Map<string, DerivedSprout>
  leaves: Map<string, DerivedLeaf>
  // Logs (for display)
  sunEntries: SunEntry[]
}

/**
 * Derive complete state from event log.
 * This replays all events to compute current state.
 */
export function deriveState(events: readonly TrunkEvent[]): DerivedState {
  let soilCapacity = STARTING_CAPACITY
  let soilAvailable = STARTING_CAPACITY

  const sprouts = new Map<string, DerivedSprout>()
  const leaves = new Map<string, DerivedLeaf>()
  const sunEntries: SunEntry[] = []

  // Sort events by timestamp to ensure correct ordering
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  for (const event of sortedEvents) {
    switch (event.type) {
      case 'sprout_planted': {
        // Spend soil (clamped to 0 minimum)
        soilAvailable = Math.max(0, soilAvailable - event.soilCost)

        // Create sprout
        sprouts.set(event.sproutId, {
          id: event.sproutId,
          twigId: event.twigId,
          title: event.title,
          season: event.season,
          environment: event.environment,
          soilCost: event.soilCost,
          leafId: event.leafId,
          bloomWither: event.bloomWither,
          bloomBudding: event.bloomBudding,
          bloomFlourish: event.bloomFlourish,
          state: 'active',
          plantedAt: event.timestamp,
          waterEntries: [],
        })
        break
      }

      case 'sprout_watered': {
        const sprout = sprouts.get(event.sproutId)
        if (sprout) {
          // DerivedSprout objects are freshly created per deriveState() call,
          // so .push() here mutates local working data, not cached/external state.
          sprout.waterEntries.push({
            timestamp: event.timestamp,
            content: event.content,
            prompt: event.prompt,
          })
        }
        // Soil recovery from watering
        soilAvailable = Math.min(soilAvailable + SOIL_RECOVERY_PER_WATER, soilCapacity)
        break
      }

      case 'sprout_harvested': {
        const sprout = sprouts.get(event.sproutId)
        if (sprout) {
          sprout.state = 'completed'
          sprout.result = event.result
          sprout.reflection = event.reflection
          sprout.harvestedAt = event.timestamp
        }

        // Return soil cost + gain capacity
        const returnedSoil = sprout?.soilCost ?? 0
        soilCapacity += event.capacityGained
        soilAvailable = Math.min(soilAvailable + returnedSoil, soilCapacity)
        break
      }

      case 'sprout_uprooted': {
        // Return partial soil
        soilAvailable = Math.min(soilAvailable + event.soilReturned, soilCapacity)
        // Remove sprout from active tracking
        sprouts.delete(event.sproutId)
        break
      }

      case 'sun_shone': {
        sunEntries.push({
          timestamp: event.timestamp,
          content: event.content,
          prompt: event.prompt,
          context: {
            twigId: event.twigId,
            twigLabel: event.twigLabel,
          },
        })
        // Soil recovery from sun
        soilAvailable = Math.min(soilAvailable + SOIL_RECOVERY_PER_SUN, soilCapacity)
        break
      }

      case 'leaf_created': {
        leaves.set(event.leafId, {
          id: event.leafId,
          twigId: event.twigId,
          name: event.name,
          createdAt: event.timestamp,
        })
        break
      }
    }
  }

  return {
    soilCapacity,
    soilAvailable,
    sprouts,
    leaves,
    sunEntries,
  }
}

// Re-export from calculations (single source of truth for reset times)
export { getTodayResetTime, getWeekResetTime } from '../utils/calculations'

/**
 * Derive water available from events.
 * Water = capacity - waters since 6am today
 */
export function deriveWaterAvailable(events: readonly TrunkEvent[], now: Date = new Date()): number {
  const resetTime = getTodayResetTime(now)

  const waterCount = events.filter(
    (e) => e.type === 'sprout_watered' && new Date(e.timestamp) >= resetTime
  ).length

  return Math.max(0, WATER_DAILY_CAPACITY - waterCount)
}

/**
 * Derive sun available from events.
 * Sun = capacity - shines since Sunday 6am
 */
export function deriveSunAvailable(events: readonly TrunkEvent[], now: Date = new Date()): number {
  const resetTime = getWeekResetTime(now)

  const sunCount = events.filter(
    (e) => e.type === 'sun_shone' && new Date(e.timestamp) >= resetTime
  ).length

  return Math.max(0, SUN_WEEKLY_CAPACITY - sunCount)
}

/**
 * Check if a sprout was watered this week
 */
export function wasSproutWateredThisWeek(
  events: readonly TrunkEvent[],
  sproutId: string,
  now: Date = new Date()
): boolean {
  const resetTime = getWeekResetTime(now)

  return events.some(
    (e) =>
      e.type === 'sprout_watered' &&
      e.sproutId === sproutId &&
      new Date(e.timestamp) >= resetTime
  )
}

/**
 * Get all sprouts for a specific twig
 */
export function getSproutsForTwig(state: DerivedState, twigId: string): DerivedSprout[] {
  return Array.from(state.sprouts.values()).filter((s) => s.twigId === twigId)
}

/**
 * Get all leaves for a specific twig
 */
export function getLeavesForTwig(state: DerivedState, twigId: string): DerivedLeaf[] {
  return Array.from(state.leaves.values()).filter((l) => l.twigId === twigId)
}

/**
 * Get active sprouts (not yet harvested)
 */
export function getActiveSprouts(state: DerivedState): DerivedSprout[] {
  return Array.from(state.sprouts.values()).filter((s) => s.state === 'active')
}

/**
 * Get completed sprouts (harvested)
 */
export function getCompletedSprouts(state: DerivedState): DerivedSprout[] {
  return Array.from(state.sprouts.values()).filter((s) => s.state === 'completed')
}

/**
 * Convert derived sprout to legacy Sprout type for backwards compatibility
 */
export function toSprout(derived: DerivedSprout): Sprout {
  return {
    id: derived.id,
    title: derived.title,
    season: derived.season,
    environment: derived.environment,
    state: derived.state,
    soilCost: derived.soilCost,
    createdAt: derived.plantedAt,
    activatedAt: derived.plantedAt,
    plantedAt: derived.plantedAt,
    endDate: calculateEndDate(derived.plantedAt, derived.season),
    result: derived.result,
    reflection: derived.reflection,
    completedAt: derived.harvestedAt,
    harvestedAt: derived.harvestedAt,
    bloomWither: derived.bloomWither,
    bloomBudding: derived.bloomBudding,
    bloomFlourish: derived.bloomFlourish,
    leafId: derived.leafId,
    waterEntries: derived.waterEntries,
  }
}

/**
 * Calculate end date for a sprout based on season
 */
function calculateEndDate(plantedAt: string, season: SproutSeason): string {
  const start = new Date(plantedAt)
  const durationMs = constants.seasons[season].durationMs
  const end = new Date(start.getTime() + durationMs)
  // Set to 9am CST (UTC-6 = 15:00 UTC)
  end.setUTCHours(15, 0, 0, 0)
  return end.toISOString()
}

/**
 * Get a leaf by its ID
 */
export function getLeafById(state: DerivedState, leafId: string): DerivedLeaf | undefined {
  return state.leaves.get(leafId)
}

/**
 * Get all sprouts for a specific leaf
 */
export function getSproutsByLeaf(state: DerivedState, leafId: string): DerivedSprout[] {
  return Array.from(state.sprouts.values()).filter((s) => s.leafId === leafId)
}

/**
 * Check if any sun was shone this week
 */
export function wasShoneThisWeek(events: readonly TrunkEvent[], now: Date = new Date()): boolean {
  const resetTime = getWeekResetTime(now)
  return events.some(
    (e) => e.type === 'sun_shone' && new Date(e.timestamp) >= resetTime
  )
}

/**
 * Generate a unique sprout ID
 */
export function generateSproutId(): string {
  return `sprout-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Generate a unique leaf ID
 */
export function generateLeafId(): string {
  return `leaf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Get all water entries across all sprouts
 */
export function getAllWaterEntries(state: DerivedState, getTwigLabel?: (twigId: string) => string): (WaterEntry & { sproutId: string, sproutTitle: string, twigId: string, twigLabel: string })[] {
  const entries: (WaterEntry & { sproutId: string, sproutTitle: string, twigId: string, twigLabel: string })[] = []
  for (const sprout of state.sprouts.values()) {
    for (const entry of sprout.waterEntries) {
      entries.push({
        ...entry,
        sproutId: sprout.id,
        sproutTitle: sprout.title,
        twigId: sprout.twigId,
        twigLabel: getTwigLabel ? getTwigLabel(sprout.twigId) : sprout.twigId,
      })
    }
  }
  // Sort by timestamp descending (newest first)
  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

/**
 * Soil log entry derived from events
 */
interface DerivedSoilEntry {
  timestamp: string
  amount: number
  reason: string
  context?: string
}

/**
 * Derive soil log from events
 * Shows how soil changed over time
 */
export function deriveSoilLog(events: readonly TrunkEvent[]): DerivedSoilEntry[] {
  const log: DerivedSoilEntry[] = []

  // Track sprout titles for context
  const sproutTitles = new Map<string, string>()

  for (const event of events) {
    switch (event.type) {
      case 'sprout_planted': {
        sproutTitles.set(event.sproutId, event.title)
        log.push({
          timestamp: event.timestamp,
          amount: -event.soilCost,
          reason: 'Planted sprout',
          context: event.title,
        })
        break
      }

      case 'sprout_watered': {
        log.push({
          timestamp: event.timestamp,
          amount: SOIL_RECOVERY_PER_WATER,
          reason: 'Watered sprout',
          context: sproutTitles.get(event.sproutId),
        })
        break
      }

      case 'sprout_harvested': {
        const title = sproutTitles.get(event.sproutId)
        // Return soil + capacity gain
        log.push({
          timestamp: event.timestamp,
          amount: event.capacityGained,
          reason: `Harvested (${event.result}/5)`,
          context: title,
        })
        break
      }

      case 'sprout_uprooted': {
        const title = sproutTitles.get(event.sproutId)
        log.push({
          timestamp: event.timestamp,
          amount: event.soilReturned,
          reason: 'Uprooted sprout',
          context: title,
        })
        break
      }

      case 'sun_shone': {
        log.push({
          timestamp: event.timestamp,
          amount: SOIL_RECOVERY_PER_SUN,
          reason: 'Sun reflection',
          context: event.twigLabel,
        })
        break
      }
    }
  }

  return log
}
