import type { AppContext } from '../types'
import { TOTAL_NODES, LEAF_COUNT } from '../constants'
import { nodeState, getFocusedNode } from '../state'

export function updateStats(
  ctx: AppContext,
  findNextOpenNode: (from?: HTMLButtonElement | null) => HTMLButtonElement | null
): void {
  const { nextButton } = ctx.elements

  updateScopedProgress(ctx, getFocusedNode())

  const next = findNextOpenNode(getFocusedNode())
  if (next) {
    nextButton.disabled = false
    nextButton.textContent = 'Next open'
  } else {
    nextButton.disabled = true
    nextButton.textContent = 'All nodes filled'
  }

  updateBranchProgress(ctx)
}

export function updateScopedProgress(ctx: AppContext, target: HTMLButtonElement | null): void {
  const { progressCount, progressFill } = ctx.elements
  const { branchGroups, allNodes } = ctx

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

  const filled = allNodes.filter((node) => node.dataset.filled === 'true').length
  progressCount.textContent = `${filled} of ${TOTAL_NODES} nodes filled`
  const progress = TOTAL_NODES ? Math.round((filled / TOTAL_NODES) * 100) : 0
  progressFill.style.width = `${progress}%`
}

export function buildBranchProgress(ctx: AppContext, onBranchClick: (index: number) => void): void {
  const { branchProgress } = ctx.elements
  const { branchGroups, branchProgressItems } = ctx

  branchProgress.replaceChildren()
  branchProgressItems.length = 0

  branchGroups.forEach((_, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'branch-item'
    button.addEventListener('click', () => onBranchClick(index))

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

  let anyFilled = false

  branchProgressItems.forEach((item) => {
    const branchGroup = branchGroups[item.index]
    const filledLeaves = branchGroup.leaves.filter((leaf) => leaf.dataset.filled === 'true').length
    const totalLeaves = branchGroup.leaves.length

    item.label.textContent = getBranchLabel(branchGroup.branch, item.index)
    item.count.textContent = `${filledLeaves}/${totalLeaves}`

    const hasLabel = branchGroup.branch.dataset.filled === 'true'
    item.button.classList.toggle('is-labeled', hasLabel)

    if (hasLabel || filledLeaves > 0) anyFilled = true
  })

  branchProgress.classList.toggle('has-content', anyFilled)
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
