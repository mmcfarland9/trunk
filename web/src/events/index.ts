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
export type { DerivedState, DerivedSprout, DerivedLeaf, SoilChartRange, SoilChartPoint } from './derive'
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
  deriveSoilLog,
  computeRawSoilHistory,
  bucketSoilData,
} from './derive'
// Store
export {
  validateEvent,
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
  // Resource getters (derived from events)
  getSoilAvailable,
  getSoilCapacity,
  canAffordSoil,
  canAffordWater,
  canAffordSun,
  getWaterCapacity,
} from './store'

