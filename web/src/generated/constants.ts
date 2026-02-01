//
// constants.ts
// Generated from shared/constants.json
//
// AUTO-GENERATED - DO NOT EDIT
// Run 'npm run generate' from web/ or 'node shared/generate-constants.js' from repo root
//

// =============================================================================
// Soil Constants
// =============================================================================

export const SOIL_STARTING_CAPACITY = 10
export const SOIL_MAX_CAPACITY = 120

export const PLANTING_COSTS = {
  '2w': {
    fertile: 2,
    firm: 3,
    barren: 4
  },
  '1m': {
    fertile: 3,
    firm: 5,
    barren: 6
  },
  '3m': {
    fertile: 5,
    firm: 8,
    barren: 10
  },
  '6m': {
    fertile: 8,
    firm: 12,
    barren: 16
  },
  '1y': {
    fertile: 12,
    firm: 18,
    barren: 24
  }
} as const

export const ENVIRONMENT_MULTIPLIERS = {
  fertile: 1.1,
  firm: 1.75,
  barren: 2.4
} as const

export const RESULT_MULTIPLIERS = {
  1: 0.4,
  2: 0.55,
  3: 0.7,
  4: 0.85,
  5: 1
} as const

export const SOIL_WATER_RECOVERY = 0.05
export const SOIL_SUN_RECOVERY = 0.35

// =============================================================================
// Water Constants
// =============================================================================

export const WATER_DAILY_CAPACITY = 3
export const WATER_RESET_HOUR = 6
export const WATER_RESET_INTERVAL_MS = 86400000

// =============================================================================
// Sun Constants
// =============================================================================

export const SUN_WEEKLY_CAPACITY = 1
export const SUN_RESET_HOUR = 6
export const SUN_RESET_INTERVAL_MS = 604800000

// =============================================================================
// Seasons
// =============================================================================

export const SEASONS = {
  '2w': {
    label: '2 weeks',
    durationMs: 1209600000,
    baseReward: 0.26
  },
  '1m': {
    label: '1 month',
    durationMs: 2592000000,
    baseReward: 0.56
  },
  '3m': {
    label: '3 months',
    durationMs: 7776000000,
    baseReward: 1.95
  },
  '6m': {
    label: '6 months',
    durationMs: 15552000000,
    baseReward: 4.16
  },
  '1y': {
    label: '1 year',
    durationMs: 31536000000,
    baseReward: 8.84
  }
} as const

// =============================================================================
// Environments
// =============================================================================

export const ENVIRONMENTS = {
  fertile: {
    label: 'Fertile',
    description: 'Easy to achieve',
    formHint: '[Comfortable terrain · no soil bonus]'
  },
  firm: {
    label: 'Firm',
    description: 'Challenging stretch',
    formHint: '[New obstacles · +1 soil capacity]'
  },
  barren: {
    label: 'Barren',
    description: 'Very difficult',
    formHint: '[Hostile conditions · +2 soil capacity]'
  }
} as const

// =============================================================================
// Results
// =============================================================================

export const RESULTS = {
  1: {
    label: 'Minimal',
    description: 'Showed up but little progress'
  },
  2: {
    label: 'Partial',
    description: 'Made some progress'
  },
  3: {
    label: 'Good',
    description: 'Met most expectations'
  },
  4: {
    label: 'Strong',
    description: 'Exceeded expectations'
  },
  5: {
    label: 'Exceptional',
    description: 'Fully achieved and then some'
  }
} as const

// =============================================================================
// Tree Structure
// =============================================================================

export const BRANCH_COUNT = 8
export const TWIG_COUNT = 8

export const BRANCHES = [
  {
    name: 'CORE',
    description: 'fitness & vitality',
    twigs: ['movement', 'strength', 'sport', 'technique', 'maintenance', 'nutrition', 'sleep', 'appearance']
  },
  {
    name: 'BRAIN',
    description: 'knowledge & curiosity',
    twigs: ['reading', 'writing', 'reasoning', 'focus', 'memory', 'analysis', 'dialogue', 'exploration']
  },
  {
    name: 'VOICE',
    description: 'expression & creativity',
    twigs: ['practice', 'composition', 'interpretation', 'performance', 'consumption', 'curation', 'completion', 'publication']
  },
  {
    name: 'HANDS',
    description: 'making & craft',
    twigs: ['design', 'fabrication', 'assembly', 'repair', 'refinement', 'tooling', 'tending', 'preparation']
  },
  {
    name: 'HEART',
    description: 'love & family',
    twigs: ['homemaking', 'care', 'presence', 'intimacy', 'communication', 'ritual', 'adventure', 'joy']
  },
  {
    name: 'BREATH',
    description: 'regulation & renewal',
    twigs: ['observation', 'nature', 'flow', 'repose', 'idleness', 'exposure', 'abstinence', 'reflection']
  },
  {
    name: 'BACK',
    description: 'belonging & community',
    twigs: ['connection', 'support', 'gathering', 'membership', 'stewardship', 'advocacy', 'service', 'culture']
  },
  {
    name: 'FEET',
    description: 'stability & direction',
    twigs: ['work', 'development', 'positioning', 'ventures', 'finance', 'operations', 'planning', 'administration']
  }
] as const

// =============================================================================
// Storage
// =============================================================================

export const STORAGE_KEYS = {
  nodeData: 'trunk-notes-v1',
  resources: 'trunk-resources-v1',
  notifications: 'trunk-notifications-v1',
  settings: 'trunk-settings-v1',
  events: 'trunk-events-v1',
  lastExport: 'trunk-last-export'
} as const

export const EXPORT_REMINDER_DAYS = 7
