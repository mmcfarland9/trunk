/**
 * Pure calculation functions for soil, water, sun.
 * No state mutation - just math based on shared constants.
 */

import type { SproutSeason, SproutEnvironment } from '../types'
import constants from '../../../shared/constants.json'

// Constants
const MAX_SOIL_CAPACITY = constants.soil.maxCapacity
const SOIL_RECOVERY_PER_WATER = constants.soil.recoveryRates.waterUse
const PLANTING_COSTS = constants.soil.plantingCosts
const ENVIRONMENT_MULTIPLIERS = constants.soil.environmentMultipliers
const RESULT_MULTIPLIERS = constants.soil.resultMultipliers
const SEASONS = constants.seasons
const RESET_HOUR = constants.water.resetHour

// --- Soil Calculations ---

export function calculateSoilCost(season: SproutSeason, environment: SproutEnvironment): number {
  return PLANTING_COSTS[season][environment]
}

/**
 * Calculate capacity reward with diminishing returns.
 * As you approach MAX_SOIL_CAPACITY, growth slows toward zero.
 */
export function calculateCapacityReward(
  season: SproutSeason,
  environment: SproutEnvironment,
  result: number,
  currentCapacity: number
): number {
  const base = SEASONS[season].baseReward
  const envMult = ENVIRONMENT_MULTIPLIERS[environment]
  const resultMult = RESULT_MULTIPLIERS[String(result) as keyof typeof RESULT_MULTIPLIERS] ?? RESULT_MULTIPLIERS['3']

  // Diminishing returns (exponent 1.5) - growth slows as you approach max
  const diminishingFactor = Math.max(0, Math.pow(1 - (currentCapacity / MAX_SOIL_CAPACITY), 1.5))

  return base * envMult * resultMult * diminishingFactor
}

/**
 * Legacy function for backwards compatibility - returns base reward without diminishing
 */
export function getCapacityReward(environment: SproutEnvironment, season: SproutSeason): number {
  return SEASONS[season].baseReward * ENVIRONMENT_MULTIPLIERS[environment]
}

export function getMaxSoilCapacity(): number {
  return MAX_SOIL_CAPACITY
}

export function getSoilRecoveryRate(): number {
  return SOIL_RECOVERY_PER_WATER
}

// --- Reset Time Calculations ---

/**
 * Get the most recent daily reset time (6am today or yesterday if before 6am)
 */
export function getTodayResetTime(now: Date = new Date()): Date {
  const reset = new Date(now)
  reset.setHours(RESET_HOUR, 0, 0, 0)

  if (now < reset) {
    reset.setDate(reset.getDate() - 1)
  }
  return reset
}

/**
 * Get the most recent weekly reset time (Monday at 6am)
 * Per shared/formulas.md: "Resets weekly on Monday at 6:00 AM"
 */
export function getWeekResetTime(now: Date = new Date()): Date {
  const reset = new Date(now)
  reset.setHours(RESET_HOUR, 0, 0, 0)

  // Find most recent Monday
  // getDay(): Sunday=0, Monday=1, Tuesday=2, ..., Saturday=6
  // daysSinceMonday: Monday=0, Tuesday=1, ..., Sunday=6
  const dayOfWeek = reset.getDay()
  const daysSinceMonday = (dayOfWeek + 6) % 7
  reset.setDate(reset.getDate() - daysSinceMonday)

  // If today is Monday but before 6am, go back a week
  if (dayOfWeek === 1 && now < reset) {
    reset.setDate(reset.getDate() - 7)
  }

  return reset
}

/**
 * Get next daily reset time
 */
export function getNextWaterReset(now: Date = new Date()): Date {
  const reset = getTodayResetTime(now)
  reset.setDate(reset.getDate() + 1)
  return reset
}

/**
 * Get next weekly reset time
 */
export function getNextSunReset(now: Date = new Date()): Date {
  const reset = getWeekResetTime(now)
  reset.setDate(reset.getDate() + 7)
  return reset
}

/**
 * Format reset time as "Resets Wed 01/22 at 6:00 AM"
 */
export function formatResetTime(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const day = days[date.getDay()]
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const dayNum = String(date.getDate()).padStart(2, '0')

  let hours = date.getHours()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `Resets ${day} ${month}/${dayNum} at ${hours}:${minutes} ${ampm}`
}

