import type { AppContext } from '../types'
import { LEAF_COUNT } from '../constants'
import { nodeState, getFocusedNode, getHoveredBranchIndex, getActiveBranchIndex, getViewMode, getIsSidebarHover } from '../state'

export type BranchHoverCallbacks = {
  onHoverStart: (index: number) => void
  onHoverEnd: () => void
}

export function updateStats(ctx: AppContext): void {
  const { backToTrunkButton } = ctx.elements

  updateScopedProgress(ctx, getFocusedNode())

  // Show "Back to trunk" only in branch view
  const isBranchView = getViewMode() === 'branch'
  backToTrunkButton.style.display = isBranchView ? '' : 'none'

  updateBranchProgress(ctx)
}

export function updateScopedProgress(ctx: AppContext, target: HTMLButtonElement | null): void {
  const { progressCount, progressFill } = ctx.elements
  const { branchGroups } = ctx
  const viewMode = getViewMode()

  // In branch view, show only leaf progress for that branch
  if (viewMode === 'branch') {
    const branchIndex = target?.dataset.branchIndex
    if (branchIndex !== undefined) {
      const branchGroup = branchGroups[Number(branchIndex)]
      if (branchGroup) {
        const filledLeaves = branchGroup.leaves.filter((leaf) => leaf.dataset.filled === 'true').length
        progressCount.textContent = `${filledLeaves} of ${LEAF_COUNT} leaves filled`
        const progress = Math.round((filledLeaves / LEAF_COUNT) * 100)
        progressFill.style.width = `${progress}%`
        return
      }
    }
  }

  // In overview, show separate branch and leaf counts
  const filledBranches = branchGroups.filter((bg) => bg.branch.dataset.filled === 'true').length
  const totalLeaves = branchGroups.reduce((sum, bg) => sum + bg.leaves.length, 0)
  const filledLeaves = branchGroups.reduce(
    (sum, bg) => sum + bg.leaves.filter((leaf) => leaf.dataset.filled === 'true').length,
    0
  )

  progressCount.innerHTML = `${filledBranches} of ${branchGroups.length} branches filled<br>${filledLeaves} of ${totalLeaves} leaves filled`
  const progress = totalLeaves ? Math.round((filledLeaves / totalLeaves) * 100) : 0
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

  // Show leaves when we're in branch view or hovering a branch via graphic (not sidebar)
  // Sidebar hover should NOT change the sidebar itself
  const focusedBranchIndex = viewMode === 'branch' ? activeIndex : (getIsSidebarHover() ? null : hoveredIndex)

  if (focusedBranchIndex !== null) {
    // Show leaves for this branch
    const branchGroup = branchGroups[focusedBranchIndex]
    if (branchGroup) {
      updateLeafProgress(ctx, branchGroup)
      return
    }
  }

  // Default: show all branches
  let anyFilled = false

  branchProgressItems.forEach((item) => {
    const branchGroup = branchGroups[item.index]
    const filledLeaves = branchGroup.leaves.filter((leaf) => leaf.dataset.filled === 'true').length
    const totalLeaves = branchGroup.leaves.length

    item.label.textContent = getBranchLabel(branchGroup.branch, item.index)
    item.count.textContent = `${filledLeaves}/${totalLeaves}`

    const hasLabel = branchGroup.branch.dataset.filled === 'true'
    item.button.classList.toggle('is-labeled', hasLabel)
    item.button.classList.remove('is-leaf')

    if (hasLabel || filledLeaves > 0) anyFilled = true
  })

  branchProgress.classList.toggle('has-content', anyFilled)
}

function updateLeafProgress(ctx: AppContext, branchGroup: { branch: HTMLButtonElement, leaves: HTMLButtonElement[] }): void {
  const { branchProgress } = ctx.elements
  const { branchProgressItems } = ctx

  branchProgressItems.forEach((item, i) => {
    const leaf = branchGroup.leaves[i]
    if (leaf) {
      const isFilled = leaf.dataset.filled === 'true'
      item.label.textContent = getLeafLabel(leaf, i)
      item.count.textContent = isFilled ? '●' : '○'
      item.button.classList.toggle('is-labeled', isFilled)
      item.button.classList.add('is-leaf')
    }
  })

  // Always show leaves when in leaf view
  branchProgress.classList.add('has-content')
}

function getLeafLabel(leafNode: HTMLButtonElement, index: number): string {
  const stored = nodeState[leafNode.dataset.nodeId || '']
  const storedLabel = stored?.label?.trim() || ''
  if (storedLabel) {
    // Truncate long labels
    return storedLabel.length > 12 ? storedLabel.slice(0, 11) + '…' : storedLabel
  }
  return `Leaf ${index + 1}`
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
