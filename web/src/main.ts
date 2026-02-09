import './styles/index.css'
import { initAuth, subscribeToAuth } from './services/auth-service'
import { createLoginView, destroyLoginView } from './ui/login-view'
import { isSupabaseConfigured } from './lib/supabase'
import { pushEvent, subscribeToRealtime, unsubscribeFromRealtime, smartSync, subscribeSyncStatus } from './services/sync-service'
import { initEventStore, setEventSyncCallback, setEventStoreErrorCallbacks } from './events/store'
import type { AppContext } from './types'
import { getViewMode, getActiveBranchIndex, getActiveTwigId, setViewModeState, getSoilAvailable, getSoilCapacity, getWaterAvailable } from './state'
import { updateFocus, setFocusedNode, syncNode } from './ui/node-ui'
import { buildApp } from './ui/dom-builder'
import { buildTwigView } from './ui/twig-view'
import { buildLeafView } from './ui/leaf-view'
import { positionNodes, startWind } from './ui/layout'
import { setupHoverBranch, setupHoverTwig } from './features/hover-branch'
import {
  setViewMode,
  returnToOverview,
  enterBranchView,
  enterTwigView,
  returnToBranchView,
} from './features/navigation'
import { updateStats, initSidebarSprouts } from './features/progress'
import { initWaterDialog } from './features/water-dialog'
import { initHarvestDialog } from './features/harvest-dialog'
import { initShine } from './features/shine-dialog'
import { initSunLogDialog, initSoilBagDialog, initWaterCanDialog } from './features/log-dialogs'
import { initAccountDialog } from './features/account-dialog'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) {
  throw new Error('Root container "#app" not found.')
}

// Initialize event store before any state derivation
initEventStore()

// Auth gating - show login if Supabase is configured and user not authenticated
let loginView: HTMLElement | null = null
let hasSynced = false

async function startWithAuth() {
  await initAuth()

  subscribeToAuth(async (state) => {
    if (state.loading) return

    if (isSupabaseConfigured() && !state.user) {
      // Show login, hide app
      if (!loginView) {
        loginView = createLoginView()
        document.body.prepend(loginView)
      }
      app!.classList.add('hidden')
      hasSynced = false
    } else {
      // Hide login, show app
      if (loginView) {
        loginView.remove()
        loginView = null
        destroyLoginView()
      }
      app!.classList.remove('hidden')

      // Sync on first auth - cloud is single source of truth
      if (isSupabaseConfigured() && state.user && !hasSynced) {
        hasSynced = true

        // Smart sync: incremental if cache valid, full if not
        const result = await smartSync()
        if (result.error) {
          console.warn(`Sync failed (${result.mode}):`, result.error)
          // Don't reload - use cached data as fallback
        } else if (result.pulled > 0) {
          console.info(`Synced ${result.pulled} events (${result.mode})`)
          refreshUI()
        } else {
          console.info(`Sync complete, no new events (${result.mode})`)
        }

        // Enable real-time sync: push events as they're created
        setEventSyncCallback((event) => {
          pushEvent(event).then(({ error: pushError }) => {
            if (pushError) {
              console.warn('Failed to sync event:', pushError)
            }
          })
        })

        // Subscribe to realtime for instant cross-device sync
        subscribeToRealtime(() => {
          refreshUI()
        })
      }

      // Disable sync callback and realtime when logged out
      if (!state.user) {
        setEventSyncCallback(null)
        unsubscribeFromRealtime()
      }

      // Update profile badge based on auth state
      if (state.user) {
        domResult.elements.profileBadge.classList.remove('hidden')
        domResult.elements.profileEmail.textContent = state.user.email || ''
        // Update trunk label with user's full_name from profile
        syncNode(domResult.elements.trunk)
        updateFocus(null, ctx)
      } else {
        domResult.elements.profileBadge.classList.add('hidden')
        domResult.elements.profileEmail.textContent = ''
      }
    }
  })
}

startWithAuth()

const navCallbacks = {
  onPositionNodes: () => positionNodes(ctx),
  onUpdateStats: () => {
    updateStats(ctx)
    positionNodes(ctx)
  },
}


