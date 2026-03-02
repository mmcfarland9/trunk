import type { AppContext, ViewMode } from '../types'
import type { NavigationCallbacks } from './navigation'
import { returnToOverview, enterBranchView, enterTwigView } from './navigation'

let navigatingFromPopstate = false

function buildHash(mode: ViewMode, branchIndex?: number, twigId?: string, leafId?: string): string {
  if (mode === 'leaf' && branchIndex != null && twigId && leafId) {
    return `#/branch/${branchIndex}/twig/${twigId}/leaf/${leafId}`
  }
  if (mode === 'twig' && branchIndex != null && twigId) {
    return `#/branch/${branchIndex}/twig/${twigId}`
  }
  if (mode === 'branch' && branchIndex != null) {
    return `#/branch/${branchIndex}`
  }
  return '#/'
}

export function pushView(
  mode: ViewMode,
  branchIndex?: number,
  twigId?: string,
  leafId?: string,
): void {
  if (navigatingFromPopstate) return
  const hash = buildHash(mode, branchIndex, twigId, leafId)
  history.pushState({ mode, branchIndex, twigId, leafId }, '', hash)
}

export function replaceView(
  mode: ViewMode,
  branchIndex?: number,
  twigId?: string,
  leafId?: string,
): void {
  const hash = buildHash(mode, branchIndex, twigId, leafId)
  history.replaceState({ mode, branchIndex, twigId, leafId }, '', hash)
}

type HistoryDeps = {
  onOpenLeaf: (leafId: string, twigId: string, branchIndex: number) => void
}

function parseHash(hash: string): {
  mode: ViewMode
  branchIndex?: number
  twigId?: string
  leafId?: string
} {
  const path = hash.replace(/^#\/?/, '')
  if (!path) return { mode: 'overview' }

  const segments = path.split('/')

  // branch/:idx/twig/:twigId/leaf/:leafId
  if (segments[0] === 'branch' && segments[2] === 'twig' && segments[4] === 'leaf') {
    return {
      mode: 'leaf',
      branchIndex: parseInt(segments[1], 10),
      twigId: segments[3],
      leafId: segments[5],
    }
  }

  // branch/:idx/twig/:twigId
  if (segments[0] === 'branch' && segments[2] === 'twig') {
    return {
      mode: 'twig',
      branchIndex: parseInt(segments[1], 10),
      twigId: segments[3],
    }
  }

  // branch/:idx
  if (segments[0] === 'branch') {
    return {
      mode: 'branch',
      branchIndex: parseInt(segments[1], 10),
    }
  }

  return { mode: 'overview' }
}

export function initHistory(
  ctx: AppContext,
  navCallbacks: NavigationCallbacks,
  deps: HistoryDeps,
): void {
  window.addEventListener('popstate', () => {
    navigatingFromPopstate = true
    try {
      const parsed = parseHash(window.location.hash)
      navigateToState(parsed, ctx, navCallbacks, deps)
    } finally {
      navigatingFromPopstate = false
    }
  })

  // Set initial history entry from current hash (or default to overview)
  const initial = parseHash(window.location.hash)
  if (initial.mode === 'overview') {
    replaceView('overview')
  } else {
    // Deep link: navigate to the requested view
    navigateToState(initial, ctx, navCallbacks, deps)
    replaceView(initial.mode, initial.branchIndex, initial.twigId, initial.leafId)
  }
}

function navigateToState(
  state: { mode: ViewMode; branchIndex?: number; twigId?: string; leafId?: string },
  ctx: AppContext,
  navCallbacks: NavigationCallbacks,
  deps: HistoryDeps,
): void {
  const { mode, branchIndex, twigId, leafId } = state

  if (mode === 'overview') {
    returnToOverview(ctx, navCallbacks)
    return
  }

  if (mode === 'branch' && branchIndex != null) {
    enterBranchView(branchIndex, ctx, navCallbacks)
    return
  }

  if (mode === 'twig' && branchIndex != null && twigId) {
    const twigNode = ctx.nodeLookup.get(twigId) ?? null
    if (twigNode) {
      enterTwigView(twigNode, branchIndex, ctx, navCallbacks)
    } else {
      // Twig not found — fall back to branch
      enterBranchView(branchIndex, ctx, navCallbacks)
    }
    return
  }

  if (mode === 'leaf' && branchIndex != null && twigId && leafId) {
    const twigNode = ctx.nodeLookup.get(twigId) ?? null
    if (twigNode) {
      enterTwigView(twigNode, branchIndex, ctx, navCallbacks)
      deps.onOpenLeaf(leafId, twigId, branchIndex)
    } else {
      enterBranchView(branchIndex, ctx, navCallbacks)
    }
    return
  }

  // Fallback
  returnToOverview(ctx, navCallbacks)
}
