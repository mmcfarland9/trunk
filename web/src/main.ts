import './styles/index.css'
import { initEventStore } from './events/store'
import type { AppContext } from './types'
import { getViewMode } from './state'
import { buildApp } from './ui/dom-builder'
import { positionNodes } from './ui/layout'
import { updateStats } from './features/progress'
import {
  setViewMode,
  returnToOverview,
  enterBranchView,
  enterTwigView,
} from './features/navigation'
import { initializeAuth } from './bootstrap/auth'
import { initializeSync } from './bootstrap/sync'
import { initializeUI, updateSoilMeter, updateWaterMeter } from './bootstrap/ui'
import { initializeEvents } from './bootstrap/events'
import { updateFocus, syncNode } from './ui/node-ui'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('Root container "#app" not found.')

initEventStore()

const navCallbacks = {
  onPositionNodes: () => positionNodes(ctx),
  onUpdateStats: () => {
    updateStats(ctx)
    positionNodes(ctx)
  },
}

function handleNodeClick(element: HTMLButtonElement, nodeId: string): void {
  if (nodeId === 'trunk' && (getViewMode() === 'branch' || getViewMode() === 'twig')) {
    returnToOverview(ctx, navCallbacks)
    return
  }
  const branchIndex = element.dataset.branchIndex
  if (branchIndex !== undefined && getViewMode() === 'overview') {
    enterBranchView(Number(branchIndex), ctx, navCallbacks)
    return
  }
  const isTwig = element.classList.contains('twig')
  if (isTwig && getViewMode() === 'branch') {
    const twigBranchIndex = element.dataset.branchIndex
    if (twigBranchIndex !== undefined) {
      enterTwigView(element, Number(twigBranchIndex), ctx, navCallbacks)
    }
  }
}

const domResult = buildApp(app, handleNodeClick)

const ctx: AppContext = {
  elements: domResult.elements,
  branchGroups: domResult.branchGroups,
  allNodes: domResult.allNodes,
  nodeLookup: domResult.nodeLookup,
  twigView: undefined,
  leafView: undefined,
}

initializeSync(domResult.elements)
const dialogAPIs = initializeUI(ctx, navCallbacks)

function refreshUI(): void {
  domResult.allNodes.forEach((node) => syncNode(node))
  updateStats(ctx)
  positionNodes(ctx)
  updateFocus(null, ctx)
  updateSoilMeter(ctx.elements)
  updateWaterMeter(ctx.elements)
  dialogAPIs.shine.updateSunMeter()
  ctx.twigView?.refresh()
}

initializeAuth(app, ctx, {
  onSyncComplete: refreshUI,
  onAuthStateChange: (hasUser) => {
    if (hasUser) updateFocus(null, ctx)
  },
})

initializeEvents(ctx, navCallbacks, dialogAPIs)
setViewMode('overview', ctx, navCallbacks)
