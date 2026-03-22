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
    barren: 4,
  },
  '1m': {
    fertile: 3,
    firm: 5,
    barren: 6,
  },
  '3m': {
    fertile: 5,
    firm: 8,
    barren: 10,
  },
  '6m': {
    fertile: 8,
    firm: 12,
    barren: 16,
  },
  '1y': {
    fertile: 12,
    firm: 18,
    barren: 24,
  },
} as const

export const ENVIRONMENT_MULTIPLIERS = {
  fertile: 1.1,
  firm: 1.75,
  barren: 2.4,
} as const

export const RESULT_MULTIPLIERS = {
  1: 0.4,
  2: 0.55,
  3: 0.7,
  4: 0.85,
  5: 1,
} as const

export const SOIL_WATER_RECOVERY = 0.05
export const SOIL_SUN_RECOVERY = 0.35
export const SOIL_UPROOT_REFUND_RATE = 0.25

// =============================================================================
// Water Constants
// =============================================================================

export const WATER_DAILY_CAPACITY = 3
export const WATER_RESET_HOUR = 6

// =============================================================================
// Sun Constants
// =============================================================================

export const SUN_WEEKLY_CAPACITY = 1
export const SUN_RESET_HOUR = 6

// =============================================================================
// Seasons
// =============================================================================

export const SEASONS = {
  '2w': {
    label: '2 weeks',
    durationMs: 1209600000,
    baseReward: 0.26,
  },
  '1m': {
    label: '1 month',
    durationMs: 2592000000,
    baseReward: 0.56,
  },
  '3m': {
    label: '3 months',
    durationMs: 7776000000,
    baseReward: 1.95,
  },
  '6m': {
    label: '6 months',
    durationMs: 15552000000,
    baseReward: 4.16,
  },
  '1y': {
    label: '1 year',
    durationMs: 31536000000,
    baseReward: 8.84,
  },
} as const

// =============================================================================
// Environments
// =============================================================================

export const ENVIRONMENTS = {
  fertile: {
    label: 'Fertile',
    description: 'Easy to achieve',
    formHint: '[Comfortable terrain · no soil bonus]',
  },
  firm: {
    label: 'Firm',
    description: 'Challenging stretch',
    formHint: '[New obstacles · +1 soil capacity]',
  },
  barren: {
    label: 'Barren',
    description: 'Very difficult',
    formHint: '[Hostile conditions · +2 soil capacity]',
  },
} as const

// =============================================================================
// Results
// =============================================================================

