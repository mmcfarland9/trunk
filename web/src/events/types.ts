/**
 * Event types for the Trunk event-sourced state system.
 * These types match shared/schemas/events.schema.json
 *
 * The event log is the single source of truth. All state is derived from events.
 */

import type { SproutSeason, SproutEnvironment } from '../types'
import { VALID_EVENT_TYPES } from '../generated/constants'

/** Valid season values for runtime checks */
export const VALID_SEASONS: readonly SproutSeason[] = ['2w', '1m', '3m', '6m', '1y']

/** Valid environment values for runtime checks */
export const VALID_ENVIRONMENTS: readonly SproutEnvironment[] = ['fertile', 'firm', 'barren']

// Base event structure
interface BaseEvent {
  timestamp: string // ISO 8601
  client_id?: string // Unique client-generated ID for dedup (set during sync push)
}

/**
 * Type-safe event type constants.
 * Use these instead of raw strings for event type references.
 */
export const EVENT_TYPES = {
  SPROUT_PLANTED: 'sprout_planted',
  SPROUT_WATERED: 'sprout_watered',
  SPROUT_HARVESTED: 'sprout_harvested',
  SPROUT_UPROOTED: 'sprout_uprooted',
  SPROUT_EDITED: 'sprout_edited',
  SUN_SHONE: 'sun_shone',
  LEAF_CREATED: 'leaf_created',
} as const

/**
 * Sprout planted - soil spent, sprout becomes active
 */
export interface SproutPlantedEvent extends BaseEvent {
  type: 'sprout_planted'
  sproutId: string
  twigId: string
  // Snapshot of sprout data at plant time (events are self-contained)
  title: string
  season: SproutSeason
  environment: SproutEnvironment
  soilCost: number
  leafId: string
  bloomWither?: string
  bloomBudding?: string
  bloomFlourish?: string
}

/**
 * Sprout watered - daily engagement recorded
 */
export interface SproutWateredEvent extends BaseEvent {
  type: 'sprout_watered'
  sproutId: string
  content: string
  prompt: string
}

/**
 * Sprout harvested - completed with result 1-5
 * No "failed" state - all harvests are completions, result indicates outcome
 */
export interface SproutHarvestedEvent extends BaseEvent {
  type: 'sprout_harvested'
  sproutId: string
  result: number // 1-5
  reflection?: string
  capacityGained: number // Pre-calculated at harvest time (includes diminishing returns)
}

/**
 * Sprout uprooted - abandoned, partial soil returned
 */
export interface SproutUprootedEvent extends BaseEvent {
  type: 'sprout_uprooted'
  sproutId: string
  soilReturned: number
}

/**
 * Sun shone - weekly reflection on a twig
 */
export interface SunShoneEvent extends BaseEvent {
  type: 'sun_shone'
  twigId: string
  twigLabel: string // Snapshot for display
  content: string
  prompt?: string
}

/**
 * Leaf created - new saga started
 */
export interface LeafCreatedEvent extends BaseEvent {
  type: 'leaf_created'
  leafId: string
  twigId: string
  name: string
}

/**
 * Sprout edited - update mutable fields after planting.
 * Only the fields present in the event are updated (sparse merge).
 * Season, environment, soilCost are NOT editable (economic commitments).
 */
export interface SproutEditedEvent extends BaseEvent {
  type: 'sprout_edited'
  sproutId: string
  title?: string
  bloomWither?: string
  bloomBudding?: string
  bloomFlourish?: string
  leafId?: string
}

/**
 * Union of all event types
 */
export type TrunkEvent =
  | SproutPlantedEvent
  | SproutWateredEvent
  | SproutHarvestedEvent
  | SproutUprootedEvent
  | SunShoneEvent
  | LeafCreatedEvent
  | SproutEditedEvent

/**
 * Validate that a value has the required shape of a TrunkEvent.
 * Checks for required fields (type, timestamp), known event type,
 * and per-event-type required fields.
 *
 * Single source of truth — used by both store.ts and sync-types.ts.
 */
export function validateEvent(event: unknown): event is TrunkEvent {
  if (typeof event !== 'object' || event === null) return false
  const e = event as Record<string, unknown>

  // Common required fields
  if (typeof e.type !== 'string' || !VALID_EVENT_TYPES.has(e.type)) return false
  if (typeof e.timestamp !== 'string' || e.timestamp.length === 0) return false

  // Per-event-type required field checks
  switch (e.type) {
    case 'sprout_planted':
      return (
        typeof e.sproutId === 'string' &&
        typeof e.twigId === 'string' &&
        typeof e.title === 'string' &&
        typeof e.season === 'string' &&
        (VALID_SEASONS as readonly string[]).includes(e.season) &&
        typeof e.environment === 'string' &&
        (VALID_ENVIRONMENTS as readonly string[]).includes(e.environment) &&
        typeof e.soilCost === 'number' &&
        e.soilCost >= 0 &&
        typeof e.leafId === 'string'
      )
    case 'sprout_watered':
      // Note: 'prompt' is schema-required but omitted from validation for backward compatibility with pre-prompt events
      return typeof e.sproutId === 'string' && typeof e.content === 'string'
    case 'sprout_harvested':
      return (
        typeof e.sproutId === 'string' &&
        typeof e.result === 'number' &&
        e.result >= 1 &&
        e.result <= 5 &&
        typeof e.capacityGained === 'number' &&
        e.capacityGained >= 0
      )
    case 'sprout_uprooted':
      return typeof e.sproutId === 'string' && typeof e.soilReturned === 'number'
    case 'sun_shone':
      return (
        typeof e.twigId === 'string' &&
        typeof e.twigLabel === 'string' &&
        typeof e.content === 'string'
      )
    case 'leaf_created':
      return (
        typeof e.leafId === 'string' && typeof e.twigId === 'string' && typeof e.name === 'string'
      )
    case 'sprout_edited':
      return typeof e.sproutId === 'string'
    default:
      return false
  }
}
