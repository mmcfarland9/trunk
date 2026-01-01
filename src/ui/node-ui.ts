import type { AppContext } from '../types'
import { nodeState, getFocusedNode, setFocusedNodeState } from '../state'

export function setNodeLabel(element: HTMLButtonElement, label: string): void {
  if (element.classList.contains('leaf')) {
    element.textContent = formatLeafLabel(label, element)
    return
  }

  const labelNode = element.querySelector<HTMLElement>('.node-label')

  if (element.classList.contains('branch')) {
    const formatted = formatBoxLabel(label)
    if (labelNode) {
      labelNode.textContent = formatted.middleRows
    } else {
      element.textContent = formatted.middleRows
    }
    element.dataset.topBorder = formatted.topBorder
    element.dataset.bottomBorder = formatted.bottomBorder
    return
  }

  if (labelNode) {
    labelNode.textContent = label
    return
  }

  element.textContent = label
}

type BoxFormat = {
  topBorder: string
  middleRows: string
  bottomBorder: string
}

function formatBoxLabel(label: string): BoxFormat {
  const lines = findSquarestWrap(label, 3)
  const maxLineLength = Math.max(...lines.map(l => l.length), 1)

  const paddedLines = lines.map(line => {
    const padding = maxLineLength - line.length
    const leftPad = Math.floor(padding / 2)
    const rightPad = padding - leftPad
    return `|${' '.repeat(leftPad + 2)}${line}${' '.repeat(rightPad + 2)}|`
  })

  const middleRowWidth = maxLineLength + 6
  const dashCount = Math.max(middleRowWidth - 2, 1)
  const dashes = '-'.repeat(dashCount)

  return {
    topBorder: `╭${dashes}╮`,
    middleRows: paddedLines.join('\n'),
    bottomBorder: `╰${dashes}╯`,
  }
}

function findSquarestWrap(text: string, maxLines: number): string[] {
  const words = text.trim().split(/\s+/)
  if (words.length === 0) return ['']
  if (words.length === 1) return [words[0]]

  const candidates = generateLineCandidates(words, maxLines)

  let best = candidates[0]
  let bestScore = scoreSquareness(best)

  for (const candidate of candidates) {
    const score = scoreSquareness(candidate)
    if (score < bestScore) {
      bestScore = score
      best = candidate
    }
  }

  return best
}

function generateLineCandidates(words: string[], maxLines: number): string[][] {
  const joined = words.join(' ')
  const candidates: string[][] = [[joined]]
  if (words.length < 2 || maxLines < 2) return candidates
  for (let i = 1; i < words.length; i++) {
    candidates.push([words.slice(0, i).join(' '), words.slice(i).join(' ')])
  }
  if (words.length < 3 || maxLines < 3) return candidates
  for (let i = 1; i < words.length - 1; i++) {
    for (let j = i + 1; j < words.length; j++) {
      candidates.push([words.slice(0, i).join(' '), words.slice(i, j).join(' '), words.slice(j).join(' ')])
    }
  }
  return candidates
}

function scoreSquareness(lines: string[]): number {
  const lineLengths = lines.map(l => l.length)
  const maxWidth = Math.max(...lineLengths)
  const minWidth = Math.min(...lineLengths)
  const height = lines.length

  const boxWidth = maxWidth + 4
  const boxHeight = height + 2

  const ratio = boxWidth / boxHeight
  const squareScore = Math.abs(ratio - 1)

  const balanceScore = (maxWidth - minWidth) / Math.max(maxWidth, 1)

  return squareScore + balanceScore * 1.5
}

export function getNodePlaceholder(element: HTMLButtonElement): string {
  return element.dataset.placeholder || element.dataset.defaultLabel || 'Node'
}

export function setNodeVisibility(element: HTMLButtonElement, isVisible: boolean): void {
  element.classList.toggle('is-hidden', !isVisible)
  element.setAttribute('aria-hidden', isVisible ? 'false' : 'true')
  element.tabIndex = isVisible ? 0 : -1
}

export function syncNode(element: HTMLButtonElement): void {
  const nodeId = element.dataset.nodeId
  if (!nodeId) return

  const stored = nodeState[nodeId]
  const defaultLabel = element.dataset.defaultLabel || ''
  const storedLabel = stored?.label?.trim() || ''
  const label = storedLabel || defaultLabel

  setNodeLabel(element, label)

  const hasContent = Boolean(stored && (stored.note?.trim() || (storedLabel && storedLabel !== defaultLabel)))
  element.dataset.filled = hasContent ? 'true' : 'false'
}

export function setFocusedNode(
  target: HTMLButtonElement | null,
  ctx: AppContext,
  updateFocusCallback: (target: HTMLButtonElement | null) => void
): void {
  const currentFocused = getFocusedNode()
  if (currentFocused && currentFocused !== target) {
    currentFocused.classList.remove('is-focused')
  }

  setFocusedNodeState(target)

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

  const nodeId = target.dataset.nodeId
  const defaultLabel = target.dataset.defaultLabel || ''
  const stored = nodeId ? nodeState[nodeId] : undefined
  const label = stored?.label?.trim() || ''
  const note = stored?.note?.trim() || ''
  const hasCustomLabel = Boolean(label && label !== defaultLabel)
  const isLeaf = target.classList.contains('leaf')
  const placeholder = getNodePlaceholder(target)
  const displayLabel = hasCustomLabel ? label : isLeaf ? 'Add title...' : placeholder

  focusMeta.textContent = target.getAttribute('aria-label') || 'Selected node'
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

  const candidates = generateLineCandidates(words, 3)
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
