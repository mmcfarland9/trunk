/**
 * State module - pure cloud architecture.
 *
 * All state is derived from cloud events. No local persistence except cache.
 * This file re-exports from the appropriate modules for convenience.
 */

// View state (in-memory only, not persisted)
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

// Resources - derived from events
export {
  getSoilAvailable,
  getSoilCapacity,
  canAffordSoil,
  getWaterAvailable,
  getWaterCapacity,
  canAffordWater,
  getSunAvailable,
  getSunCapacity,
  canAffordSun,
} from '../events/store'

// Pure calculation functions (no state)
export {
  calculateSoilCost,
  calculateCapacityReward,
  getCapacityReward,
  getSoilRecoveryRate,
  getTodayResetTime,
  getWeekResetTime,
  getNextWaterReset,
  getNextSunReset,
  formatResetTime,
} from '../utils/calculations'

// Preset labels from shared constants
export {
  getPresetLabel,
  getPresetNote,
} from '../utils/presets'
