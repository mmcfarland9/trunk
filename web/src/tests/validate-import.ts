import type { Sprout, Leaf, SproutSeason, SproutEnvironment, SproutState } from '../types'
import { VALID_SEASONS, VALID_ENVIRONMENTS } from '../events/types'
// Accept legacy states for backwards compatibility during import
// (converted to active/completed during sanitization)
const LEGACY_STATES = ['draft', 'active', 'completed', 'failed', 'uprooted']

type ValidationResult = {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate a sprout object from import data.
 */
export function validateSprout(sprout: unknown, index: number): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!sprout || typeof sprout !== 'object') {
    return { valid: false, errors: [`Sprout ${index}: not an object`], warnings }
  }

  const s = sprout as Record<string, unknown>

  // Required fields
  if (typeof s.id !== 'string' || !s.id.trim()) {
    errors.push(`Sprout ${index}: missing or invalid id`)
  }

  if (typeof s.title !== 'string') {
    errors.push(`Sprout ${index}: missing title`)
  } else if (s.title.length > 200) {
    errors.push(`Sprout ${index}: title exceeds 200 characters`)
  }

  if (!VALID_SEASONS.includes(s.season as SproutSeason)) {
    errors.push(`Sprout ${index}: invalid season "${s.season}"`)
  }

  if (!VALID_ENVIRONMENTS.includes(s.environment as SproutEnvironment)) {
    errors.push(`Sprout ${index}: invalid environment "${s.environment}"`)
  }

  if (!LEGACY_STATES.includes(s.state as string)) {
    errors.push(`Sprout ${index}: invalid state "${s.state}"`)
  }

  // Optional but should be correct types if present
  if (s.soilCost !== undefined && typeof s.soilCost !== 'number') {
    warnings.push(`Sprout ${index}: soilCost should be a number`)
  }

  if (s.result !== undefined && (typeof s.result !== 'number' || s.result < 1 || s.result > 5)) {
    warnings.push(`Sprout ${index}: result should be 1-5`)
  }

  if (s.leafId !== undefined && typeof s.leafId !== 'string') {
    warnings.push(`Sprout ${index}: leafId should be a string`)
  }

  // Date fields
  if (s.createdAt !== undefined && typeof s.createdAt !== 'string') {
    warnings.push(`Sprout ${index}: createdAt should be a date string`)
  }

  if (s.endDate !== undefined && typeof s.endDate !== 'string') {
    warnings.push(`Sprout ${index}: endDate should be a date string`)
  }

  // Water entries array
  if (s.waterEntries !== undefined && !Array.isArray(s.waterEntries)) {
    warnings.push(`Sprout ${index}: waterEntries should be an array`)
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate a leaf object from import data.
 */
export function validateLeaf(leaf: unknown, index: number): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!leaf || typeof leaf !== 'object') {
    return { valid: false, errors: [`Leaf ${index}: not an object`], warnings }
  }

  const l = leaf as Record<string, unknown>

  // Required fields
  if (typeof l.id !== 'string' || !l.id.trim()) {
    errors.push(`Leaf ${index}: missing or invalid id`)
  }

  if (typeof l.name !== 'string' || !l.name.trim()) {
    // Name is required in v2, but warn rather than fail for backwards compat
    warnings.push(`Leaf ${index}: missing name`)
  }

  if (l.createdAt !== undefined && typeof l.createdAt !== 'string') {
    warnings.push(`Leaf ${index}: createdAt should be a date string`)
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Sanitize a sprout by ensuring all fields have valid types.
 * Returns a cleaned sprout or null if irrecoverable.
 */
export function sanitizeSprout(raw: unknown): Sprout | null {
  if (!raw || typeof raw !== 'object') return null

  const s = raw as Record<string, unknown>

  // Must have valid id
  if (typeof s.id !== 'string' || !s.id.trim()) return null

  // Ensure required fields have valid values or defaults
  const season = VALID_SEASONS.includes(s.season as SproutSeason)
    ? (s.season as SproutSeason)
    : '2w'

  const environment = VALID_ENVIRONMENTS.includes(s.environment as SproutEnvironment)
    ? (s.environment as SproutEnvironment)
    : 'fertile'

  // Convert legacy states to new simplified states
  // 'draft' → 'active' (was planted anyway)
  // 'failed' → 'completed' (showing up counts!)
  let state: SproutState = 'active'
  if (s.state === 'completed' || s.state === 'failed') {
    state = 'completed'
  } else if (s.state === 'uprooted') {
    state = 'uprooted'
  } else if (s.state === 'active' || s.state === 'draft') {
    state = 'active'
  }

  const sprout: Sprout = {
    id: s.id as string,
    title: typeof s.title === 'string' ? s.title : 'Untitled',
    season,
    environment,
    state,
    soilCost: typeof s.soilCost === 'number' ? s.soilCost : 0,
    createdAt: typeof s.createdAt === 'string' ? s.createdAt : new Date().toISOString(),
  }

  // Optional fields - date strings
  if (typeof s.activatedAt === 'string') sprout.activatedAt = s.activatedAt
  if (typeof s.completedAt === 'string') sprout.completedAt = s.completedAt
  if (typeof s.plantedAt === 'string') sprout.plantedAt = s.plantedAt
  if (typeof s.harvestedAt === 'string') sprout.harvestedAt = s.harvestedAt
  if (typeof s.endDate === 'string') sprout.endDate = s.endDate
  if (typeof s.result === 'number' && s.result >= 1 && s.result <= 5) sprout.result = s.result
  if (typeof s.reflection === 'string') sprout.reflection = s.reflection
  if (typeof s.leafId === 'string') sprout.leafId = s.leafId
  if (typeof s.bloomWither === 'string') sprout.bloomWither = s.bloomWither
  if (typeof s.bloomBudding === 'string') sprout.bloomBudding = s.bloomBudding
  if (typeof s.bloomFlourish === 'string') sprout.bloomFlourish = s.bloomFlourish

  // Water entries
  if (Array.isArray(s.waterEntries)) {
    sprout.waterEntries = s.waterEntries.filter(
      (e): e is { timestamp: string; content: string; prompt?: string } =>
        e &&
        typeof e === 'object' &&
        typeof (e as Record<string, unknown>).timestamp === 'string' &&
        typeof (e as Record<string, unknown>).content === 'string',
    )
  }

  return sprout
}

/**
 * Sanitize a leaf by ensuring all fields have valid types.
 * Returns a cleaned leaf or null if irrecoverable.
 */
export function sanitizeLeaf(raw: unknown): Leaf | null {
  if (!raw || typeof raw !== 'object') return null

  const l = raw as Record<string, unknown>

  // Must have valid id
  if (typeof l.id !== 'string' || !l.id.trim()) return null

  return {
    id: l.id as string,
    name: typeof l.name === 'string' ? l.name : 'Unnamed Saga',
    createdAt: typeof l.createdAt === 'string' ? l.createdAt : new Date().toISOString(),
  }
}
