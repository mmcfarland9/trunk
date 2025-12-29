import './styles/index.css'
import type { AppContext } from './types'
import { getViewMode, setActiveCircle, getFocusedCircle } from './state'
import {
  buildApp,
  getActionButtons,
  buildEditor,
  positionNodes,
  startWind,
  setFocusedCircle,
  updateFocus,
} from './ui'
import {
  setStatus,
  updateStatusMeta,
  flashStatus,
  updateStats,
  buildBranchProgress,
  setViewMode,
  returnToOverview,
  enterBranchView,
  findNextOpenCircle,
  openCircleForEditing,
  handleExport,
  handleReset,
  handleImport,
} from './features'
import { STATUS_DEFAULT_MESSAGE } from './constants'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) {
  throw new Error('Root container "#app" not found.')
}

// Navigation callbacks (will be wired after context is created)
const navCallbacks = {
  onPositionNodes: () => positionNodes(ctx),
  onUpdateStats: () => updateStats(ctx, (from) => findNextOpenCircle(ctx.allCircles, from)),
}

const importExportCallbacks = {
  onUpdateStats: navCallbacks.onUpdateStats,
  onSetViewMode: (mode: 'overview') => setViewMode(mode, ctx, navCallbacks),
}

// Handle circle clicks
function handleCircleClick(
  element: HTMLButtonElement,
  circleId: string,
  placeholder: string
): void {
  // If clicking the trunk while zoomed, return to overview
  if (circleId === 'center' && getViewMode() === 'branch') {
    returnToOverview(ctx, navCallbacks)
    return
  }

  const branchIndex = element.dataset.branchIndex
  if (branchIndex !== undefined && getViewMode() === 'overview') {
    enterBranchView(Number(branchIndex), ctx, navCallbacks)
    return
  }

  setFocusedCircle(element, ctx, (target) => updateFocus(target, ctx))
  setActiveCircle(element)
  ctx.editor.open(element, placeholder)
}

// Build DOM
const domResult = buildApp(app, handleCircleClick)

// Build editor
const editor = buildEditor(domResult.elements.canvas, {
  onSave: navCallbacks.onUpdateStats,
  onUpdateFocus: (target) => updateFocus(target, ctx),
})
domResult.elements.canvas.append(editor.container)

// Create app context
const ctx: AppContext = {
  elements: domResult.elements,
  branches: domResult.branches,
  allCircles: domResult.allCircles,
  circleLookup: domResult.circleLookup,
  branchProgressItems: [],
  editor,
}

// Wire up action buttons
const { exportButton, resetButton } = getActionButtons(domResult.elements.shell)
exportButton.addEventListener('click', () => handleExport(ctx))
resetButton.addEventListener('click', () => handleReset(ctx, importExportCallbacks))

// Wire up import
domResult.elements.importInput.addEventListener('change', () => handleImport(ctx, importExportCallbacks))

// Wire up next button
domResult.elements.nextButton.addEventListener('click', () => {
  const next = findNextOpenCircle(ctx.allCircles, getFocusedCircle())
  if (!next) {
    flashStatus(ctx.elements, 'All nodes are filled. Nice work.', 'success')
    return
  }
  openCircleForEditing(next, ctx, navCallbacks)
})

// Build branch progress with click handler
buildBranchProgress(ctx, (index) => {
  const viewMode = getViewMode()
  const branch = ctx.branches[index]
  if (!branch) return

  if (viewMode !== 'branch') {
    enterBranchView(index, ctx, navCallbacks)
  } else {
    setFocusedCircle(branch.main, ctx, (target) => updateFocus(target, ctx))
  }
  branch.main.focus({ preventScroll: true })
})

// Initialize
setViewMode('overview', ctx, navCallbacks)
setStatus(ctx.elements, STATUS_DEFAULT_MESSAGE, 'info')
updateStats(ctx, (from) => findNextOpenCircle(ctx.allCircles, from))
updateFocus(null, ctx)
updateStatusMeta(ctx.elements)

// Resize handling
let resizeId = 0
const resizeObserver = new ResizeObserver(() => {
  if (resizeId) {
    window.cancelAnimationFrame(resizeId)
  }
  resizeId = window.requestAnimationFrame(() => positionNodes(ctx))
})
resizeObserver.observe(domResult.elements.canvas)
window.addEventListener('resize', () => positionNodes(ctx))

// Initial positioning
positionNodes(ctx)
startWind(ctx)
