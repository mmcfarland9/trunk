/**
 * Shared label and emoji utilities for sprouts.
 * Uses shared constants for all labels.
 */

import sharedConstants from '../../../shared/constants.json'
import { RESULTS } from '../generated/constants'
import type { SproutEnvironment, SproutSeason } from '../types'

export const SEASONS: SproutSeason[] = ['2w', '1m', '3m', '6m', '1y']
export const ENVIRONMENTS: SproutEnvironment[] = ['fertile', 'firm', 'barren']

export function getSeasonLabel(season: SproutSeason): string {
  return sharedConstants.seasons[season].label
}

export function getEnvironmentLabel(env: SproutEnvironment): string {
  return sharedConstants.environments[env].label
}

export function getEnvironmentFormHint(env: SproutEnvironment): string {
  return sharedConstants.environments[env].formHint
}

export function getResultEmoji(result: number): string {
  return RESULTS[result as keyof typeof RESULTS]?.emoji || '🌱'
}
