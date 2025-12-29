import type { AppContext } from '../types'
import { TOTAL_CIRCLES, SUB_CIRCLE_COUNT } from '../constants'
import { circleState, getFocusedCircle } from '../state'

export function updateStats(
  ctx: AppContext,
  findNextOpenCircle: (from?: HTMLButtonElement | null) => HTMLButtonElement | null
): void {
  const { nextButton } = ctx.elements

  updateScopedProgress(ctx, getFocusedCircle())

  const next = findNextOpenCircle(getFocusedCircle())
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
  const { branches, allCircles } = ctx

  // If target is a branch or leaf, scope to that branch
  const branchIndex = target?.dataset.branchIndex
  if (branchIndex !== undefined) {
    const branch = branches[Number(branchIndex)]
    if (branch) {
      const filledLeaves = branch.subs.filter((sub) => sub.dataset.filled === 'true').length
      progressCount.textContent = `${filledLeaves} of ${SUB_CIRCLE_COUNT} leaves filled`
      const progress = Math.round((filledLeaves / SUB_CIRCLE_COUNT) * 100)
      progressFill.style.width = `${progress}%`
      return
    }
  }

  // Otherwise show total progress
  const filled = allCircles.filter((circle) => circle.dataset.filled === 'true').length
  progressCount.textContent = `${filled} of ${TOTAL_CIRCLES} nodes filled`
  const progress = TOTAL_CIRCLES ? Math.round((filled / TOTAL_CIRCLES) * 100) : 0
  progressFill.style.width = `${progress}%`
}

export function buildBranchProgress(ctx: AppContext, onBranchClick: (index: number) => void): void {
  const { branchProgress } = ctx.elements
  const { branches, branchProgressItems } = ctx

  branchProgress.replaceChildren()
  branchProgressItems.length = 0

  branches.forEach((branch, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'branch-item'
    button.addEventListener('click', () => onBranchClick(index))

    const label = document.createElement('span')
    label.className = 'branch-label'

    const count = document.createElement('span')
    count.className = 'branch-count'

    const track = document.createElement('span')
    track.className = 'branch-track'

    const fill = document.createElement('span')
    fill.className = 'branch-fill'

    track.append(fill)
    button.append(label, count, track)
    branchProgress.append(button)

    branchProgressItems.push({ button, label, count, fill, mainCircle: branch.main, index })
  })
}

export function updateBranchProgress(ctx: AppContext): void {
  const { branchProgress } = ctx.elements
  const { branches, branchProgressItems } = ctx

  let anyFilled = false

  branchProgressItems.forEach((item) => {
    const branch = branches[item.index]
    const filledLeaves = branch.subs.filter((sub) => sub.dataset.filled === 'true').length
    const totalLeaves = branch.subs.length

    item.label.textContent = getBranchLabel(branch.main, item.index)
    item.count.textContent = `${filledLeaves}/${totalLeaves}`

    const hasLabel = branch.main.dataset.filled === 'true'
    item.button.classList.toggle('is-labeled', hasLabel)
    item.button.classList.toggle('is-complete', filledLeaves === totalLeaves && totalLeaves > 0)

    if (hasLabel || filledLeaves > 0) anyFilled = true
  })

  branchProgress.classList.toggle('has-content', anyFilled)
}

export function getBranchLabel(mainCircle: HTMLButtonElement, index: number): string {
  const defaultLabel = mainCircle.dataset.defaultLabel || ''
  const stored = circleState[mainCircle.dataset.circleId || '']
  const storedLabel = stored?.label?.trim() || ''
  if (storedLabel && storedLabel !== defaultLabel) {
    return storedLabel
  }
  return `Branch ${index + 1}`
}
