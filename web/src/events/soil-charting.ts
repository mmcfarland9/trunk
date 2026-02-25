/**
 * Soil charting and history derivation.
 *
 * This module intentionally duplicates some soil-tracking logic from derive.ts.
 * Charting needs per-event soil snapshots (capacity + available at every soil-changing
 * event) to draw time-series charts, whereas derive.ts only produces final aggregated
 * state. Sharing a single replay would couple charting bucket granularity to the core
 * state derivation loop, so we keep them separate.
 */

import type { TrunkEvent } from './types'
import constants from '../../../shared/constants.json'
import { sortEventsByTimestamp } from './sort-events'

// Constants from shared config
const STARTING_CAPACITY = constants.soil.startingCapacity
const SOIL_RECOVERY_PER_WATER = constants.soil.recoveryRates.waterUse
const SOIL_RECOVERY_PER_SUN = constants.soil.recoveryRates.sunUse

// ============================================================================
// Soil Chart Bucketing
// ============================================================================

/**
 * Chart range identifiers matching shared/constants.json chart.buckets keys
 */
export type SoilChartRange = '1d' | '1w' | '1m' | '3m' | '6m' | 'ytd' | 'all'

/**
 * A single chart data point with uniform time spacing
 */
export interface SoilChartPoint {
  timestamp: Date
  capacity: number
  available: number
}

/**
 * Raw soil state snapshot (intermediate, before bucketing)
 */
interface RawSoilSnapshot {
  date: Date
  capacity: number
  available: number
}

/**
 * Replay events into raw soil state snapshots (one per soil-changing event).
 * This is the intermediate step before bucketing.
 */
export function computeRawSoilHistory(events: readonly TrunkEvent[]): RawSoilSnapshot[] {
  let capacity = STARTING_CAPACITY
  let available = STARTING_CAPACITY
  const history: RawSoilSnapshot[] = []

  const sorted = sortEventsByTimestamp(events)

  // Track planted sprouts for harvest reward calculation
  const sproutInfo = new Map<string, { soilCost: number }>()

  for (const event of sorted) {
    const date = new Date(event.timestamp)
    let changed = false

    switch (event.type) {
      case 'sprout_planted':
        sproutInfo.set(event.sproutId, { soilCost: event.soilCost })
        available = Math.max(0, available - event.soilCost)
        changed = true
        break

      case 'sprout_watered':
        available = Math.min(available + SOIL_RECOVERY_PER_WATER, capacity)
        changed = true
        break

      case 'sprout_harvested': {
        const info = sproutInfo.get(event.sproutId)
        capacity += event.capacityGained
        available = Math.min(available + (info?.soilCost ?? 0), capacity)
        changed = true
        break
      }

      case 'sprout_uprooted':
        available = Math.min(available + event.soilReturned, capacity)
        changed = true
        break

      case 'sun_shone':
        available = Math.min(available + SOIL_RECOVERY_PER_SUN, capacity)
        changed = true
        break
    }

    if (changed) {
      history.push({ date, capacity, available })
    }
  }

  return history
}

/**
 * Floor a date to the start of its hour
 */
function floorToHour(date: Date): Date {
  const d = new Date(date)
  d.setMinutes(0, 0, 0)
  return d
}

/**
 * Floor a date to midnight (start of day) in local time
 */
function floorToDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Generate semimonthly bucket boundaries (1st and 15th of each month)
 * from rangeStart to rangeEnd.
 */
function generateSemimonthlyBoundaries(rangeStart: Date, rangeEnd: Date): Date[] {
  const boundaries: Date[] = []
  const year = rangeStart.getFullYear()
  const month = rangeStart.getMonth()

  // Start from the 1st of the rangeStart month
  let current = new Date(year, month, 1, 0, 0, 0, 0)

  while (current <= rangeEnd) {
    if (current >= rangeStart) {
      boundaries.push(new Date(current))
    }

    // Advance to next boundary: 1st → 15th, 15th → 1st of next month
    if (current.getDate() === 1) {
      current = new Date(current.getFullYear(), current.getMonth(), 15, 0, 0, 0, 0)
    } else {
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1, 0, 0, 0, 0)
    }
  }

  // Always include rangeEnd as final boundary
  if (
    boundaries.length === 0 ||
    boundaries[boundaries.length - 1].getTime() !== rangeEnd.getTime()
  ) {
    boundaries.push(rangeEnd)
  }

  return boundaries
}

