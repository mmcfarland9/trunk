import './styles/index.css'
import type { AppContext } from './types'
import { getViewMode, getActiveBranchIndex, getActiveTwigId, setViewModeState, advanceClockByDays, getDebugDate, nodeState, saveState, getSoilAvailable, getSoilCapacity, getWaterAvailable, getWaterCapacity, resetResources, wasShoneThisWeek, canAffordSun, sunLog, getNotificationSettings, saveNotificationSettings, getSunRecoveryRate } from './state'
import type { NotificationSettings } from './types'
import { updateFocus, setFocusedNode } from './ui/node-ui'
import { buildApp, getActionButtons } from './ui/dom-builder'
import { buildEditor } from './ui/editor'
import { buildTwigView } from './ui/twig-view'
import { buildLeafView } from './ui/leaf-view'
import { positionNodes, startWind, setDebugHoverZone } from './ui/layout'
import { setupHoverBranch } from './features/hover-branch'
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
import { initShineDialog } from './features/shine-dialog'
import { initSproutsDialog } from './features/sprouts-dialog'
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

// Water meter update function
function updateWaterMeter(): void {
  const available = getWaterAvailable()
  const capacity = getWaterCapacity()
  domResult.elements.waterMeterFill.style.width = `${(available / capacity) * 100}%`
  domResult.elements.waterMeterValue.textContent = `${available}/${capacity}`
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

// Initialize dialogs
const waterDialogApi = initWaterDialog(ctx, {
  onWaterMeterChange: updateWaterMeter,
  onSoilMeterChange: updateSoilMeter,
  onSetStatus: (msg, type) => setStatus(ctx.elements, msg, type),
})

const shineDialogApi = initShineDialog(ctx, {
  onSunMeterChange: () => {
    shineDialogApi.updateSunMeter()
    updateShineButton()
  },
  onSoilMeterChange: updateSoilMeter,
  onSetStatus: (msg, type) => setStatus(ctx.elements, msg, type),
})

function updateShineButton() {
  const shone = wasShoneThisWeek()
  domResult.elements.shineBtn.disabled = shone || !canAffordSun()
  if (shone) {
    domResult.elements.shineBtn.textContent = 'Shone'
  } else {
    domResult.elements.shineBtn.innerHTML = `Shine <span class="btn-soil-gain">(+${getSunRecoveryRate().toFixed(2)})</span>`
  }
}

initSproutsDialog(ctx, {
  onUpdateStats: navCallbacks.onUpdateStats,
})

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
  onGraftClick: (leafId, twigId, branchIndex) => {
    setViewModeState('leaf', branchIndex, twigId)
    ctx.leafView?.open(leafId, twigId, branchIndex, true)
  },
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
  closeSettingsDialog()
  setStatus(ctx.elements, 'Settings saved', 'info')
})

// Sun Log dialog - view all shine journal entries
function formatSunLogTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${month}/${day}/${year} ${time}`
}

function populateSunLog(): void {
  const entries = [...sunLog].reverse() // Reverse chronological (newest first)
  const isEmpty = entries.length === 0

  domResult.elements.sunLogDialogEmpty.style.display = isEmpty ? 'block' : 'none'
  domResult.elements.sunLogDialogEntries.style.display = isEmpty ? 'none' : 'flex'

  if (isEmpty) return

  domResult.elements.sunLogDialogEntries.innerHTML = entries.map(entry => {
    const context = entry.context.type === 'leaf'
      ? `${entry.context.leafTitle} · ${entry.context.twigLabel}`
      : entry.context.twigLabel
    const timestamp = formatSunLogTimestamp(entry.timestamp)
    const promptHtml = entry.prompt
      ? `<p class="sun-log-entry-prompt">"${entry.prompt}"</p>`
      : ''

    return `
      <div class="sun-log-entry">
        <div class="sun-log-entry-header">
          <span class="sun-log-entry-context">${context}</span>
          <span class="sun-log-entry-timestamp">${timestamp}</span>
        </div>
        ${promptHtml}
        <p class="sun-log-entry-content">${entry.content}</p>
      </div>
    `
  }).join('')
}

function openSunLogDialog(): void {
  populateSunLog()
  domResult.elements.sunLogDialog.classList.remove('hidden')
}

function closeSunLogDialog(): void {
  domResult.elements.sunLogDialog.classList.add('hidden')
}

// Click sun meter to open sun log
domResult.elements.sunMeter.addEventListener('click', openSunLogDialog)

domResult.elements.sunLogDialogClose.addEventListener('click', closeSunLogDialog)

domResult.elements.sunLogDialog.addEventListener('click', (e) => {
  if (e.target === domResult.elements.sunLogDialog) {
    closeSunLogDialog()
  }
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !domResult.elements.sunLogDialog.classList.contains('hidden')) {
    e.preventDefault()
    closeSunLogDialog()
  }
})

// Water Can dialog - waterable sprouts + water log
function formatWaterLogTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${month}/${day}/${year} ${time}`
}