function handleNodeClick(
  element: HTMLButtonElement,
  nodeId: string,
  _placeholder: string
): void {
  if (nodeId === 'trunk' && getViewMode() === 'branch') {
    returnToOverview(ctx, navCallbacks)
    return
  }

  // Trunk click from twig view goes back to overview
  if (nodeId === 'trunk' && getViewMode() === 'twig') {
    returnToOverview(ctx, navCallbacks)
    return
  }

  const branchIndex = element.dataset.branchIndex
  if (branchIndex !== undefined && getViewMode() === 'overview') {
    enterBranchView(Number(branchIndex), ctx, navCallbacks)
    return
  }

  // Twig click enters twig view
  const isTwig = element.classList.contains('twig')
  if (isTwig && getViewMode() === 'branch') {
    const twigBranchIndex = element.dataset.branchIndex
    if (twigBranchIndex !== undefined) {
      enterTwigView(element, Number(twigBranchIndex), ctx, navCallbacks)
    }
    return
  }

  // All nodes (trunk/branches/twigs) are edited via JSON only
}

const domResult = buildApp(app, handleNodeClick)

// Subscribe to sync status changes
subscribeSyncStatus((status) => {
  domResult.elements.syncIndicator.dataset.status = status
  domResult.elements.syncIndicator.title = `Sync: ${status}`
  // Update the text label based on status
  const textMap: Record<string, string> = {
    idle: 'Synced',
    syncing: 'Syncing...',
    success: 'Synced',
    error: 'Sync error'
  }
  domResult.elements.syncText.textContent = textMap[status] || 'Synced'
})

// Soil meter update function
function updateSoilMeter(): void {
  const available = getSoilAvailable()
  const capacity = getSoilCapacity()
  const pct = capacity > 0 ? (available / capacity) * 100 : 0
  domResult.elements.soilMeterFill.style.width = `${pct}%`
  domResult.elements.soilMeterValue.textContent = `${available.toFixed(2)}/${capacity.toFixed(2)}`
}

// Water meter update function - toggle circle fill states
function updateWaterMeter(): void {
  const available = getWaterAvailable()
  domResult.elements.waterCircles.forEach((circle, i) => {
    circle.classList.toggle('is-filled', i < available)
  })
}

// Initialize context first (partial, will be completed after dialog init)
const ctx: AppContext = {
  elements: domResult.elements,
  branchGroups: domResult.branchGroups,
  allNodes: domResult.allNodes,
  nodeLookup: domResult.nodeLookup,
  twigView: undefined,
  leafView: undefined,
}

// Set up storage error callbacks
setEventStoreErrorCallbacks(
  () => {
    // Quota error - prompt user to export data
    console.error('Storage full! Please export your data to prevent data loss.')
  },
  () => {
    // General storage error
    console.warn('Unable to save. Export your data as backup.')
  }
)

// Initialize dialogs
const waterDialogApi = initWaterDialog(ctx, {
  onWaterMeterChange: updateWaterMeter,
  onSoilMeterChange: updateSoilMeter,
  onWaterComplete: () => {
    navCallbacks.onUpdateStats()
    ctx.twigView?.refresh()
  },
})

const harvestDialogApi = initHarvestDialog(ctx, {
  onSoilMeterChange: updateSoilMeter,
  onHarvestComplete: navCallbacks.onUpdateStats,
})

// Late-binding container for sun log populate function
let sunLogPopulate: (() => void) | null = null

const shineApi = initShine(ctx, {
  onSunMeterChange: () => shineApi.updateSunMeter(),
  onSoilMeterChange: updateSoilMeter,
  onShineComplete: () => sunLogPopulate?.(),
})

// Initialize log dialogs
const sunLogApi = initSunLogDialog(domResult.elements, {
  onPopulateSunLogShine: () => shineApi.populateSunLogShine(),
})
sunLogPopulate = sunLogApi.populate

const soilBagApi = initSoilBagDialog(domResult.elements)
const waterCanApi = initWaterCanDialog(domResult.elements)
const accountApi = initAccountDialog(domResult.elements)

