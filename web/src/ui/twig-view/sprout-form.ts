import type { SproutSeason, SproutEnvironment } from '../../types'

/**
 * Represents the mutable state of the sprout form.
 */
export type FormState = {
  selectedSeason: SproutSeason | null
  selectedEnvironment: SproutEnvironment | null
  currentTwigNode: HTMLButtonElement | null
  confirmResolve: ((value: boolean) => void) | null
}

/**
 * Creates a new form state object.
 */
export function createFormState(): FormState {
  return {
    selectedSeason: null,
    selectedEnvironment: null,
    currentTwigNode: null,
    confirmResolve: null,
  }
}

/**
 * Gets the current node ID from the form state.
 */
export function getCurrentNodeId(state: FormState): string | null {
  return state.currentTwigNode?.dataset.nodeId || null
}

/**
 * Date and time helper functions.
 */
export function getEndDate(season: SproutSeason, startDate: Date = new Date()): Date {
  const end = new Date(startDate)
  switch (season) {
    case '2w':
      end.setDate(end.getDate() + 14)
      break
    case '1m':
      end.setMonth(end.getMonth() + 1)
      break
    case '3m':
      end.setMonth(end.getMonth() + 3)
      break
    case '6m':
      end.setMonth(end.getMonth() + 6)
      break
    case '1y':
      end.setFullYear(end.getFullYear() + 1)
      break
  }
  // 9am in user's local timezone, matching the local-time convention used by reset boundaries
  end.setHours(9, 0, 0, 0)
  return end
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
