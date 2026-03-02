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
  SproutEditedEvent,
  SunShoneEvent,
  LeafCreatedEvent,
} from './types'
export { EVENT_TYPES, validateEvent } from './types'

// Derivation
export type { DerivedState, DerivedSprout, DerivedLeaf, WateringStreak } from './derive'
export {
  deriveState,
  deriveWaterAvailable,
  deriveSunAvailable,
  wasSproutWateredThisWeek,
  wasSproutWateredToday,
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
  deriveWateringStreak,
} from './derive'

// Soil charting
export type { SoilChartRange, SoilChartPoint } from './soil-charting'
export {
  deriveSoilLog,
  computeRawSoilHistory,
  bucketSoilData,
} from './soil-charting'
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
  checkSproutWateredToday,
  replaceEvents,
  exportEvents,
  // Resource getters (derived from events)
  getSoilAvailable,
  getSoilCapacity,
  canAffordSoil,
  canAffordWater,
  canAffordSun,
  getWaterCapacity,
  getWateringStreak,
} from './store'
