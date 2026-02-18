import type { AppContext } from '../types'
import type { NavCallbacks, DialogAPIs } from './ui'
import { positionNodes, startWind } from '../ui/layout'
import { setupHoverBranch, setupHoverTwig } from '../features/hover-branch'
import { getViewMode, getActiveBranchIndex } from '../state'
import { returnToOverview, enterBranchView, enterTwigView, returnToBranchView, updateVisibility } from '../features/navigation'
import { updateScopedProgress, updateSidebarSprouts } from '../features/progress'
import { updateFocus } from '../ui/node-ui'

export function initializeEvents(
  ctx: AppContext,
  navCallbacks: NavCallbacks,
  dialogAPIs: DialogAPIs
): void {
  // Resize handling
  let resizeId = 0
  const handleResize = () => {
    if (resizeId) {
      window.cancelAnimationFrame(resizeId)
    }
    resizeId = window.requestAnimationFrame(() => positionNodes(ctx))
  }
  const resizeObserver = new ResizeObserver(handleResize)
  resizeObserver.observe(ctx.elements.canvas)
  window.addEventListener('resize', handleResize)

  // Start animations and hover
  startWind(ctx)
  setupHoverBranch(ctx, navCallbacks, {
    enterBranchView,
    enterTwigView,
    returnToOverview,
    returnToBranchView,
    updateVisibility,
    updateScopedProgress,
    updateSidebarSprouts,
    updateFocus,
  })
  setupHoverTwig(ctx, {
    updateFocus,
    updateSidebarSprouts,
  })

  // Global keyboard navigation
  document.addEventListener('keydown', (e) => {
    // Skip if user is typing in an input field (except for Escape)
    const isTyping = e.target instanceof HTMLInputElement ||
                     e.target instanceof HTMLTextAreaElement ||
                     e.target instanceof HTMLSelectElement

    // Handle Escape: close dialogs first, then zoom back
    if (e.key === 'Escape') {
      // Priority 1: Close any open dialog
      if (dialogAPIs.waterDialog.isOpen()) {
        e.preventDefault()
        dialogAPIs.waterDialog.close()
        return
      }
      if (dialogAPIs.harvestDialog.isOpen()) {
        e.preventDefault()
        dialogAPIs.harvestDialog.close()
        return
      }
      if (dialogAPIs.sunLog.isOpen()) {
        e.preventDefault()
        dialogAPIs.sunLog.close()
        return
      }
      if (dialogAPIs.soilBag.isOpen()) {
        e.preventDefault()
        dialogAPIs.soilBag.close()
        return
      }
      if (dialogAPIs.waterCan.isOpen()) {
        e.preventDefault()
        dialogAPIs.waterCan.close()
        return
      }
      if (dialogAPIs.account.isOpen()) {
        e.preventDefault()
        dialogAPIs.account.close()
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
}
