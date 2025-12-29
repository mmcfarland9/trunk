import type { AppContext } from '../types'
import { circleState, getFocusedCircle, setFocusedCircleState } from '../state'

export function setCircleLabel(element: HTMLButtonElement, label: string): void {
  if (element.classList.contains('sub-circle')) {
    element.textContent = formatLeafLabel(label, element)
    return
  }

  const labelNode = element.querySelector<HTMLElement>('.circle-label')
  if (labelNode) {
    labelNode.textContent = label
  } else {
    element.textContent = label
  }
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
  const isLeaf = target.classList.contains('sub-circle')
  const placeholder = getCirclePlaceholder(target)
  const displayLabel = hasCustomLabel ? label : isLeaf ? 'Add title...' : placeholder

  focusMeta.textContent = target.getAttribute('aria-label') || 'Selected circle'
  focusTitle.textContent = displayLabel
  focusTitle.classList.toggle('is-muted', !hasCustomLabel)
  focusNote.textContent = note || (isLeaf ? 'Add description...' : 'Add notes to capture the context and next steps.')
  focusNote.classList.toggle('is-muted', !note)
}

const LEAF_TARGET_RATIO = 16 / 9
const LEAF_LINE_PENALTY = 0.06
const DEFAULT_LEAF_METRICS = {
  fontSize: 9.6,
  lineHeight: 8.16,
  paddingX: 44,
  paddingY: 32,
  font: '500 9.6px sans-serif',
}
const leafMeasureContext = document.createElement('canvas').getContext('2d')

function formatLeafLabel(label: string, element: HTMLButtonElement): string {
  const trimmed = label.trim()
  if (!trimmed) return ''

  const words = trimmed.split(/\s+/)
  if (words.length === 1) return trimmed

  const candidates = buildLeafCandidates(words)
  let best = candidates[0]
  let bestScore = Number.POSITIVE_INFINITY

  const metrics = getLeafMetrics(element)
  candidates.forEach((lines) => {
    const score = scoreLeafLines(lines, metrics)
    if (score < bestScore) {
      bestScore = score
      best = lines
    }
  })

  return best.join('\n')
}

function buildLeafCandidates(words: string[]): string[][] {
  const joined = words.join(' ')
  const candidates: string[][] = [[joined]]

  for (let i = 1; i < words.length; i += 1) {
    candidates.push([words.slice(0, i).join(' '), words.slice(i).join(' ')])
  }

  if (words.length > 2) {
    for (let i = 1; i < words.length - 1; i += 1) {
      for (let j = i + 1; j < words.length; j += 1) {
        candidates.push([
          words.slice(0, i).join(' '),
          words.slice(i, j).join(' '),
          words.slice(j).join(' '),
        ])
      }
    }
  }

  return candidates
}

function scoreLeafLines(lines: string[], metrics: LeafMetrics): number {
  const lineWidths = lines.map((line) => measureLineWidth(line, metrics))
  const maxWidth = Math.max(...lineWidths)
  const minWidth = Math.min(...lineWidths)
  const totalWidth = maxWidth + metrics.paddingX
  const totalHeight = lines.length * metrics.lineHeight + metrics.paddingY
  const ratio = totalWidth / Math.max(totalHeight, 1)
  const balance = (maxWidth - minWidth) / Math.max(maxWidth, 1)
  const linePenalty = (lines.length - 1) * LEAF_LINE_PENALTY

  return Math.abs(ratio - LEAF_TARGET_RATIO) + balance * 0.12 + linePenalty
}

type LeafMetrics = {
  fontSize: number
  lineHeight: number
  paddingX: number
  paddingY: number
  font: string
}

function getLeafMetrics(element: HTMLButtonElement): LeafMetrics {
  if (!element.isConnected) {
    return DEFAULT_LEAF_METRICS
  }

  const style = window.getComputedStyle(element)
  const fontSize = Number.parseFloat(style.fontSize) || DEFAULT_LEAF_METRICS.fontSize
  const lineHeightRaw = style.lineHeight || ''
  const lineHeightValue = Number.parseFloat(lineHeightRaw)
  let lineHeight = fontSize * 1.2
  if (!Number.isNaN(lineHeightValue)) {
    lineHeight = lineHeightRaw.endsWith('px') ? lineHeightValue : lineHeightValue * fontSize
  }
  const paddingX =
    (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0)
  const paddingY =
    (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0)
  const fontStyle = style.fontStyle || 'normal'
  const fontWeight = style.fontWeight || '400'
  const fontFamily = style.fontFamily || 'sans-serif'
  const font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`

  return {
    fontSize,
    lineHeight,
    paddingX,
    paddingY,
    font,
  }
}

function measureLineWidth(line: string, metrics: LeafMetrics): number {
  if (!leafMeasureContext) {
    return line.length * metrics.fontSize * 0.55
  }

  if (leafMeasureContext.font !== metrics.font) {
    leafMeasureContext.font = metrics.font
  }

  return leafMeasureContext.measureText(line).width
}
