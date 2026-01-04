import './styles/index.css'
import type { AppContext } from './types'
import { getViewMode, setActiveNode, getActiveBranchIndex } from './state'
import { setFocusedNode, updateFocus } from './ui/node-ui'
import { buildApp, getActionButtons } from './ui/dom-builder'
import { buildEditor } from './ui/editor'
import { positionNodes, startWind, setDebugHoverZone } from './ui/layout'
import { setupHoverBranch, previewBranchFromSidebar, clearSidebarPreview } from './features/hover-branch'
import { handleExport, handleReset, handleImport } from './features/import-export'
import {
  setViewMode,
  returnToOverview,
  enterBranchView,
} from './features/navigation'
import { updateStats, buildBranchProgress } from './features/progress'
import { setStatus, updateStatusMeta } from './features/status'
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
  },
}

const importExportCallbacks = {
  onUpdateStats: navCallbacks.onUpdateStats,
  onSetViewMode: (mode: 'overview') => setViewMode(mode, ctx, navCallbacks),
}

function handleNodeClick(
  element: HTMLButtonElement,
  nodeId: string,
  placeholder: string
): void {
  if (nodeId === 'trunk' && getViewMode() === 'branch') {
    returnToOverview(ctx, navCallbacks)
    return
  }

  const branchIndex = element.dataset.branchIndex
  if (branchIndex !== undefined && getViewMode() === 'overview') {
    enterBranchView(Number(branchIndex), ctx, navCallbacks)
    return
  }

  setFocusedNode(element, ctx, (target) => updateFocus(target, ctx))
  setActiveNode(element)
  ctx.editor.open(element, placeholder)
}

const domResult = buildApp(app, handleNodeClick)

const editor = buildEditor(domResult.elements.canvas, {
  onSave: navCallbacks.onUpdateStats,
  onUpdateFocus: (target) => updateFocus(target, ctx),
})
domResult.elements.shell.append(editor.container)

const ctx: AppContext = {
  elements: domResult.elements,
  branchGroups: domResult.branchGroups,
  allNodes: domResult.allNodes,
  nodeLookup: domResult.nodeLookup,
  branchProgressItems: [],
  editor,
}

const { exportButton, resetButton } = getActionButtons(domResult.elements.shell)
exportButton.addEventListener('click', () => handleExport(ctx))
resetButton.addEventListener('click', () => handleReset(ctx, importExportCallbacks))

domResult.elements.importInput.addEventListener('change', () => handleImport(ctx, importExportCallbacks))

domResult.elements.debugCheckbox.addEventListener('change', (e) => {
  setDebugHoverZone((e.target as HTMLInputElement).checked)
})

domResult.elements.backToTrunkButton.addEventListener('click', () => {
  returnToOverview(ctx, navCallbacks)
})

buildBranchProgress(ctx, (index) => {
  if (getViewMode() !== 'branch') {
    // Overview mode: navigate to branch
    const branchGroup = ctx.branchGroups[index]
    if (!branchGroup) return
    enterBranchView(index, ctx, navCallbacks)
    branchGroup.branch.focus({ preventScroll: true })
  } else {
    // Branch view: click on leaf opens its editor
    const activeBranchIndex = getActiveBranchIndex()
    if (activeBranchIndex === null) return
    const branchGroup = ctx.branchGroups[activeBranchIndex]
    const leaf = branchGroup?.leaves[index]
    if (leaf) {
      handleNodeClick(leaf, leaf.dataset.nodeId || '', leaf.dataset.placeholder || '')
    }
  }
}, {
  onHoverStart: (index) => previewBranchFromSidebar(ctx, index),
  onHoverEnd: () => clearSidebarPreview(ctx),
})

// Period date calculation
function getTargetDate(period: string): Date {
  const now = new Date()
  const target = new Date(now)

  switch (period) {
    case '1w': target.setDate(now.getDate() + 7); break
    case '2w': target.setDate(now.getDate() + 14); break
    case '1m': target.setMonth(now.getMonth() + 1); break
    case '2m': target.setMonth(now.getMonth() + 2); break
  }

  // Round down to 9am CST (UTC-6)
  target.setUTCHours(15, 0, 0, 0) // 9am CST = 15:00 UTC
  return target
}

function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago'
  }
  return date.toLocaleString('en-US', options)
}

function updatePeriodDate(period: string): void {
  const target = getTargetDate(period)
  domResult.elements.periodDate.textContent = formatDate(target)
}

// Period selector click handling
domResult.elements.periodSelector.querySelectorAll('.period-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    domResult.elements.periodSelector.querySelectorAll('.period-btn').forEach(b => {
      b.classList.toggle('is-active', b === btn)
    })
    updatePeriodDate((btn as HTMLButtonElement).dataset.period || '1d')
  })
})

// Initialize with default period
updatePeriodDate('1w')

// Period state management
const PERIOD_STARTED_KEY = 'harada-period-started'
let periodStarted = localStorage.getItem(PERIOD_STARTED_KEY) === 'true'

function updatePeriodLockState(): void {
  ctx.editor.setProgressLocked(!periodStarted)
  domResult.elements.periodStartBtn.textContent = periodStarted ? 'End period' : 'Start next period'
}

domResult.elements.periodStartBtn.addEventListener('click', () => {
  periodStarted = !periodStarted
  localStorage.setItem(PERIOD_STARTED_KEY, String(periodStarted))
  updatePeriodLockState()
})

// Simulate period ending (debug button)
domResult.elements.simulatePeriodEndBtn.addEventListener('click', () => {
  ctx.editor.setProgressLocked(false)
})

// Lock button (lock panel editing)
domResult.elements.lockBtn.addEventListener('click', () => {
  const isLocked = domResult.elements.lockBtn.dataset.locked === 'true'
  const newLocked = !isLocked
  domResult.elements.lockBtn.dataset.locked = String(newLocked)
  domResult.elements.lockBtn.textContent = newLocked ? 'UNLOCK' : 'LOCK'
  ctx.editor.setPanelLocked(newLocked)
  domResult.elements.canvas.classList.toggle('is-panel-locked', newLocked)
  // Set tooltip on trunk/branch when locked
  const tooltip = newLocked ? 'Panel is locked' : ''
  domResult.elements.trunk.title = tooltip
  ctx.branchGroups.forEach(g => g.branch.title = tooltip)
})

updatePeriodLockState()

setViewMode('overview', ctx, navCallbacks)
setStatus(ctx.elements, STATUS_DEFAULT_MESSAGE, 'info')
updateStats(ctx)
updateFocus(null, ctx)
updateStatusMeta(ctx.elements)

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