export const RESULTS = {
  1: {
    label: 'Minimal',
    description: 'Showed up but little progress',
    emoji: '🥀',
  },
  2: {
    label: 'Partial',
    description: 'Made some progress',
    emoji: '🌱',
  },
  3: {
    label: 'Good',
    description: 'Met most expectations',
    emoji: '🌿',
  },
  4: {
    label: 'Strong',
    description: 'Exceeded expectations',
    emoji: '🌳',
  },
  5: {
    label: 'Exceptional',
    description: 'Fully achieved and then some',
    emoji: '🌲',
  },
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
    motto: "that which energizes one's body",
    twigs: [
      { label: 'movement', description: 'locomotion; ambulation; cardio' },
      { label: 'strength', description: 'force; power; might' },
      { label: 'sport', description: 'athleticism, coordination; agility' },
      { label: 'technique', description: 'discipline; mechanics; posture' },
      { label: 'maintenance', description: 'mobility, rehab; durability' },
      { label: 'nutrition', description: 'sustenance; nourishment; fuel' },
      { label: 'sleep', description: 'rest; cycle; rhythm' },
      { label: 'appearance', description: 'grooming, presentation; styling' },
    ],
  },
  {
    name: 'BRAIN',
    description: 'knowledge & curiosity',
    motto: 'that by which one draws understanding',
    twigs: [
      { label: 'reading', description: 'study; absorption; decoding' },
      { label: 'writing', description: 'articulation; dispersion; encoding' },
      { label: 'reasoning', description: 'solving, inference; logic' },
      { label: 'focus', description: 'attention; concentration; calculation' },
      { label: 'memory', description: 'retention; consolidation; recall' },
      { label: 'analysis', description: 'judgment; evaluation; appraisal' },
      { label: 'dialogue', description: 'exchange; conversation; discourse' },
      { label: 'exploration', description: 'wonder; inquiry; discovery' },
    ],
  },
  {
    name: 'VOICE',
    description: 'expression & creativity',
    motto: "that which gives one's ideas a form",
    twigs: [
      { label: 'practice', description: 'rehearsal; repetition; rudiments' },
      { label: 'composition', description: 'authorship; genesis; origination' },
      { label: 'interpretation', description: 'reimagination, synthesis; adaptation' },
      { label: 'performance', description: 'improvisation; execution; delivery' },
      { label: 'consumption', description: 'engagement; immersion; audience' },
      { label: 'curation', description: 'taste; selection; compilation' },
      { label: 'completion', description: 'editing; finalization; polish' },
      { label: 'publication', description: 'distribution; exhibition; broadcast' },
    ],
  },
  {
    name: 'HANDS',
    description: 'making & craft',
    motto: 'that by which one shapes the material world',
    twigs: [
      { label: 'design', description: 'configuration; layout; invention' },
      { label: 'fabrication', description: 'construction; forging; manufacturing' },
      { label: 'assembly', description: 'installation; joining; integration' },
      { label: 'repair', description: 'troubleshooting; mending; servicing' },
      { label: 'refinement', description: 'finishing, modification, calibration' },
      { label: 'tooling', description: 'equipment; instruments; machinery' },
      { label: 'tending', description: 'cultivation; caretaking; growth' },
      { label: 'preparation', description: 'arrangement; staging; setting' },
    ],
  },
  {
    name: 'HEART',
    description: 'love & family',
    motto: 'that which gives one protection and shelter',
    twigs: [
      { label: 'homemaking', description: 'errands, chores, comfort' },
      { label: 'care', description: 'thoughtfulness; consideration; nurturing' },
      { label: 'presence', description: 'availability; attendance; accessibility' },
      { label: 'intimacy', description: 'vulnerability; trust; bond' },
      { label: 'communication', description: 'transparency; candor; reciprocity' },
      { label: 'ritual', description: 'celebration; routine; habit' },
      { label: 'adventure', description: 'spontaneity; novelty; wanderlust' },
      { label: 'joy', description: 'playfulness; delight; gaiety' },
    ],
  },
  {
    name: 'BREATH',
    description: 'regulation & renewal',
    motto: "that which balances one's psyche",
    twigs: [
      { label: 'observation', description: 'noticing; perception; recognition' },
      { label: 'nature', description: 'reverence, grace; mystery' },
      { label: 'flow', description: 'breathwork; cadence; circulation' },
      { label: 'repose', description: 'pause; intermission; reprieve' },
      { label: 'idleness', description: 'stillness, silence, solitude' },
      { label: 'exposure', description: 'elements, challenge; conditioning' },
      { label: 'abstinence', description: 'restraint, temperance; withholding' },
      { label: 'reflection', description: 'contemplation, acceptance, gratitude' },
    ],
  },
  {
    name: 'BACK',
    description: 'belonging & community',
    motto: 'that which binds one to society',
    twigs: [
      { label: 'connection', description: 'outreach; contact; initiation' },
      { label: 'support', description: 'reliability; dependability; constancy' },
      { label: 'gathering', description: 'hosting; assembly; forum' },
      { label: 'membership', description: 'camaraderie; participation; commitment' },
      { label: 'stewardship', description: 'preservation; custodianship; guardianship' },
      { label: 'advocacy', description: 'morality, citizenship; justice' },
      { label: 'service', description: 'contribution, mentorship; charity' },
      { label: 'culture', description: 'heritage, tradition; legacy' },
    ],
  },
  {
    name: 'FEET',
    description: 'stability & direction',
    motto: 'that by which one advances through time',
    twigs: [
      { label: 'work', description: 'livelihood; trade; vocation' },
      { label: 'development', description: 'training; advancement; maturation' },
      { label: 'positioning', description: 'network; alignment; trajectory' },
      { label: 'ventures', description: 'enterprise; initiative; undertaking' },
      { label: 'finance', description: 'budgeting, resources; capital' },
      { label: 'operations', description: 'logistics, orchestration; scheduling' },
      { label: 'planning', description: 'provision, security; forecasting' },
      { label: 'administration', description: 'governance; compliance; management' },
    ],
  },
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
  lastExport: 'trunk-last-export',
} as const

export const EXPORT_REMINDER_DAYS = 7

// =============================================================================
// Event Types
// =============================================================================

export const EVENT_TYPES = [
  'sprout_planted',
  'sprout_watered',
  'sprout_harvested',
  'sprout_uprooted',
  'sprout_edited',
  'sun_shone',
  'leaf_created',
  'seedling_created',
  'seedling_edited',
  'seedling_deleted',
] as const

export const VALID_EVENT_TYPES: ReadonlySet<string> = new Set(EVENT_TYPES)

// =============================================================================
// Validation
// =============================================================================

export const MAX_TITLE_LENGTH = 60
export const MAX_LEAF_NAME_LENGTH = 40
export const MAX_BLOOM_LENGTH = 60
export const MAX_SEEDLING_TITLE_LENGTH = 60
export const MAX_SEEDLING_NOTES_LENGTH = 200

// =============================================================================
// Prompt Config
// =============================================================================

export const RECENT_WATER_LIMIT = 10
export const RECENT_SHINE_LIMIT = 15
export const GENERIC_WEIGHT = 0.75