type WaterableSprout = {
  sproutId: string
  twigId: string
  title: string
  twigLabel: string
}

type WaterLogEntry = {
  timestamp: string
  content: string
  prompt?: string
  sproutTitle: string
  twigLabel: string
}

function getWaterableSprouts(): WaterableSprout[] {
  const today = getDebugDate().toISOString().split('T')[0]
  const waterable: WaterableSprout[] = []

  for (const [nodeId, data] of Object.entries(nodeState)) {
    if (!nodeId.includes('twig') || !data.sprouts) continue
    const twigLabel = data.label || nodeId

    for (const sprout of data.sprouts) {
      if (sprout.state !== 'active') continue
      const wateredToday = sprout.waterEntries?.some(e => e.timestamp.split('T')[0] === today) ?? false
      if (!wateredToday) {
        waterable.push({
          sproutId: sprout.id,
          twigId: nodeId,
          title: sprout.title,
          twigLabel,
        })
      }
    }
  }
  return waterable
}

function getAllWaterEntries(): WaterLogEntry[] {
  const entries: WaterLogEntry[] = []

  for (const [nodeId, data] of Object.entries(nodeState)) {
    if (!nodeId.includes('twig') || !data.sprouts) continue
    const twigLabel = data.label || nodeId

    for (const sprout of data.sprouts) {
      if (!sprout.waterEntries) continue
      for (const entry of sprout.waterEntries) {
        entries.push({
          timestamp: entry.timestamp,
          content: entry.content,
          prompt: entry.prompt,
          sproutTitle: sprout.title,
          twigLabel,
        })
      }
    }
  }

  // Sort reverse chronological
  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

function populateWaterCan(): void {
  const waterable = getWaterableSprouts()
  const logEntries = getAllWaterEntries()

  // Waterable sprouts section
  const hasWaterable = waterable.length > 0
  domResult.elements.waterCanEmptySprouts.style.display = hasWaterable ? 'none' : 'block'
  domResult.elements.waterCanSproutsList.style.display = hasWaterable ? 'flex' : 'none'

  if (hasWaterable) {
    domResult.elements.waterCanSproutsList.innerHTML = waterable.map(s => `
      <div class="water-can-sprout-item" data-twig-id="${s.twigId}" data-sprout-id="${s.sproutId}">
        <div class="water-can-sprout-info">
          <span class="water-can-sprout-title">${s.title}</span>
          <span class="water-can-sprout-meta">${s.twigLabel}</span>
        </div>
        <button type="button" class="action-btn action-btn-progress action-btn-water water-can-water-btn">Water</button>
      </div>
    `).join('')

    // Wire up water buttons
    domResult.elements.waterCanSproutsList.querySelectorAll('.water-can-water-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = (e.target as HTMLElement).closest('.water-can-sprout-item') as HTMLElement
        const twigId = item.dataset.twigId!
        const sproutId = item.dataset.sproutId!
        closeWaterCanDialog()
        // Open the individual water dialog via the water-dialog feature
        const data = nodeState[twigId]
        const sprout = data?.sprouts?.find(s => s.id === sproutId)
        if (sprout) {
          const twigLabel = data?.label || twigId
          waterDialogApi.openWaterDialog({
            id: sprout.id,
            title: sprout.title,
            twigId,
            twigLabel,
            season: sprout.season,
          })
        }
      })
    })
  }

  // Water log section
  const hasLog = logEntries.length > 0
  domResult.elements.waterCanEmptyLog.style.display = hasLog ? 'none' : 'block'
  domResult.elements.waterCanLogEntries.style.display = hasLog ? 'flex' : 'none'

  if (hasLog) {
    domResult.elements.waterCanLogEntries.innerHTML = logEntries.map(entry => {
      const timestamp = formatWaterLogTimestamp(entry.timestamp)
      const promptHtml = entry.prompt
        ? `<p class="water-can-log-entry-prompt">"${entry.prompt}"</p>`
        : ''

      return `
        <div class="water-can-log-entry">
          <div class="water-can-log-entry-header">
            <span class="water-can-log-entry-context">${entry.sproutTitle} · ${entry.twigLabel}</span>
            <span class="water-can-log-entry-timestamp">${timestamp}</span>
          </div>
          ${promptHtml}
          <p class="water-can-log-entry-content">${entry.content}</p>
        </div>
      `
    }).join('')
  }
}

