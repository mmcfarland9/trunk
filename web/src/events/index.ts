/**
 * Event-sourced state management for Trunk.
 *
 * The event log is the single source of truth.
 * All state is derived by replaying events.
 */

// Types
export type {
  TrunkEvent,
  SproutPlantedEvent,
  SproutWateredEvent,
  SproutHarvestedEvent,
  SproutUprootedEvent,
  SunShoneEvent,
  LeafCreatedEvent,
} from './types'

// Derivation
export type { DerivedState, DerivedSprout, DerivedLeaf } from './derive'
export {
  deriveState,
  deriveWaterAvailable,
  deriveSunAvailable,
  wasSproutWateredThisWeek,
  wasShoneThisWeek,
  getTodayResetTime,
  getWeekResetTime,
  getSproutsForTwig,
  getLeavesForTwig,
  getActiveSprouts,
  getCompletedSprouts,
  toSprout,
  getLeafById,
  getSproutsByLeaf,
  generateSproutId,
  generateLeafId,
  getAllWaterEntries,
  deriveSoilLog,
} from './derive'
export type { DerivedSoilEntry } from './derive'

// Store
export {
  initEventStore,
  setEventStoreErrorCallbacks,
  setEventSyncCallback,
  appendEvent,
  appendEvents,
  getEvents,
  getState,
  getWaterAvailable,
  getSunAvailable,
  checkSproutWateredThisWeek,
  clearEvents,
  replaceEvents,
  getEventCount,
  exportEvents,
  // Resource getters (derived from events)
  getSoilAvailable,
  getSoilCapacity,
  canAffordSoil,
  canAffordWater,
  canAffordSun,
  getWaterCapacity,
  getSunCapacity,
} from './store'

