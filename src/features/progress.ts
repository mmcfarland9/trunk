import type { AppContext } from '../types'
import { TWIG_COUNT } from '../constants'
import { nodeState, getHoveredBranchIndex, getActiveBranchIndex, getViewMode, getIsSidebarHover, getActiveSprouts } from '../state'

export type BranchHoverCallbacks = {
  onHoverStart: (index: number) => void
  onHoverEnd: () => void
}

export function updateStats(ctx: AppContext): void {
  const { backToTrunkButton } = ctx.elements

  updateScopedProgress(ctx)

  // Show "Back to trunk" only in branch view
  const isBranchView = getViewMode() === 'branch'
  backToTrunkButton.style.display = isBranchView ? '' : 'none'

  updateBranchProgress(ctx)
}

function countActiveSproutsForTwigs(twigs: HTMLButtonElement[]): number {
  return twigs.reduce((sum, twig) => {
    const data = nodeState[twig.dataset.nodeId || '']
    const sprouts = data?.sprouts || []
    return sum + getActiveSprouts(sprouts).length
  }, 0)
}

export function updateScopedProgress(ctx: AppContext): void {
  const { progressCount, progressFill } = ctx.elements
  const { branchGroups } = ctx
  const viewMode = getViewMode()
  const hoveredIndex = getHoveredBranchIndex()

  // In branch view OR when hovering a branch, show scoped progress for that branch
  const activeBranchIndex = viewMode === 'branch'
    ? getActiveBranchIndex()
    : hoveredIndex

  if (activeBranchIndex !== null) {
    const branchGroup = branchGroups[activeBranchIndex]
    if (branchGroup) {
      const filledTwigs = branchGroup.twigs.filter((twig) => twig.dataset.filled === 'true').length
      const activeSprouts = countActiveSproutsForTwigs(branchGroup.twigs)

      progressCount.innerHTML = `<br>${filledTwigs} of ${TWIG_COUNT} twigs filled<br>${activeSprouts} active sprouts`
      const progress = Math.round((filledTwigs / TWIG_COUNT) * 100)
      progressFill.style.width = `${progress}%`
      return
    }
  }

  // In overview: show all three counts
  const filledBranches = branchGroups.filter((bg) => bg.branch.dataset.filled === 'true').length
  const totalTwigs = branchGroups.reduce((sum, bg) => sum + bg.twigs.length, 0)
  const filledTwigs = branchGroups.reduce(
    (sum, bg) => sum + bg.twigs.filter((twig) => twig.dataset.filled === 'true').length,
    0
  )
  const activeSprouts = branchGroups.reduce(
    (sum, bg) => sum + countActiveSproutsForTwigs(bg.twigs),
    0
  )

  progressCount.innerHTML = `${filledBranches} of ${branchGroups.length} branches filled<br>${filledTwigs} of ${totalTwigs} twigs filled<br>${activeSprouts} active sprouts`
  const progress = totalTwigs ? Math.round((filledTwigs / totalTwigs) * 100) : 0
  progressFill.style.width = `${progress}%`
}

export function buildBranchProgress(
  ctx: AppContext,
  onBranchClick: (index: number) => void,
  hoverCallbacks?: BranchHoverCallbacks
): void {
  const { branchProgress } = ctx.elements
  const { branchGroups, branchProgressItems } = ctx

  branchProgress.replaceChildren()
  branchProgressItems.length = 0

  branchGroups.forEach((_, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'branch-item'
    button.addEventListener('click', () => onBranchClick(index))
    if (hoverCallbacks) {
      button.addEventListener('mouseenter', () => hoverCallbacks.onHoverStart(index))
      button.addEventListener('mouseleave', () => hoverCallbacks.onHoverEnd())
    }

    const label = document.createElement('span')
    label.className = 'branch-label'

    const count = document.createElement('span')
    count.className = 'branch-count'
    button.append(label, count)
    branchProgress.append(button)

    branchProgressItems.push({ button, label, count, index })
  })
}

