/**
 * Event-sourced state management for Trunk.
 *
 * The event log is the single source of truth.
 * All state is derived by replaying events.
 */

// Derivation
export type {
  DerivedLeaf,
  DerivedSeedling,
  DerivedSprout,
  DerivedState,
  WateringStreak,
} from './derive'
export {
  deriveState,
  deriveSunAvailable,
  deriveWaterAvailable,
  deriveWateringStreak,
  generateLeafId,
  generateSeedlingId,
  generateSproutId,
  getActiveSprouts,
  getAllWaterEntries,
  getCompletedSprouts,
  getLeafById,
  getLeavesForTwig,
  getSeedlingsForTwig,
  getSproutsByLeaf,
  getSproutsForTwig,
  getTodayResetTime,
  getWeekResetTime,
  toSprout,
} from './derive'
// Soil charting
export type { SoilChartPoint, SoilChartRange } from './soil-charting'
export {
  bucketSoilData,
  computeRawSoilHistory,
  deriveSoilLog,
} from './soil-charting'
// Store
export {
  appendEvent,
  appendEvents,
  canAffordSoil,
  canAffordSun,
  canAffordWater,
  checkShoneThisWeek,
  checkSproutWateredThisWeek,
  checkSproutWateredToday,
  exportEvents,
  getEvents,
  // Resource getters (derived from events)
  getSoilAvailable,
  getSoilCapacity,
  getState,
  getSunAvailable,
  getWaterAvailable,
  getWaterCapacity,
  getWateringStreak,
  initEventStore,
  replaceEvents,
  setEventStoreErrorCallbacks,
  setEventSyncCallback,
} from './store'
// Types
export type {
  LeafCreatedEvent,
  SeedlingCreatedEvent,
  SeedlingDeletedEvent,
  SeedlingEditedEvent,
  SproutEditedEvent,
  SproutHarvestedEvent,
  SproutPlantedEvent,
  SproutUprootedEvent,
  SproutWateredEvent,
  SunShoneEvent,
  TrunkEvent,
} from './types'
export { EVENT_TYPES, validateEvent } from './types'
