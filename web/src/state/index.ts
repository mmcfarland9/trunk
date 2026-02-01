/**
 * State module - re-exports all state management functionality.
 *
 * This index provides backward compatibility for code importing from './state'.
 * All exports are organized into focused modules:
 * - migrations.ts: Schema versioning and migration functions
 * - view-state.ts: Navigation and UI state
 * - resources.ts: Soil, water, sun management
 * - node-state.ts: Node data, sprouts, leaves, logs
 */

// Schema migrations
export { CURRENT_SCHEMA_VERSION, runMigrations } from './migrations'
export type { StoredState } from './migrations'

// View state
export {
  getViewMode,
  setViewModeState,
  getActiveTwigId,
  getActiveBranchIndex,
  getHoveredBranchIndex,
  setHoveredBranchIndex,
  getHoveredTwigId,
  setHoveredTwigId,
  getFocusedNode,
  setFocusedNodeState,
  getActiveNode,
  setActiveNode,
  isBranchView,
  isTwigView,
} from './view-state'

// Resources
export {
  // Debug clock
  getDebugNow,
  getDebugDate,
  advanceClockByDays,
  setDebugDate,
  // Reset time system
  getTodayResetTime,
  getWeekResetTime,
  getNextWaterReset,
  getNextSunReset,
  formatResetTime,
  getWeekString,
  // Soil calculations
  calculateSoilCost,
  calculateCapacityReward,
  getCapacityReward,
  getMaxSoilCapacity,
  getSoilRecoveryRate,
  getSunRecoveryRate,
  // Soil API
  getSoilAvailable,
  getSoilCapacity,
  canAffordSoil,
  spendSoil,
  recoverSoil,
  recoverPartialSoil,
  // Water API
  getWaterAvailable,
  getWaterCapacity,
  canAffordWater,
  spendWater,
  // Sun API
  getSunAvailable,
  getSunCapacity,
  canAffordSun,
  spendSun,
  // Reset
  resetResources,
} from './resources'

// Node state
export {
  // Preset
  getPresetLabel,
  getPresetNote,
  // State
  nodeState,
  lastSavedAt,
  sunLog,
  soilLog,
  // Storage callbacks
  setStorageErrorCallbacks,
  // State operations
  saveState,
  clearState,
  deleteNodeData,
  hasNodeData,
  // Sprout helpers
  generateSproutId,
  getSproutsByState,
  getActiveSprouts,
  getHistorySprouts,
  // Leaf helpers
  generateLeafId,
  getTwigLeaves,
  getLeafById,
  getSproutsByLeaf,
  createLeaf,
  // Water entries
  getAllWaterEntries,
  addWaterEntry,
  wasWateredThisWeek,
  // Sun entries
  addSunEntry,
  wasShoneThisWeek,
  // Soil entries
  addSoilEntry,
  // Notification settings
  getNotificationSettings,
  saveNotificationSettings,
} from './node-state'
