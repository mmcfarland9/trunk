/**
 * State derivation from event log.
 *
 * This is the core of event sourcing: all state is computed by replaying events.
 * The event log is immutable - we never modify events, only append new ones.
 */

import type { TrunkEvent } from './types'
import type { SproutSeason, SproutEnvironment, Sprout, WaterEntry, SunEntry } from '../types'
import constants from '../../../shared/constants.json'

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
export function deriveState(events: TrunkEvent[]): DerivedState {
  let soilCapacity = STARTING_CAPACITY
  let soilAvailable = STARTING_CAPACITY

  const sprouts = new Map<string, DerivedSprout>()
  const leaves = new Map<string, DerivedLeaf>()
  const sunEntries: SunEntry[] = []

  for (const event of events) {
    switch (event.type) {
      case 'sprout_planted': {
        // Spend soil
        soilAvailable -= event.soilCost

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

/**
 * Get reset time for daily water (6am local time)
 */
export function getTodayResetTime(now: Date = new Date()): Date {
  const reset = new Date(now)
  reset.setHours(6, 0, 0, 0)

  // If before 6am, reset was yesterday
  if (now < reset) {
    reset.setDate(reset.getDate() - 1)
  }
  return reset
}

/**
 * Get reset time for weekly sun (Sunday 6am local time)
 */
export function getWeekResetTime(now: Date = new Date()): Date {
  const reset = new Date(now)
  reset.setHours(6, 0, 0, 0)

  // Find most recent Sunday
  const daysSinceSunday = reset.getDay()
  reset.setDate(reset.getDate() - daysSinceSunday)

  // If today is Sunday but before 6am, go back a week
  if (now.getDay() === 0 && now < reset) {
    reset.setDate(reset.getDate() - 7)
  }

  return reset
}

/**
 * Derive water available from events.
 * Water = capacity - waters since 6am today
 */
export function deriveWaterAvailable(events: TrunkEvent[], now: Date = new Date()): number {
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
export function deriveSunAvailable(events: TrunkEvent[], now: Date = new Date()): number {
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
  events: TrunkEvent[],
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
