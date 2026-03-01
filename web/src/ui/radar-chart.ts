/**
 * SVG-based life-balance radar chart derived from branch positions.
 *
 * Renders an octagonal radar showing per-branch engagement scores.
 * Vertices are derived directly from animated branch positions in layout.ts,
 * so the radar polygon naturally inherits wind sway and elliptical geometry.
 *
 * Interactive features:
 * - Vertex markers with hover scaling and glow
 * - Axis guide lines (center → max extent) with hover highlighting
 * - HTML tooltip showing branch name and engagement percentage
 */

import { BRANCH_COUNT } from '../constants'
import { getEvents } from '../events/store'
import { computeBranchEngagement, type BranchEngagement } from '../events/radar-charting'

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Fraction of center→branch distance for the minimum (score=0) vertex. */
const FLOOR = 0.05
/** Additional fraction that a score of 1.0 adds on top of FLOOR. */
const REACH = 0.5
/** Axis lines extend to max radar extent (score=1.0 boundary). */
const AXIS_EXTENT = FLOOR + REACH

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K]
function svgEl(tag: string): SVGElement
function svgEl(tag: string): SVGElement {
  return document.createElementNS(SVG_NS, tag)
}

function setAttrs(el: SVGElement, attrs: Record<string, string | number>): void {
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v))
}

