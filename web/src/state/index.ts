/**
 * State module - pure cloud architecture.
 *
 * All state is derived from cloud events. No local persistence except cache.
 * This file re-exports from the appropriate modules for convenience.
 */

// Resources - derived from events
export {
  canAffordSoil,
  canAffordSun,
  canAffordWater,
  getSoilAvailable,
  getSoilCapacity,
  getSunAvailable,
  getSunCapacity,
  getWaterAvailable,
  getWaterCapacity,
  getWateringStreak,
} from '../events/store'
// Pure calculation functions (no state)
export {
  calculateCapacityGained,
  calculateSoilCost,
  formatResetTime,
  getNextSunReset,
  getNextWaterReset,
  getResetDayKey,
  getTodayResetTime,
  getWeekResetTime,
} from '../utils/calculations'
// Preset labels from shared constants
export {
  getPresetLabel,
  getPresetNote,
} from '../utils/presets'
// View state (in-memory only, not persisted)
export {
  getActiveBranchIndex,
  getActiveNode,
  getActiveTwigId,
  getFocusedNode,
  getHoveredBranchIndex,
  getHoveredTwigId,
  getViewMode,
  isBranchView,
  isTwigView,
  setActiveNode,
  setFocusedNodeState,
  setHoveredBranchIndex,
  setHoveredTwigId,
  setViewModeState,
} from './view-state'
