// Re-export generated constants
export {
  BRANCH_COUNT,
  TWIG_COUNT,
  STORAGE_KEYS,
} from './generated/constants'

// Storage key alias for backward compatibility
import { STORAGE_KEYS as _STORAGE_KEYS } from './generated/constants'
export const STORAGE_KEY = _STORAGE_KEYS.nodeData

// UI-specific constants (not from shared)
export const ZOOM_TRANSITION_DURATION = 420
export const EDITOR_OPEN_DELAY = 220
export const GUIDE_ANIMATION_DURATION = 520