export function buildRadarChart(): {
  svg: SVGSVGElement
  update: () => void
  tick: (
    branchPositions: ReadonlyArray<{ x: number; y: number } | undefined>,
    center: { x: number; y: number },
  ) => void
} {
  const svg = svgEl('svg') as SVGSVGElement
  svg.classList.add('radar-chart-svg')
  // No fixed viewBox — set dynamically to match canvas pixel dimensions
  svg.setAttribute('preserveAspectRatio', 'none')

  // Persistent SVG element references (recreated on rebuild, updated per-frame)
  const axisLines: SVGLineElement[] = []
  const dataDots: SVGCircleElement[] = []
  const hitAreas: SVGCircleElement[] = []
  let dataPolygon: SVGPolygonElement | null = null
  let scores: number[] = []
  let engagement: BranchEngagement[] = []

  // Hover interaction state
  let activeHoverIndex = -1
  const vertexPositions: Array<{ x: number; y: number }> = Array.from(
    { length: BRANCH_COUNT },
    () => ({ x: 0, y: 0 }),
  )

  // HTML tooltip (persists across rebuilds, appended to SVG parent lazily)
  const tooltipEl = document.createElement('div')
  tooltipEl.className = 'radar-chart-tooltip'
  let tooltipMounted = false
  let tooltipWidth = 0
  let tooltipHeight = 0

  // --- Tooltip helpers ---

  function ensureTooltipMounted(): void {
    if (tooltipMounted && tooltipEl.parentElement) return
    const parent = svg.parentElement
    if (!parent) return
    parent.appendChild(tooltipEl)
    tooltipMounted = true
  }

  function showTooltip(index: number): void {
    ensureTooltipMounted()
    const b = engagement[index]
    if (!b) return
    const pct = Math.round(b.score * 100)
    tooltipEl.textContent = `${b.branchName} \u2014 ${pct}%`
    tooltipEl.classList.add('is-visible')
    // Measure dimensions for viewport clamping (forces synchronous layout)
    tooltipWidth = tooltipEl.offsetWidth
    tooltipHeight = tooltipEl.offsetHeight
    positionTooltip(index)
  }

  function hideTooltip(): void {
    tooltipEl.classList.remove('is-visible')
  }

  function positionTooltip(index: number): void {
    const pos = vertexPositions[index]
    if (!pos) return

    const gap = 10
    let left = pos.x - tooltipWidth / 2
    let top = pos.y - gap - tooltipHeight

    // Clamp within SVG parent bounds
    const svgW = svg.clientWidth || 500
    const margin = 4
    left = Math.max(margin, Math.min(svgW - tooltipWidth - margin, left))
    if (top < margin) {
      top = pos.y + gap
    }

    tooltipEl.style.left = `${left}px`
    tooltipEl.style.top = `${top}px`
  }

  // --- Hover handlers ---

  function onVertexEnter(index: number): void {
    activeHoverIndex = index

    // Scale up + glow on active dot
    const dot = dataDots[index]
    if (dot) {
      dot.setAttribute('r', '5')
      dot.setAttribute('fill', 'var(--wood)')
      dot.style.filter = 'drop-shadow(0 0 6px var(--twig))'
    }

    showTooltip(index)
  }

  function onVertexLeave(): void {
    const prev = activeHoverIndex
    activeHoverIndex = -1

    // Reset dot
    if (prev >= 0 && dataDots[prev]) {
      dataDots[prev].setAttribute('r', '3.5')
      dataDots[prev].setAttribute('fill', 'var(--twig)')
      dataDots[prev].style.filter = ''
    }

    hideTooltip()
  }

  // --- Build / update ---

  function rebuild(): void {
    while (svg.firstChild) svg.removeChild(svg.firstChild)
    axisLines.length = 0
    dataDots.length = 0
    hitAreas.length = 0
    dataPolygon = null
    activeHoverIndex = -1
    hideTooltip()

    engagement = computeBranchEngagement(getEvents())
    const hasData = engagement.some((b) => b.rawTotal > 0)

    if (!hasData) {
      scores = []
      return
    }

    scores = engagement.map((b) => b.score)

    // Axis guide lines (center → max extent, drawn first so polygon overlays)
    for (let i = 0; i < BRANCH_COUNT; i++) {
      const line = svgEl('line') as SVGLineElement
      setAttrs(line, {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        stroke: 'var(--ink-faint)',
        'stroke-opacity': '0.12',
        'stroke-width': '0.5',
        'stroke-dasharray': '2 3',
      })
      axisLines.push(line)
      svg.appendChild(line)
    }

    // Data polygon
    dataPolygon = svgEl('polygon') as SVGPolygonElement
    setAttrs(dataPolygon, {
      points: '',
      fill: 'var(--twig)',
      'fill-opacity': '0.12',
      stroke: 'var(--twig)',
      'stroke-opacity': '0.4',
      'stroke-width': '1',
    })
    svg.appendChild(dataPolygon)

    // Vertex dots + invisible hit areas
    for (let i = 0; i < BRANCH_COUNT; i++) {
      // Visible vertex marker
      const dot = svgEl('circle') as SVGCircleElement
      setAttrs(dot, {
        r: 3.5,
        fill: 'var(--twig)',
      })
      dot.classList.add('radar-chart-dot')
      dataDots.push(dot)
      svg.appendChild(dot)

      // Larger invisible hit area for pointer interaction
      const hit = svgEl('circle') as SVGCircleElement
      setAttrs(hit, {
        r: 14,
        fill: 'transparent',
        'pointer-events': 'all',
        cursor: 'default',
      })
      const idx = i
      hit.addEventListener('mouseenter', () => onVertexEnter(idx))
      hit.addEventListener('mouseleave', () => onVertexLeave())
      hitAreas.push(hit)
      svg.appendChild(hit)
    }
  }

  function applyPositions(
    branchPositions: ReadonlyArray<{ x: number; y: number } | undefined>,
    center: { x: number; y: number },
  ): void {
    if (!scores.length) return

    // Sync viewBox to current pixel dimensions
    const w = svg.clientWidth
    const h = svg.clientHeight
    if (w && h) {
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    }

    // Update all elements from animated branch positions
    const polyPoints: string[] = []
    for (let i = 0; i < BRANCH_COUNT; i++) {
      const pos = branchPositions[i]
      if (!pos) continue

      // Vertex position (scored fraction of branch distance)
      const s = FLOOR + scores[i] * REACH
      const x = center.x + s * (pos.x - center.x)
      const y = center.y + s * (pos.y - center.y)

      // Cache for tooltip positioning (mutate in-place for perf)
      const vp = vertexPositions[i]
      vp.x = x
      vp.y = y

      polyPoints.push(`${x},${y}`)

      // Dot + hit area track vertex
      if (dataDots[i]) {
        dataDots[i].setAttribute('cx', String(x))
        dataDots[i].setAttribute('cy', String(y))
      }
      if (hitAreas[i]) {
        hitAreas[i].setAttribute('cx', String(x))
        hitAreas[i].setAttribute('cy', String(y))
      }

      // Axis line: center → max radar extent (follows wind sway)
      if (axisLines[i]) {
        const axX = center.x + AXIS_EXTENT * (pos.x - center.x)
        const axY = center.y + AXIS_EXTENT * (pos.y - center.y)
        axisLines[i].setAttribute('x1', String(center.x))
        axisLines[i].setAttribute('y1', String(center.y))
        axisLines[i].setAttribute('x2', String(axX))
        axisLines[i].setAttribute('y2', String(axY))
      }
    }
    dataPolygon?.setAttribute('points', polyPoints.join(' '))

    // Track tooltip to animated vertex position
    if (activeHoverIndex >= 0) {
      positionTooltip(activeHoverIndex)
    }
  }

  function tick(
    branchPositions: ReadonlyArray<{ x: number; y: number } | undefined>,
    center: { x: number; y: number },
  ): void {
    applyPositions(branchPositions, center)
  }

  function update(): void {
    rebuild()
  }

  rebuild()
  return { svg, update, tick }
}
