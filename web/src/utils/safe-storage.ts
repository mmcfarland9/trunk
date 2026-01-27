/**
 * Safe localStorage wrapper that handles quota errors gracefully.
 */

export type StorageResult = {
  success: boolean
  isQuotaError: boolean
}

/**
 * Safely set an item in localStorage, detecting quota errors.
 */
export function safeSetItem(key: string, value: string): StorageResult {
  try {
    localStorage.setItem(key, value)
    return { success: true, isQuotaError: false }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      return { success: false, isQuotaError: true }
    }
    // Other errors (e.g., private browsing, disabled storage)
    return { success: false, isQuotaError: false }
  }
}