const mapPanel = domResult.elements.canvas.parentElement as HTMLElement
const twigView = buildTwigView(mapPanel, {
  onClose: () => returnToBranchView(ctx, navCallbacks),
  onSave: navCallbacks.onUpdateStats,
  onSoilChange: updateSoilMeter,
  onOpenLeaf: (leafId, twigId, branchIndex) => {
    setViewModeState('leaf', branchIndex, twigId)
    ctx.leafView?.open(leafId, twigId, branchIndex)
  },
  onNavigate: (direction) => {
    const activeBranchIndex = getActiveBranchIndex()
    const activeTwigId = getActiveTwigId()
    if (activeBranchIndex === null || !activeTwigId) return null

    const branchGroup = ctx.branchGroups[activeBranchIndex]
    if (!branchGroup) return null

    const currentIndex = branchGroup.twigs.findIndex(t => t.dataset.nodeId === activeTwigId)
    if (currentIndex === -1) return null

    const newIndex = direction === 'prev'
      ? (currentIndex - 1 + branchGroup.twigs.length) % branchGroup.twigs.length
      : (currentIndex + 1) % branchGroup.twigs.length

    const newTwig = branchGroup.twigs[newIndex]
    if (newTwig) {
      const newTwigId = newTwig.dataset.nodeId
      if (newTwigId) {
        setViewModeState('twig', activeBranchIndex, newTwigId)
        setFocusedNode(newTwig, ctx, (target) => updateFocus(target, ctx))
      }
    }
    return newTwig ?? null
  },
  onWaterClick: (sprout) => waterDialogApi.openWaterDialog(sprout),
  onHarvestClick: (sprout) => harvestDialogApi.openHarvestDialog(sprout),
})

const leafView = buildLeafView(mapPanel, {
  onClose: () => {
    leafView.close()
    // Return to twig view
    const activeBranchIndex = getActiveBranchIndex()
    const activeTwigId = getActiveTwigId()
    if (activeBranchIndex !== null && activeTwigId) {
      const twig = ctx.nodeLookup.get(activeTwigId)
      if (twig) {
        setViewModeState('twig', activeBranchIndex, activeTwigId)
        ctx.twigView?.open(twig)
      }
    }
    navCallbacks.onUpdateStats()
  },
  onSave: navCallbacks.onUpdateStats,
  onSoilChange: updateSoilMeter,
})

// Complete the context with twig and leaf views
ctx.twigView = twigView
ctx.leafView = leafView

// Incremental UI refresh — replaces window.location.reload() for realtime events
function refreshUI(): void {
  // Re-sync all node DOM elements (labels, filled state from derived state)
  domResult.allNodes.forEach(node => syncNode(node))

  // Re-derive stats, sidebar sprouts, layout
  updateStats(ctx)
  positionNodes(ctx)
  updateFocus(null, ctx)

  // Re-derive resource meters
  updateSoilMeter()
  updateWaterMeter()
  shineApi.updateSunMeter()

  // Refresh open panels
  ctx.twigView?.refresh()
}

domResult.elements.backToTrunkButton.addEventListener('click', () => {
  returnToOverview(ctx, navCallbacks)
})

domResult.elements.backToBranchButton.addEventListener('click', () => {
  returnToBranchView(ctx, navCallbacks)
})

// Initialize sidebar sprout sections with branch hover/click callbacks
initSidebarSprouts(
  ctx,
  (sprout) => waterDialogApi.openWaterDialog(sprout),
  {
    onClick: (index) => enterBranchView(index, ctx, navCallbacks)
  },
  (twigId, branchIndex) => {
    // Navigate to twig view
    const twig = ctx.nodeLookup.get(twigId)
    if (twig) {
      enterTwigView(twig, branchIndex, ctx, navCallbacks)
    }
  },
  (leafId, twigId, branchIndex) => {
    // Navigate to leaf view
    const twig = ctx.nodeLookup.get(twigId)
    if (twig) {
      // Enter twig view first, then open leaf view
      enterTwigView(twig, branchIndex, ctx, navCallbacks)
      setViewModeState('leaf', branchIndex, twigId)
      ctx.leafView?.open(leafId, twigId, branchIndex)
    }
  },
  (sprout) => {
    // Open harvest dialog
    harvestDialogApi.openHarvestDialog({
      id: sprout.id,
      title: sprout.title,
      twigId: sprout.twigId,
      twigLabel: sprout.twigLabel,
      season: sprout.season,
      environment: sprout.environment,
      soilCost: sprout.soilCost,
      bloomWither: sprout.bloomWither,
      bloomBudding: sprout.bloomBudding,
      bloomFlourish: sprout.bloomFlourish,
    })
  }
)