function openWaterCanDialog(): void {
  populateWaterCan()
  domResult.elements.waterCanDialog.classList.remove('hidden')
}

function closeWaterCanDialog(): void {
  domResult.elements.waterCanDialog.classList.add('hidden')
}

// Click water meter to open water can
domResult.elements.waterMeter.addEventListener('click', openWaterCanDialog)

domResult.elements.waterCanDialogClose.addEventListener('click', closeWaterCanDialog)

domResult.elements.waterCanDialog.addEventListener('click', (e) => {
  if (e.target === domResult.elements.waterCanDialog) {
    closeWaterCanDialog()
  }
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !domResult.elements.waterCanDialog.classList.contains('hidden')) {
    e.preventDefault()
    closeWaterCanDialog()
  }
})

domResult.elements.importInput.addEventListener('change', () => handleImport(ctx, importExportCallbacks))

// Encyclopedia dialog
const guideTabs = domResult.elements.gardenGuideDialog.querySelectorAll<HTMLButtonElement>('.guide-tab')
const guidePanels = domResult.elements.gardenGuideDialog.querySelectorAll<HTMLDivElement>('.guide-panel')
const { encyclopediaButtons } = getActionButtons(domResult.elements.shell)

function openEncyclopediaTab(tabName: string): void {
  // Update tabs
  guideTabs.forEach(t => {
    if (t.dataset.tab === tabName) {
      t.classList.add('is-active')
    } else {
      t.classList.remove('is-active')
    }
  })

  // Update panels
  guidePanels.forEach(panel => {
    if (panel.dataset.panel === tabName) {
      panel.classList.add('is-active')
    } else {
      panel.classList.remove('is-active')
    }
  })

  // Show dialog
  domResult.elements.gardenGuideDialog.classList.remove('hidden')
}

encyclopediaButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.encyclopediaTab
    if (tab) openEncyclopediaTab(tab)
  })
})

domResult.elements.gardenGuideClose.addEventListener('click', () => {
  domResult.elements.gardenGuideDialog.classList.add('hidden')
})

domResult.elements.gardenGuideDialog.addEventListener('click', (e) => {
  if (e.target === domResult.elements.gardenGuideDialog) {
    domResult.elements.gardenGuideDialog.classList.add('hidden')
  }
})

// Tab switching within the encyclopedia dialog
guideTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetPanel = tab.dataset.tab
    if (targetPanel) openEncyclopediaTab(targetPanel)
  })
})

// Close garden guide on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !domResult.elements.gardenGuideDialog.classList.contains('hidden')) {
    e.preventDefault()
    e.stopImmediatePropagation()
    domResult.elements.gardenGuideDialog.classList.add('hidden')
  }
}, true)

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
  shineDialogApi.updateSunMeter() // Sun resets weekly
  updateShineButton()
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
  shineDialogApi.updateSunMeter()
  setStatus(ctx.elements, 'Resources reset to default', 'info')
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
  (leafId, twigId, branchIndex) => {
    // Navigate to leaf view with graft form open
    const twig = ctx.nodeLookup.get(twigId)
    if (twig) {
      enterTwigView(twig, branchIndex, ctx, navCallbacks)
      setViewModeState('leaf', branchIndex, twigId)
      ctx.leafView?.open(leafId, twigId, branchIndex, true) // startWithGraftForm = true
    }
  }
)

setViewMode('overview', ctx, navCallbacks)
setStatus(ctx.elements, STATUS_DEFAULT_MESSAGE, 'info')
updateStats(ctx)
updateFocus(null, ctx)
updateStatusMeta(ctx.elements)
updateSoilMeter()
updateWaterMeter()
shineDialogApi.updateSunMeter()

// Shine button - opens shine dialog for global reflection
domResult.elements.shineBtn.addEventListener('click', () => {
  shineDialogApi.openShineDialog()
})

let resizeId = 0
const resizeObserver = new ResizeObserver(() => {
  if (resizeId) {
    window.cancelAnimationFrame(resizeId)
  }
  resizeId = window.requestAnimationFrame(() => positionNodes(ctx))
})
resizeObserver.observe(domResult.elements.canvas)
window.addEventListener('resize', () => positionNodes(ctx))

startWind(ctx)
setupHoverBranch(ctx, navCallbacks)

// Check for export reminder after a short delay (don't compete with initial status)
setTimeout(() => checkExportReminder(ctx), 2000)

// Global keyboard navigation
document.addEventListener('keydown', (e) => {
  // Don't handle if twig view is open (it has its own handler)
  if (ctx.twigView?.isOpen()) return

  if (e.key === 'Escape' && getViewMode() === 'branch') {
    returnToOverview(ctx, navCallbacks)
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
