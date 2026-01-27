/**
 * Shared label and emoji utilities for sprouts.
 * Used by twig-view.ts and leaf-view.ts.
 */

import type { SproutSeason, SproutEnvironment } from '../types'

export const SEASONS: SproutSeason[] = ['2w', '1m', '3m', '6m', '1y']
export const ENVIRONMENTS: SproutEnvironment[] = ['fertile', 'firm', 'barren']

const SEASON_LABELS: Record<SproutSeason, string> = {
  '2w': '2 weeks',
  '1m': '1 month',
  '3m': '3 months',
  '6m': '6 months',
  '1y': '1 year',
}

const ENVIRONMENT_LABELS: Record<SproutEnvironment, string> = {
  fertile: 'Fertile',
  firm: 'Firm',
  barren: 'Barren',
}

// Result emoji scale: 1=withered, 2=sprout, 3=sapling, 4=tree, 5=oak
const RESULT_EMOJIS: Record<number, string> = {
  1: '🥀', // withered
  2: '🌱', // sprout
  3: '🌿', // sapling
  4: '🌳', // tree
  5: '🌲', // strong oak/evergreen
}

export function getSeasonLabel(season: SproutSeason): string {
  return SEASON_LABELS[season]
}

export function getEnvironmentLabel(env: SproutEnvironment): string {
  return ENVIRONMENT_LABELS[env]
}

export function getResultEmoji(result: number): string {
  return RESULT_EMOJIS[result] || '🌱'
}
