/**
 * Shared timeout utility for sync operations.
 * DR-3: AbortController-based request timeouts.
 */

// REVIEW: Timeout set to 15s. Could be 10s (aggressive) or 30s (lenient).
const SYNC_TIMEOUT_MS = 15_000

export function createTimeoutSignal(): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS)
  return { signal: controller.signal, clear: () => clearTimeout(timeout) }
}
