export const CACHE_VERSION = 1
export const CACHE_VERSION_KEY = 'trunk-cache-version'

/**
 * Check if cache version matches current version
 */
export function isCacheValid(): boolean {
  const stored = localStorage.getItem(CACHE_VERSION_KEY)
  return stored === String(CACHE_VERSION)
}

/**
 * Update stored cache version to current
 */
export function setCacheVersion(): void {
  localStorage.setItem(CACHE_VERSION_KEY, String(CACHE_VERSION))
}

/**
 * Clear cache version (forces full sync on next load)
 */
export function clearCacheVersion(): void {
  localStorage.removeItem(CACHE_VERSION_KEY)
}

/**
 * DO-12: Invalidate cache on sync failure so stale data isn't served.
 * Clears the cache version, forcing a full sync on next attempt.
 */
export function invalidateOnSyncFailure(): void {
  localStorage.removeItem(CACHE_VERSION_KEY)
}
