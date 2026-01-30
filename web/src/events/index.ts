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
  EventType,
} from './types'

// Derivation
export type { DerivedState, DerivedSprout, DerivedLeaf } from './derive'
export {
  deriveState,
  deriveWaterAvailable,
  deriveSunAvailable,
  wasSproutWateredThisWeek,
  getTodayResetTime,
  getWeekResetTime,
  getSproutsForTwig,
  getLeavesForTwig,
  getActiveSprouts,
  getCompletedSprouts,
  toSprout,
} from './derive'

// Store
export {
  initEventStore,
  setEventStoreErrorCallbacks,
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
} from './store'

// Migration (for export)
export { migrateToEvents, validateMigration } from './migrate'

// Rebuild (for import)
export { rebuildFromEvents, validateRebuild } from './rebuild'