setViewMode('overview', ctx, navCallbacks)
updateStats(ctx)
updateFocus(null, ctx)
updateSoilMeter()
updateWaterMeter()
shineApi.updateSunMeter()


let resizeId = 0
const handleResize = () => {
  if (resizeId) {
    window.cancelAnimationFrame(resizeId)
  }
  resizeId = window.requestAnimationFrame(() => positionNodes(ctx))
}
const resizeObserver = new ResizeObserver(handleResize)
resizeObserver.observe(domResult.elements.canvas)
window.addEventListener('resize', handleResize)

startWind(ctx)
setupHoverBranch(ctx, navCallbacks)
setupHoverTwig(ctx)


// Global keyboard navigation
document.addEventListener('keydown', (e) => {
  // Skip if user is typing in an input field (except for Escape)
  const isTyping = e.target instanceof HTMLInputElement ||
                   e.target instanceof HTMLTextAreaElement ||
                   e.target instanceof HTMLSelectElement

  // Handle Escape: close dialogs first, then zoom back
  if (e.key === 'Escape') {
    // Priority 1: Close any open dialog
    if (waterDialogApi.isOpen()) {
      e.preventDefault()
      waterDialogApi.closeWaterDialog()
      return
    }
    if (harvestDialogApi.isOpen()) {
      e.preventDefault()
      harvestDialogApi.closeHarvestDialog()
      return
    }
    if (sunLogApi.isOpen()) {
      e.preventDefault()
      sunLogApi.close()
      return
    }
    if (soilBagApi.isOpen()) {
      e.preventDefault()
      soilBagApi.close()
      return
    }
    if (waterCanApi.isOpen()) {
      e.preventDefault()
      waterCanApi.close()
      return
    }
    if (accountApi.isOpen()) {
      e.preventDefault()
      accountApi.close()
      return
    }

    // Priority 2: Let twig/leaf views handle their own escape (they have internal handlers)
    if (ctx.twigView?.isOpen() || ctx.leafView?.isOpen()) {
      return // Let their handlers deal with it
    }

    // Priority 3: Navigation zoom back
    if (getViewMode() === 'branch') {
      returnToOverview(ctx, navCallbacks)
      return
    }
    return
  }

  // Don't handle other keys if user is typing
  if (isTyping) return

  // Don't handle other keys if twig view is open
  if (ctx.twigView?.isOpen()) return

  // Arrow keys cycle through branches in branch view
  if (getViewMode() === 'branch' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.metaKey) {
    const currentIndex = getActiveBranchIndex()
    if (currentIndex === null) return

    const branchCount = ctx.branchGroups.length
    const newIndex = e.key === 'ArrowRight'
      ? (currentIndex + 1) % branchCount
      : (currentIndex - 1 + branchCount) % branchCount

    enterBranchView(newIndex, ctx, navCallbacks)
    return
  }

  const num = parseInt(e.key, 10)
  if (num < 1 || num > 8) return

  if (getViewMode() === 'overview') {
    // Check if hovering a branch - if so, go to twig in that branch
    const hoveredGroup = ctx.elements.canvas.querySelector('.branch-group:hover')
    if (hoveredGroup) {
      const branchIndex = ctx.branchGroups.findIndex(g => g.group === hoveredGroup)
      if (branchIndex !== -1) {
        const twig = ctx.branchGroups[branchIndex]?.twigs[num - 1]
        if (twig) {
          enterTwigView(twig, branchIndex, ctx, navCallbacks)
        }
      }
    } else {
      // Not hovering - go to branch
      const branchIndex = num - 1
      const branchGroup = ctx.branchGroups[branchIndex]
      if (branchGroup) {
        enterBranchView(branchIndex, ctx, navCallbacks)
        branchGroup.branch.focus({ preventScroll: true })
      }
    }
    return
  }

  // In branch view: go to twig
  if (getViewMode() === 'branch') {
    const activeBranchIndex = getActiveBranchIndex()
    if (activeBranchIndex === null) return
    const branchGroup = ctx.branchGroups[activeBranchIndex]
    const twig = branchGroup?.twigs[num - 1]
    if (twig) {
      enterTwigView(twig, activeBranchIndex, ctx, navCallbacks)
    }
  }
})

// Debug panel toggle: press 'd' then 'b' within 500ms
