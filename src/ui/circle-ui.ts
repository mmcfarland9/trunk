import type { AppContext } from '../types'
import { circleState, getFocusedCircle, setFocusedCircleState } from '../state'

export function setCircleLabel(element: HTMLButtonElement, label: string): void {
  const labelNode = element.querySelector<HTMLElement>('.circle-label')
  if (labelNode) {
    labelNode.textContent = label
  } else {
    element.textContent = label
  }

  applyLeafLabelSizing(element, label)
}

export function getCirclePlaceholder(element: HTMLButtonElement): string {
  return element.dataset.placeholder || element.dataset.defaultLabel || 'Circle'
}

export function setCircleVisibility(element: HTMLButtonElement, isVisible: boolean): void {
  element.classList.toggle('is-hidden', !isVisible)
  element.setAttribute('aria-hidden', isVisible ? 'false' : 'true')
  element.tabIndex = isVisible ? 0 : -1
}

export function syncCircle(element: HTMLButtonElement): void {
  const circleId = element.dataset.circleId
  if (!circleId) return

  const stored = circleState[circleId]
  const defaultLabel = element.dataset.defaultLabel || ''
  const storedLabel = stored?.label?.trim() || ''
  const label = storedLabel || defaultLabel

  setCircleLabel(element, label)

  const hasContent = Boolean(stored && (stored.note?.trim() || (storedLabel && storedLabel !== defaultLabel)))
  element.dataset.filled = hasContent ? 'true' : 'false'
}

export function setFocusedCircle(
  target: HTMLButtonElement | null,
  ctx: AppContext,
  updateFocusCallback: (target: HTMLButtonElement | null) => void
): void {
  const currentFocused = getFocusedCircle()
  if (currentFocused && currentFocused !== target) {
    currentFocused.classList.remove('is-focused')
  }

  setFocusedCircleState(target)

  if (target) {
    target.classList.add('is-focused')
  }

  const focusedBranch = target?.dataset.branchIndex
  ctx.branchProgressItems.forEach((item) => {
    item.button.classList.toggle('is-current', focusedBranch === String(item.index))
  })

  updateFocusCallback(target)
}

export function updateFocus(target: HTMLButtonElement | null, ctx: AppContext): void {
  const { focusMeta, focusTitle, focusNote } = ctx.elements
  const focusSection = ctx.elements.sidePanel.querySelector('.focus-section')

  if (!target) {
    focusSection?.classList.add('is-empty')
    focusMeta.textContent = ''
    focusTitle.textContent = ''
    focusNote.textContent = ''
    return
  }

  focusSection?.classList.remove('is-empty')

  const circleId = target.dataset.circleId
  const defaultLabel = target.dataset.defaultLabel || ''
  const stored = circleId ? circleState[circleId] : undefined
  const label = stored?.label?.trim() || ''
  const note = stored?.note?.trim() || ''
  const hasCustomLabel = Boolean(label && label !== defaultLabel)
  const placeholder = getCirclePlaceholder(target)
  const displayLabel = hasCustomLabel ? label : placeholder

  focusMeta.textContent = target.getAttribute('aria-label') || 'Selected circle'
  focusTitle.textContent = displayLabel
  focusTitle.classList.toggle('is-muted', !hasCustomLabel)
  focusNote.textContent = note || 'Add notes to capture the context and next steps.'
  focusNote.classList.toggle('is-muted', !note)
}

function applyLeafLabelSizing(element: HTMLButtonElement, label: string): void {
  if (!element.classList.contains('sub-circle')) return

  const length = label.trim().length
  let scale = 1

  if (length > 14) {
    scale = 0.72
  } else if (length > 10) {
    scale = 0.82
  } else if (length > 6) {
    scale = 0.9
  }

  element.style.setProperty('--leaf-label-scale', String(scale))
}
