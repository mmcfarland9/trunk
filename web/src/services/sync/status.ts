import { getPendingCount } from './pending-uploads'

export type DetailedSyncStatus = 'synced' | 'syncing' | 'pendingUpload' | 'offline' | 'loading'

export type SyncMetadata = {
  status: DetailedSyncStatus
  lastConfirmedTimestamp: string | null
  pendingCount: number
  // DR-6: Sync failure feedback
  lastError: string | null
  consecutiveFailures: number
  lastFailureAt: string | null
}

type SyncMetadataListener = (meta: SyncMetadata) => void
const metadataListeners: SyncMetadataListener[] = []

// Injected from operations.ts via setStatusDependencies() to avoid circular dependency
let getCurrentSyncStatus: () => string = () => 'idle'
let getLastConfirmedTimestamp: () => string | null = () => null

export function setStatusDependencies(
  getSyncStatus: () => string,
  getTimestamp: () => string | null,
): void {
  getCurrentSyncStatus = getSyncStatus
  getLastConfirmedTimestamp = getTimestamp
}

// DR-6: Sync failure tracking
// REVIEW: Sync failure surfaced via status module. UI consumption TBD — could be toast, inline banner, or status indicator.
let lastSyncError: string | null = null
let consecutiveFailures = 0
let lastFailureAt: string | null = null

export function recordSyncFailure(error: string): void {
  lastSyncError = error
  consecutiveFailures++
  lastFailureAt = new Date().toISOString()
  notifyMetadataListeners()
}

export function resetSyncFailures(): void {
  if (consecutiveFailures > 0) {
    lastSyncError = null
    consecutiveFailures = 0
    lastFailureAt = null
    notifyMetadataListeners()
  }
}

export function getDetailedSyncStatus(): DetailedSyncStatus {
  const currentStatus = getCurrentSyncStatus()
  if (currentStatus === 'syncing') return 'syncing'
  if (currentStatus === 'error') return 'offline'
  if (getPendingCount() > 0) return 'pendingUpload'
  if (currentStatus === 'success' || currentStatus === 'idle') return 'synced'
  return 'loading'
}

export function subscribeSyncMetadata(listener: SyncMetadataListener): () => void {
  metadataListeners.push(listener)
  // Immediate callback with current state
  listener({
    status: getDetailedSyncStatus(),
    lastConfirmedTimestamp: getLastConfirmedTimestamp(),
    pendingCount: getPendingCount(),
    lastError: lastSyncError,
    consecutiveFailures,
    lastFailureAt,
  })
  return () => {
    const index = metadataListeners.indexOf(listener)
    if (index > -1) metadataListeners.splice(index, 1)
  }
}

export function notifyMetadataListeners(): void {
  const meta: SyncMetadata = {
    status: getDetailedSyncStatus(),
    lastConfirmedTimestamp: getLastConfirmedTimestamp(),
    pendingCount: getPendingCount(),
    lastError: lastSyncError,
    consecutiveFailures,
    lastFailureAt,
  }
  metadataListeners.forEach((l) => l(meta))
}
