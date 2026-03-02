import { subscribeSyncMetadata, forceFullSync } from '../services/sync'
import type { DetailedSyncStatus } from '../services/sync/status'
import type { AppElements } from '../types'

/** Format ISO 8601 timestamp to UTC seconds precision: yyyy-MM-ddTHH:mm:ssZ */
function formatTimestampUTC(ts: string): string {
  return new Date(ts).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export function initializeSync(elements: AppElements): void {
  // Subscribe to detailed sync metadata
  subscribeSyncMetadata((meta) => {
    const tsEl = elements.syncTimestamp
    const stateEl = elements.syncState

    if (meta.lastConfirmedTimestamp) {
      tsEl.textContent = formatTimestampUTC(meta.lastConfirmedTimestamp)
    } else {
      tsEl.textContent = ''
    }

    const stateMap: Record<string, string> = {
      synced: '\u2713 Synced',
      syncing: 'Syncing...',
      loading: 'Syncing...',
      pendingUpload: '\u2191 Pushing...',
      offline: '\u2717 Offline',
    }
    stateEl.textContent = stateMap[meta.status] || ''
    stateEl.dataset.status = meta.status

    // Update header sync status icon
    updateSyncStatusIcon(elements.syncStatusIcon, meta.status)
  })

  // Sync button — spinning icon next to profile badge
  elements.syncButton.addEventListener('click', async () => {
    const btn = elements.syncButton
    btn.disabled = true
    btn.classList.add('is-syncing')

    const result = await forceFullSync()

    btn.disabled = false
    btn.classList.remove('is-syncing')

    if (result.error) {
      alert(`Sync failed: ${result.error}`)
    } else {
      window.location.reload()
    }
  })
}

const syncIconConfig: Record<DetailedSyncStatus, { text: string; tooltip: string }> = {
  synced: { text: '\u2713', tooltip: 'Synced' },
  syncing: { text: '', tooltip: 'Syncing\u2026' },
  loading: { text: '', tooltip: 'Syncing\u2026' },
  pendingUpload: { text: '', tooltip: 'Uploading changes\u2026' },
  offline: { text: '\u26A0', tooltip: 'Offline \u2014 changes saved locally' },
}

function updateSyncStatusIcon(el: HTMLSpanElement, status: DetailedSyncStatus): void {
  const config = syncIconConfig[status]
  el.dataset.status = status
  el.textContent = config.text
  el.title = config.tooltip
}
