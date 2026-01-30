/**
 * Event types for the Trunk event-sourced state system.
 * These types match shared/schemas/events.schema.json
 *
 * The event log is the single source of truth. All state is derived from events.
 */

import type { SproutSeason, SproutEnvironment } from '../types'

// Base event structure
interface BaseEvent {
  timestamp: string // ISO 8601
}

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
  leafId?: string
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
  prompt?: string
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
 * Union of all event types
 */
export type TrunkEvent =
  | SproutPlantedEvent
  | SproutWateredEvent
  | SproutHarvestedEvent
  | SproutUprootedEvent
  | SunShoneEvent
  | LeafCreatedEvent

/**
 * Event type discriminator
 */
export type EventType = TrunkEvent['type']