/**
 * Generate uniform bucket boundaries at a fixed interval from floored start to end.
 */
function generateFixedBoundaries(
  rangeStart: Date,
  rangeEnd: Date,
  intervalSeconds: number,
  floorFn: (d: Date) => Date,
): Date[] {
  const boundaries: Date[] = []
  const intervalMs = intervalSeconds * 1000
  let current = floorFn(rangeStart)

  while (current <= rangeEnd) {
    boundaries.push(new Date(current))
    current = new Date(current.getTime() + intervalMs)
  }

  // Always include rangeEnd as final boundary
  if (
    boundaries.length === 0 ||
    boundaries[boundaries.length - 1].getTime() !== rangeEnd.getTime()
  ) {
    boundaries.push(rangeEnd)
  }

  return boundaries
}

/**
 * Get the start date for a chart range relative to `now`
 */
function getRangeStart(range: SoilChartRange, now: Date): Date | null {
  switch (range) {
    case '1d':
      return new Date(now.getTime() - 86400000)
    case '1w':
      return new Date(now.getTime() - 7 * 86400000)
    case '1m': {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 1)
      return d
    }
    case '3m': {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 3)
      return d
    }
    case '6m': {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 6)
      return d
    }
    case 'ytd':
      return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
    case 'all':
      return null
  }
}

const CHART_BUCKET_CONFIG = constants.chart.buckets

/**
 * Bucket raw soil history into uniform time-spaced chart points.
 *
 * Each bucket's value = cumulative soil state at that bucket's timestamp,
 * carrying forward the last known value when no events fall in a bucket.
 */
export function bucketSoilData(
  rawHistory: readonly RawSoilSnapshot[],
  range: SoilChartRange,
  now: Date = new Date(),
): SoilChartPoint[] {
  if (rawHistory.length === 0) return []

  const rangeEnd = now
  const rangeStartFromMode = getRangeStart(range, now)
  const rangeStart = rangeStartFromMode ?? rawHistory[0].date

  // Generate bucket boundaries based on range config
  const config = CHART_BUCKET_CONFIG[range]
  let boundaries: Date[]

  if ('intervalSeconds' in config) {
    const floorFn = config.intervalSeconds <= 21600 ? floorToHour : floorToDay
    boundaries = generateFixedBoundaries(rangeStart, rangeEnd, config.intervalSeconds, floorFn)
  } else if ('calendarSnap' in config) {
    boundaries = generateSemimonthlyBoundaries(rangeStart, rangeEnd)
  } else {
    // Adaptive: compute interval from span
    const spanMs = rangeEnd.getTime() - rangeStart.getTime()
    const targetNodes = config.targetNodes
    const intervalMs = Math.max(spanMs / targetNodes, 3600000) // min 1 hour
    boundaries = generateFixedBoundaries(rangeStart, rangeEnd, intervalMs / 1000, floorToHour)
  }

  // For each boundary, find the last raw snapshot with date <= boundary
  // Use binary search for efficiency on large event histories
  const points: SoilChartPoint[] = []
  let lastCapacity = STARTING_CAPACITY
  let lastAvailable = STARTING_CAPACITY

  // Find the state just before rangeStart (for carry-forward initialization)
  for (const snapshot of rawHistory) {
    if (snapshot.date.getTime() <= rangeStart.getTime()) {
      lastCapacity = snapshot.capacity
      lastAvailable = snapshot.available
    } else {
      break
    }
  }

  let snapshotIdx = 0
  for (const boundary of boundaries) {
    // Advance through snapshots up to this boundary
    while (
      snapshotIdx < rawHistory.length &&
      rawHistory[snapshotIdx].date.getTime() <= boundary.getTime()
    ) {
      lastCapacity = rawHistory[snapshotIdx].capacity
      lastAvailable = rawHistory[snapshotIdx].available
      snapshotIdx++
    }

    points.push({
      timestamp: boundary,
      capacity: lastCapacity,
      available: lastAvailable,
    })
  }

  return points
}

// ============================================================================
// Soil Log (list view)
// ============================================================================

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
