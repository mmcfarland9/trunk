import './styles/index.css'
import type { AppContext } from './types'
import { getViewMode, setActiveNode } from './state'
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
domResult.elements.canvas.append(editor.container)

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
  const branchGroup = ctx.branchGroups[index]
  if (!branchGroup) return

  if (getViewMode() !== 'branch') {
    enterBranchView(index, ctx, navCallbacks)
  } else {
    setFocusedNode(branchGroup.branch, ctx, (target) => updateFocus(target, ctx))
  }
  branchGroup.branch.focus({ preventScroll: true })
}, {
  onHoverStart: (index) => previewBranchFromSidebar(ctx, index),
  onHoverEnd: () => clearSidebarPreview(ctx),
})

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
