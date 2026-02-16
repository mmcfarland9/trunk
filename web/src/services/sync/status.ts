import { getPendingCount } from './pending-uploads'

export type DetailedSyncStatus = 'synced' | 'syncing' | 'pendingUpload' | 'offline' | 'loading'

export type SyncMetadata = {
  status: DetailedSyncStatus
  lastConfirmedTimestamp: string | null
  pendingCount: number
}

type SyncMetadataListener = (meta: SyncMetadata) => void
const metadataListeners: SyncMetadataListener[] = []

// Injected from operations.ts via setStatusDependencies() to avoid circular dependency
let getCurrentSyncStatus: () => string = () => 'idle'
let getLastConfirmedTimestamp: () => string | null = () => null

export function setStatusDependencies(
  getSyncStatus: () => string,
  getTimestamp: () => string | null
): void {
  getCurrentSyncStatus = getSyncStatus
  getLastConfirmedTimestamp = getTimestamp
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
  }
  metadataListeners.forEach(l => l(meta))
}
