/**
 * State derivation from event log.
 *
 * This is the core of event sourcing: all state is computed by replaying events.
 * The event log is immutable - we never modify events, only append new ones.
 */

import type { TrunkEvent } from './types'
import { EVENT_TYPES } from './types'
import type { SproutSeason, SproutEnvironment, Sprout, WaterEntry, SunEntry } from '../types'
import constants from '../../../shared/constants.json'
import { getTodayResetTime, getWeekResetTime } from '../utils/calculations'

// Constants from shared config
const STARTING_CAPACITY = constants.soil.startingCapacity
const MAX_SOIL_CAPACITY = constants.soil.maxCapacity
const SOIL_RECOVERY_PER_WATER = constants.soil.recoveryRates.waterUse
const SOIL_RECOVERY_PER_SUN = constants.soil.recoveryRates.sunUse
const WATER_DAILY_CAPACITY = constants.water.dailyCapacity
const SUN_WEEKLY_CAPACITY = constants.sun.weeklyCapacity

/**
 * Round soil values to 2 decimal places to prevent floating-point drift.
 */
function roundSoil(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Generate a deduplication key for an event.
 * Uses client_id if available, falls back to composite key.
 */
function getEventDedupeKey(event: TrunkEvent): string {
  if (event.client_id) return event.client_id
  let entityId = ''
  if ('sproutId' in event) entityId = event.sproutId
  else if ('leafId' in event) entityId = event.leafId
  else if ('twigId' in event) entityId = event.twigId
  return `${event.type}|${entityId}|${event.timestamp}`
}

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
  state: 'active' | 'completed' | 'uprooted'
  plantedAt: string
  harvestedAt?: string
  result?: number
  reflection?: string
  uprootedAt?: string
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
  // Indexes for O(1) lookups
  activeSproutsByTwig: Map<string, DerivedSprout[]>
  sproutsByTwig: Map<string, DerivedSprout[]>
  sproutsByLeaf: Map<string, DerivedSprout[]>
  leavesByTwig: Map<string, DerivedLeaf[]>
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

  // C13: Deduplicate events before replay to prevent double-counting
  const seenKeys = new Set<string>()
  const dedupedEvents = sortedEvents.filter(event => {
    const key = getEventDedupeKey(event)
    if (seenKeys.has(key)) return false
    seenKeys.add(key)
    return true
  })

  for (const event of dedupedEvents) {
    switch (event.type) {
      case EVENT_TYPES.SPROUT_PLANTED: {
        // Spend soil (clamped to 0 minimum)
        soilAvailable = roundSoil(Math.max(0, soilAvailable - event.soilCost))

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

      case EVENT_TYPES.SPROUT_WATERED: {
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
        // C2: Only recover soil if sprout exists and is active
        if (sprout && sprout.state === 'active') {
          soilAvailable = roundSoil(Math.min(soilAvailable + SOIL_RECOVERY_PER_WATER, soilCapacity))
        } else if (!sprout) {
          // Q8: Warn when event references missing sprout
          console.warn(`Skipping soil recovery for sprout_watered: sprout ${event.sproutId} not found`)
        }
        break
      }

      case EVENT_TYPES.SPROUT_HARVESTED: {
        const sprout = sprouts.get(event.sproutId)
        if (sprout) {
          sprout.state = 'completed'
          sprout.result = event.result
          sprout.reflection = event.reflection
          sprout.harvestedAt = event.timestamp

          // C3: Only gain capacity and return soil if sprout exists
          const returnedSoil = sprout.soilCost
          // C14: Clamp capacity to MAX_SOIL_CAPACITY (no rounding — capacity retains full precision)
          soilCapacity = Math.min(soilCapacity + event.capacityGained, MAX_SOIL_CAPACITY)
          soilAvailable = roundSoil(Math.min(soilAvailable + returnedSoil, soilCapacity))
        } else {
          // Q8: Warn when harvesting a non-existent sprout
          console.warn(`Skipping sprout_harvested: sprout ${event.sproutId} not found (timestamp: ${event.timestamp})`)
        }
        break
      }

      case EVENT_TYPES.SPROUT_UPROOTED: {
        // Return partial soil
        soilAvailable = roundSoil(Math.min(soilAvailable + event.soilReturned, soilCapacity))
        // Transition sprout to uprooted state (preserve all data)
        const sprout = sprouts.get(event.sproutId)
        if (sprout && sprout.state === 'active') {
          sprout.state = 'uprooted'
          sprout.uprootedAt = event.timestamp
        }
        break
      }

      case EVENT_TYPES.SUN_SHONE: {
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
        soilAvailable = roundSoil(Math.min(soilAvailable + SOIL_RECOVERY_PER_SUN, soilCapacity))
        break
      }

      case EVENT_TYPES.LEAF_CREATED: {
        leaves.set(event.leafId, {
          id: event.leafId,
          twigId: event.twigId,
          name: event.name,
          createdAt: event.timestamp,
        })
        break
      }

      default: {
        // Q8: Warn about unrecognized event types
        console.warn(`Skipping unknown event type: ${(event as TrunkEvent).type} (timestamp: ${(event as TrunkEvent).timestamp})`)
        break
      }
    }
  }

  // Build indexes for O(1) lookups
  const sproutsByTwig = new Map<string, DerivedSprout[]>()
  const activeSproutsByTwig = new Map<string, DerivedSprout[]>()
  const sproutsByLeaf = new Map<string, DerivedSprout[]>()
  const leavesByTwig = new Map<string, DerivedLeaf[]>()

  for (const sprout of sprouts.values()) {
    // sproutsByTwig
    const twigList = sproutsByTwig.get(sprout.twigId) || []
    twigList.push(sprout)
    sproutsByTwig.set(sprout.twigId, twigList)

    // activeSproutsByTwig
    if (sprout.state === 'active') {
      const activeList = activeSproutsByTwig.get(sprout.twigId) || []
      activeList.push(sprout)
      activeSproutsByTwig.set(sprout.twigId, activeList)
    }

    // sproutsByLeaf
    if (sprout.leafId) {
      const leafList = sproutsByLeaf.get(sprout.leafId) || []
      leafList.push(sprout)
      sproutsByLeaf.set(sprout.leafId, leafList)
    }
  }

  for (const leaf of leaves.values()) {
    const twigList = leavesByTwig.get(leaf.twigId) || []
    twigList.push(leaf)
    leavesByTwig.set(leaf.twigId, twigList)
  }

  return {
    soilCapacity,
    soilAvailable,
    sprouts,
    leaves,
    sunEntries,
    activeSproutsByTwig,
    sproutsByTwig,
    sproutsByLeaf,
    leavesByTwig,
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
 * Sun = capacity - shines since Monday 6am
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
 * Check if a sprout was watered today (since 6am reset)
 */
export function wasSproutWateredToday(
  events: readonly TrunkEvent[],
  sproutId: string,
  now: Date = new Date()
): boolean {
  const resetTime = getTodayResetTime(now)

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
  return state.sproutsByTwig.get(twigId) || []
}

/**
 * Get all leaves for a specific twig
 */
export function getLeavesForTwig(state: DerivedState, twigId: string): DerivedLeaf[] {
  return state.leavesByTwig.get(twigId) || []
}

/**
 * Get active sprouts (not yet harvested)
 */
export function getActiveSprouts(state: DerivedState): DerivedSprout[] {
  return Array.from(state.activeSproutsByTwig.values()).flat()
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
    uprootedAt: derived.uprootedAt,
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
  // Set to 9am in user's local timezone (not hardcoded to any specific timezone)
  end.setHours(9, 0, 0, 0)
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
  return state.sproutsByLeaf.get(leafId) || []
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
  return `sprout-${crypto.randomUUID()}`
}

/**
 * Generate a unique leaf ID
 */
export function generateLeafId(): string {
  return `leaf-${crypto.randomUUID()}`
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
