import './styles/index.css'
import type { AppContext } from './types'
import { getViewMode, getActiveBranchIndex, getActiveTwigId, setViewModeState, advanceClockByDays, getDebugDate, nodeState, saveState, getSoilAvailable, getSoilCapacity, getWaterAvailable, resetResources, getNotificationSettings, saveNotificationSettings, setStorageErrorCallbacks } from './state'
import type { NotificationSettings } from './types'
import { updateFocus, setFocusedNode, syncNode } from './ui/node-ui'
import { buildApp, getActionButtons } from './ui/dom-builder'
import { buildEditor } from './ui/editor'
import { buildTwigView } from './ui/twig-view'
import { buildLeafView } from './ui/leaf-view'
import { positionNodes, startWind, setDebugHoverZone } from './ui/layout'
import { setupHoverBranch, setupHoverTwig } from './features/hover-branch'
import { handleExport, handleImport, checkExportReminder } from './features/import-export'
import {
  setViewMode,
  returnToOverview,
  enterBranchView,
  enterTwigView,
  returnToBranchView,
} from './features/navigation'
import { updateStats, initSidebarSprouts } from './features/progress'
import { setStatus, updateStatusMeta } from './features/status'
import { initWaterDialog } from './features/water-dialog'
import { initHarvestDialog } from './features/harvest-dialog'
import { initShine } from './features/shine-dialog'
import { initSunLogDialog, initSoilBagDialog, initWaterCanDialog } from './features/log-dialogs'
import { STATUS_DEFAULT_MESSAGE } from './constants'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) {
  throw new Error('Root container "#app" not found.')
}

const navCallbacks = {
  onPositionNodes: () => positionNodes(ctx),
  onUpdateStats: () => {
    updateStats(ctx)
    positionNodes(ctx)
    updateStatusMeta(ctx.elements, true)
  },
}

