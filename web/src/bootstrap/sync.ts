import { subscribeSyncMetadata, forceFullSync } from '../services/sync'
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
