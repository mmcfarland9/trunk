import type { AppContext } from '../types'
import { setEventStoreErrorCallbacks, exportEvents } from '../events/store'
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
    open: () => void
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

export function initializeUI(ctx: AppContext, navCallbacks: NavCallbacks): DialogAPIs {
  // Set up storage error callbacks
  setEventStoreErrorCallbacks(
    () => showQuotaWarning(),
    (error: unknown) => {
      void error // Storage errors are surfaced via quota warning banner
    },
  )

  // Initialize charts
  const charts = initCharts(ctx)

  // Initialize dialogs, views, and sidebar — returns the full DialogAPIs
  return initDialogs(ctx, navCallbacks, charts)
}

export { updateSoilMeter, updateWaterMeter, celebrateMeter } from './meters'
