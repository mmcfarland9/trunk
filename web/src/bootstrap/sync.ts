import { subscribeSyncMetadata, forceFullSync } from '../services/sync'
import type { DetailedSyncStatus } from '../services/sync/status'
import type { AppElements } from '../types'

/** Format timestamp to friendly relative text like "today at 2:30 PM" or "Mar 6 at 2:30 PM" */
function formatFriendlyTime(ts: string): string {
  const date = new Date(ts)
  const now = new Date()
  const time = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (isToday) return `today at ${time}`

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()

  if (isYesterday) return `yesterday at ${time}`

  const day = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  return `${day} at ${time}`
}

export function initializeSync(elements: AppElements): void {
  // Subscribe to detailed sync metadata
  subscribeSyncMetadata((meta) => {
    const el = elements.syncStatus

    if (meta.status === 'synced') {
      el.textContent = meta.lastConfirmedTimestamp
        ? `Last synced ${formatFriendlyTime(meta.lastConfirmedTimestamp)}`
        : 'Synced'
    } else if (meta.status === 'syncing' || meta.status === 'loading') {
      el.textContent = 'Syncing now\u2026'
    } else if (meta.status === 'pendingUpload') {
      el.textContent = 'Uploading changes\u2026'
    } else if (meta.status === 'offline') {
      el.textContent = 'Offline \u2014 changes saved locally'
    } else {
      el.textContent = ''
    }
    el.dataset.status = meta.status

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

let fadeTimer: ReturnType<typeof setTimeout> | null = null

function updateSyncStatusIcon(el: HTMLSpanElement, status: DetailedSyncStatus): void {
  const config = syncIconConfig[status]
  el.dataset.status = status
  el.textContent = config.text
  el.title = config.tooltip

  // Show the icon
  el.classList.add('is-visible')
  if (fadeTimer) clearTimeout(fadeTimer)

  // Active states stay visible; terminal states fade after 3s
  if (status === 'syncing' || status === 'loading' || status === 'pendingUpload') {
    return
  }
  fadeTimer = setTimeout(() => {
    el.classList.remove('is-visible')
    fadeTimer = null
  }, 3000)
}
