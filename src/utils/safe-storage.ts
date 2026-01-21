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

/**
 * Get approximate localStorage usage in bytes.
 */
export function getStorageUsage(): { used: number; total: number } {
  let used = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        used += key.length + (localStorage.getItem(key)?.length || 0)
      }
    }
  } catch {
    // Storage may be unavailable
  }

  // localStorage limit is typically 5MB (5 * 1024 * 1024 bytes)
  const total = 5 * 1024 * 1024
  return { used: used * 2, total } // *2 for UTF-16 encoding
}

/**
 * Format bytes as a human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
