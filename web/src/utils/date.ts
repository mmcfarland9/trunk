/**
 * Centralized date utilities for Trunk.
 * All timestamps use ISO 8601 strings for storage.
 * Reset times are at 6 AM local time.
 */

import { WATER_RESET_HOUR } from '../generated/constants'

// Debug clock offset (manipulated by debug panel)
let clockOffset = 0

/**
 * Get current time in milliseconds, adjusted by debug offset
 */
export function getDebugNow(): number {
  return Date.now() + clockOffset
}

/**
 * Get current date, adjusted by debug offset
 */
export function getDebugDate(): Date {
  return new Date(getDebugNow())
}

/**
 * Advance the debug clock by a number of days
 */
export function advanceClockByDays(days: number): void {
  clockOffset += days * 24 * 60 * 60 * 1000
}

/**
 * Set the debug clock to a specific date
 */
export function setDebugDate(date: Date): void {
  clockOffset = date.getTime() - Date.now()
}

/**
 * Reset the debug clock to real time
 */
export function resetDebugClock(): void {
  clockOffset = 0
}

/**
 * Get the most recent daily reset time (6am today or yesterday if before 6am)
 */
export function getTodayResetTime(): Date {
  const now = getDebugDate()
  const reset = new Date(now)
  reset.setHours(WATER_RESET_HOUR, 0, 0, 0)

  if (now < reset) {
    reset.setDate(reset.getDate() - 1)
  }
  return reset
}

/**
 * Get the most recent weekly reset time (Sunday at 6am)
 */
export function getWeekResetTime(): Date {
  const now = getDebugDate()
  const reset = new Date(now)
  reset.setHours(WATER_RESET_HOUR, 0, 0, 0)

  // Find most recent Sunday
  const daysSinceSunday = reset.getDay()
  reset.setDate(reset.getDate() - daysSinceSunday)

  // If today is Sunday but before 6am, go back a week
  if (now.getDay() === 0 && now < reset) {
    reset.setDate(reset.getDate() - 7)
  }

  return reset
}

/**
 * Get next daily reset time (tomorrow at 6am, or today if before 6am)
 */
export function getNextDailyReset(): Date {
  const reset = getTodayResetTime()
  reset.setDate(reset.getDate() + 1)
  return reset
}

/**
 * Get next weekly reset time (next Sunday at 6am)
 */
export function getNextWeeklyReset(): Date {
  const reset = getWeekResetTime()
  reset.setDate(reset.getDate() + 7)
  return reset
}

/**
 * Format reset time for display: "Resets Wed 01/22 at 6:00 AM"
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

/**
 * Convert Date to ISO 8601 string
 */
export function toISOString(date: Date): string {
  return date.toISOString()
}

/**
 * Parse ISO 8601 string to Date
 */
export function parseISOString(isoString: string): Date {
  return new Date(isoString)
}

/**
 * Get ISO week string (YYYY-Www) for grouping
 */
export function getWeekString(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${weekNo}`
}

/**
 * Get date string (YYYY-MM-DD) for grouping
 */
export function getDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}