const importExportCallbacks = {
  onUpdateStats: navCallbacks.onUpdateStats,
  onSetViewMode: (mode: 'overview') => setViewMode(mode, ctx, navCallbacks),
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

const editor = buildEditor(domResult.elements.canvas, {
  onSave: navCallbacks.onUpdateStats,
  onUpdateFocus: (target) => updateFocus(target, ctx),
})
domResult.elements.shell.append(editor.container)

// Soil meter update function
function updateSoilMeter(): void {
  const available = getSoilAvailable()
  const capacity = getSoilCapacity()
  domResult.elements.soilMeterFill.style.width = `${(available / capacity) * 100}%`
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
  editor,
  twigView: undefined,
  leafView: undefined,
}

// Set up storage error callbacks
setStorageErrorCallbacks(
  () => {
    // Quota error - prompt user to export data
    setStatus(ctx.elements, 'Storage full! Please export your data to prevent data loss.', 'error')
  },
  () => {
    // General storage error
    setStatus(ctx.elements, 'Unable to save. Export your data as backup.', 'warning')
  }
)

// Initialize dialogs
const waterDialogApi = initWaterDialog(ctx, {
  onWaterMeterChange: updateWaterMeter,
  onSoilMeterChange: updateSoilMeter,
  onSetStatus: (msg, type) => setStatus(ctx.elements, msg, type),
  onWaterComplete: () => {
    navCallbacks.onUpdateStats()
    ctx.twigView?.refresh()
  },
})

const harvestDialogApi = initHarvestDialog(ctx, {
  onSoilMeterChange: updateSoilMeter,
  onSetStatus: (msg, type) => setStatus(ctx.elements, msg, type),
  onHarvestComplete: navCallbacks.onUpdateStats,
})

// Late-binding container for sun log populate function
let sunLogPopulate: (() => void) | null = null

const shineApi = initShine(ctx, {
  onSunMeterChange: () => shineApi.updateSunMeter(),
  onSoilMeterChange: updateSoilMeter,
  onSetStatus: (msg, type) => setStatus(ctx.elements, msg, type),
  onShineComplete: () => sunLogPopulate?.(),
})

// Initialize log dialogs
const sunLogApi = initSunLogDialog(domResult.elements, {
  onPopulateSunLogShine: () => shineApi.populateSunLogShine(),
})
sunLogPopulate = sunLogApi.populate

const soilBagApi = initSoilBagDialog(domResult.elements)
const waterCanApi = initWaterCanDialog(domResult.elements)

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

const { exportButton, settingsButton } = getActionButtons(domResult.elements.shell)
exportButton.addEventListener('click', () => handleExport(ctx))

// Settings dialog
function populateSettingsForm(): void {
  const settings = getNotificationSettings()
  domResult.elements.settingsNameInput.value = settings.name
  domResult.elements.settingsEmailInput.value = settings.email

  // Set frequency radio
  domResult.elements.settingsFrequencyInputs.forEach(input => {
    input.checked = input.value === settings.checkInFrequency
  })

  // Set time radio
  domResult.elements.settingsTimeInputs.forEach(input => {
    input.checked = input.value === settings.preferredTime
  })

  // Set checkboxes
  domResult.elements.settingsHarvestCheckbox.checked = settings.events.harvestReady
  domResult.elements.settingsShineCheckbox.checked = settings.events.shineAvailable

  // Update time section disabled state
  updateTimeSection(settings.checkInFrequency)
}

function updateTimeSection(frequency: string): void {
  const timeSection = domResult.elements.settingsDialog.querySelector('.settings-time-section')
  if (timeSection) {
    timeSection.classList.toggle('is-disabled', frequency === 'off')
  }
}

function getSettingsFromForm(): NotificationSettings {
  let frequency: NotificationSettings['checkInFrequency'] = 'off'
  domResult.elements.settingsFrequencyInputs.forEach(input => {
    if (input.checked) frequency = input.value as NotificationSettings['checkInFrequency']
  })

  let preferredTime: NotificationSettings['preferredTime'] = 'morning'
  domResult.elements.settingsTimeInputs.forEach(input => {
    if (input.checked) preferredTime = input.value as NotificationSettings['preferredTime']
  })

  return {
    name: domResult.elements.settingsNameInput.value.trim(),
    email: domResult.elements.settingsEmailInput.value.trim(),
    checkInFrequency: frequency,
    preferredTime,
    events: {
      harvestReady: domResult.elements.settingsHarvestCheckbox.checked,
      shineAvailable: domResult.elements.settingsShineCheckbox.checked,
    },
  }
}

function openSettingsDialog(): void {
  populateSettingsForm()
  domResult.elements.settingsDialog.classList.remove('hidden')
}

function closeSettingsDialog(): void {
  domResult.elements.settingsDialog.classList.add('hidden')
}

settingsButton.addEventListener('click', openSettingsDialog)

domResult.elements.settingsDialogClose.addEventListener('click', closeSettingsDialog)

domResult.elements.settingsDialog.addEventListener('click', (e) => {
  if (e.target === domResult.elements.settingsDialog) {
    closeSettingsDialog()
  }
})

// Update time section when frequency changes
domResult.elements.settingsFrequencyInputs.forEach(input => {
  input.addEventListener('change', () => {
    updateTimeSection(input.value)
  })
})

domResult.elements.settingsSaveBtn.addEventListener('click', () => {
  const settings = getSettingsFromForm()
  saveNotificationSettings(settings)
  // Update trunk label to reflect name change
  syncNode(domResult.elements.trunk)
  updateFocus(domResult.elements.trunk, ctx)
  closeSettingsDialog()
  setStatus(ctx.elements, 'Settings saved', 'info')
})

domResult.elements.importInput.addEventListener('change', () => handleImport(ctx, importExportCallbacks))

domResult.elements.debugCheckbox.addEventListener('change', (e) => {
  setDebugHoverZone((e.target as HTMLInputElement).checked)
})

// Debug clock - trunk-wide time manipulation
function updateDebugClockDisplay(): void {
  const date = getDebugDate()
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  domResult.elements.debugClockOffset.textContent = formatted
}
updateDebugClockDisplay() // Show initial date

domResult.elements.debugClockBtn.addEventListener('click', () => {
  advanceClockByDays(1)
  updateDebugClockDisplay()
  updateWaterMeter() // Water resets daily
  shineApi.updateSunMeter() // Sun resets weekly
  // Re-render any open twig view to update sprout states
  if (ctx.twigView?.isOpen()) {
    const activeBranchIndex = getActiveBranchIndex()
    const activeTwigId = getActiveTwigId()
    if (activeBranchIndex !== null && activeTwigId) {
      const branchGroup = ctx.branchGroups[activeBranchIndex]
      const twig = branchGroup?.twigs.find(t => t.dataset.nodeId === activeTwigId)
      if (twig) {
        ctx.twigView?.close()
        ctx.twigView?.open(twig)
      }
    }
  }
})

domResult.elements.debugSoilResetBtn.addEventListener('click', () => {
  resetResources()
  updateSoilMeter()
  updateWaterMeter()
  shineApi.updateSunMeter()
  // Reset clock display
  domResult.elements.debugClockOffset.textContent = '+0d'
  // Refresh sidebar sprouts (water state may have changed)
  updateStats(ctx)
  setStatus(ctx.elements, 'All resources and logs reset', 'info')
})

domResult.elements.debugClearSproutsBtn.addEventListener('click', () => {
  // Clear all sprouts and leaves from all twigs
  Object.keys(nodeState).forEach(nodeId => {
    if (nodeState[nodeId]) {
      nodeState[nodeId].sprouts = undefined
      nodeState[nodeId].leaves = undefined
    }
  })
  saveState()
  updateStats(ctx)
  setStatus(ctx.elements, 'Cleared all sprouts and leaves', 'info')
})

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
setStatus(ctx.elements, STATUS_DEFAULT_MESSAGE, 'info')
updateStats(ctx)
updateFocus(null, ctx)
updateStatusMeta(ctx.elements)
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

// Check for export reminder after a short delay (don't compete with initial status)
setTimeout(() => checkExportReminder(ctx), 2000)

// Global keyboard navigation
document.addEventListener('keydown', (e) => {
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
    if (!domResult.elements.settingsDialog.classList.contains('hidden')) {
      e.preventDefault()
      closeSettingsDialog()
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

  // Don't handle other keys if twig view is open
  if (ctx.twigView?.isOpen()) return

  // Arrow keys cycle through branches in branch view
  if (getViewMode() === 'branch' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
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
let lastKeyTime = 0
let lastKey = ''
document.addEventListener('keydown', (e) => {
  // Skip if in input/textarea
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

  const now = Date.now()
  if (e.key === 'd') {
    lastKey = 'd'
    lastKeyTime = now
  } else if (e.key === 'b' && lastKey === 'd' && now - lastKeyTime < 500) {
    domResult.elements.debugPanel.classList.toggle('hidden')
    lastKey = ''
  } else {
    lastKey = ''
  }
})
