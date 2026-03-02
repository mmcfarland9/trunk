import type { AppContext } from '../types'
import { setEventStoreErrorCallbacks, exportEvents, getEvents } from '../events/store'
import { STORAGE_KEYS, EXPORT_REMINDER_DAYS } from '../generated/constants'
import { showToast } from '../ui/toast'
import { initCharts } from './charts'
import { initDialogs } from './dialogs'

export type NavCallbacks = {
  onPositionNodes: () => void
  onUpdateStats: () => void
}

export type DialogAPIs = {
  waterDialog: {
    isOpen: () => boolean
    close: () => void
    open: () => boolean
  }
  harvestDialog: {
    isOpen: () => boolean
    close: () => void
    openReady: () => boolean
  }
  sunLog: {
    isOpen: () => boolean
    close: () => void
    open: () => void
  }
  soilBag: {
    isOpen: () => boolean
    close: () => void
  }
  waterCan: {
    isOpen: () => boolean
    close: () => void
  }
  account: {
    isOpen: () => boolean
    close: () => void
  }
  shine: {
    updateSunMeter: () => void
  }
  charts: {
    updateRadar: () => void
    updateSoil: () => void
  }
}

/**
 * Download events as a JSON backup file.
 */
function downloadExport(): void {
  const events = exportEvents()
  const json = JSON.stringify({ version: 1, events }, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `trunk-backup-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  localStorage.setItem(STORAGE_KEYS.lastExport, Date.now().toString())
}

const QUOTA_BANNER_ID = 'quota-warning-banner'

/**
 * Show a persistent warning banner when localStorage is full.
 * Dismissible, but reappears on the next failed save.
 */
export function showQuotaWarning(): void {
  // If already visible, don't duplicate
  if (document.getElementById(QUOTA_BANNER_ID)) return

  const banner = document.createElement('div')
  banner.id = QUOTA_BANNER_ID
  banner.className = 'quota-warning'
  banner.innerHTML = `
    <p class="quota-warning-message">Storage full — data may be lost if you close this tab. Export your data now.</p>
    <div class="quota-warning-actions">
      <button type="button" class="action-btn action-btn-progress action-btn-twig quota-warning-export">Export Data</button>
      <button type="button" class="quota-warning-close" aria-label="Dismiss">\u00d7</button>
    </div>
  `

  banner.querySelector('.quota-warning-export')!.addEventListener('click', downloadExport)
  banner.querySelector('.quota-warning-close')!.addEventListener('click', () => {
    banner.remove()
  })

  document.body.prepend(banner)
}

/**
 * Show a toast if the user hasn't exported data in EXPORT_REMINDER_DAYS.
 * Only fires once per session (on app load) and only when events exist.
 */
function checkExportReminder(): void {
  if (getEvents().length === 0) return

  const lastExport = localStorage.getItem(STORAGE_KEYS.lastExport)
  const thresholdMs = EXPORT_REMINDER_DAYS * 24 * 60 * 60 * 1000

  if (lastExport) {
    const elapsed = Date.now() - Number(lastExport)
    if (elapsed < thresholdMs) return
  }

  // No export ever recorded, or it's been too long
  showToast(
    'It\u2019s been a while since your last export. Back up your data in Account \u203A Data.',
    5000,
  )
}

export function initializeUI(ctx: AppContext, navCallbacks: NavCallbacks): DialogAPIs {
  // Set up storage error callbacks
  setEventStoreErrorCallbacks(
    () => showQuotaWarning(),
    (error: unknown) => {
      void error // Storage errors are surfaced via quota warning banner
    },
  )

  // Check if user should be reminded to export
  checkExportReminder()

  // Initialize charts
  const charts = initCharts(ctx)

  // Initialize dialogs, views, and sidebar — returns the full DialogAPIs
  return initDialogs(ctx, navCallbacks, charts)
}

export { updateSoilMeter, updateWaterMeter, updateWaterStreak, celebrateMeter } from './meters'