export function updateBranchProgress(ctx: AppContext): void {
  const { branchProgress } = ctx.elements
  const { branchGroups, branchProgressItems } = ctx

  const viewMode = getViewMode()
  const hoveredIndex = getHoveredBranchIndex()
  const activeIndex = getActiveBranchIndex()

  // Show twigs when we're in branch view or hovering a branch via graphic (not sidebar)
  // Sidebar hover should NOT change the sidebar itself
  const focusedBranchIndex = viewMode === 'branch' ? activeIndex : (getIsSidebarHover() ? null : hoveredIndex)

  if (focusedBranchIndex !== null) {
    // Show twigs for this branch
    const branchGroup = branchGroups[focusedBranchIndex]
    if (branchGroup) {
      updateTwigProgress(ctx, branchGroup)
      return
    }
  }

  // Default: show all branches (always visible for visual conformity)
  branchProgressItems.forEach((item) => {
    const branchGroup = branchGroups[item.index]
    const filledTwigs = branchGroup.twigs.filter((twig) => twig.dataset.filled === 'true').length
    const totalTwigs = branchGroup.twigs.length

    item.label.textContent = getBranchLabel(branchGroup.branch, item.index)
    item.count.textContent = `${filledTwigs}/${totalTwigs}`

    const hasLabel = branchGroup.branch.dataset.filled === 'true'
    item.button.classList.toggle('is-labeled', hasLabel)
    item.button.classList.remove('is-twig')
  })

  branchProgress.classList.add('has-content')
}

function updateTwigProgress(ctx: AppContext, branchGroup: { branch: HTMLButtonElement, twigs: HTMLButtonElement[] }): void {
  const { branchProgress } = ctx.elements
  const { branchProgressItems } = ctx

  branchProgressItems.forEach((item, i) => {
    const twig = branchGroup.twigs[i]
    if (twig) {
      const isFilled = twig.dataset.filled === 'true'
      const data = nodeState[twig.dataset.nodeId || '']
      const sprouts = data?.sprouts || []
      const activeSproutCount = getActiveSprouts(sprouts).length

      item.label.textContent = getTwigLabel(twig, i)
      // Show sprout count or filled indicator
      item.count.textContent = activeSproutCount > 0 ? `${activeSproutCount}` : (isFilled ? '●' : '○')
      item.button.classList.toggle('is-labeled', isFilled || activeSproutCount > 0)
      item.button.classList.add('is-twig')
      item.button.style.display = ''
    }
  })

  // Always show twigs when in twig view
  branchProgress.classList.add('has-content')
}

export function updateSproutProgress(ctx: AppContext, twig: HTMLButtonElement): void {
  const { branchProgress } = ctx.elements
  const { branchProgressItems } = ctx

  const data = nodeState[twig.dataset.nodeId || '']
  const sprouts = data?.sprouts || []
  const activeSprouts = getActiveSprouts(sprouts)

  branchProgressItems.forEach((item, i) => {
    const sprout = activeSprouts[i]
    if (sprout) {
      item.label.textContent = sprout.title || 'Untitled'
      item.count.textContent = `(${sprout.type})`
      item.button.classList.add('is-labeled', 'is-sprout')
      item.button.classList.remove('is-twig')
      item.button.style.display = ''
    } else {
      // Hide unused slots
      item.button.style.display = 'none'
    }
  })

  branchProgress.classList.toggle('has-content', activeSprouts.length > 0)
}

function getTwigLabel(twigNode: HTMLButtonElement, index: number): string {
  const stored = nodeState[twigNode.dataset.nodeId || '']
  const storedLabel = stored?.label?.trim() || ''
  if (storedLabel) {
    return storedLabel
  }
  return `Twig ${index + 1}`
}

export function getBranchLabel(branchNode: HTMLButtonElement, index: number): string {
  const defaultLabel = branchNode.dataset.defaultLabel || ''
  const stored = nodeState[branchNode.dataset.nodeId || '']
  const storedLabel = stored?.label?.trim() || ''
  if (storedLabel && storedLabel !== defaultLabel) {
    return storedLabel
  }
  return `Branch ${index + 1}`
}
