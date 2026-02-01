/**
 * Shared label and emoji utilities for sprouts.
 * Uses shared constants for all labels.
 */

import type { SproutSeason, SproutEnvironment } from '../types'
import sharedConstants from '../../../shared/constants.json'

export const SEASONS: SproutSeason[] = ['2w', '1m', '3m', '6m', '1y']
export const ENVIRONMENTS: SproutEnvironment[] = ['fertile', 'firm', 'barren']

// Result emoji scale: 1=withered, 2=sprout, 3=sapling, 4=tree, 5=oak
const RESULT_EMOJIS: Record<number, string> = {
  1: '🥀', // withered
  2: '🌱', // sprout
  3: '🌿', // sapling
  4: '🌳', // tree
  5: '🌲', // strong oak/evergreen
}

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
  return RESULT_EMOJIS[result] || '🌱'
}
