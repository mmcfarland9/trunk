/**
 * SVG-based life-balance radar chart derived from branch positions.
 *
 * Renders an octagonal radar showing per-branch engagement scores.
 * Vertices are derived directly from animated branch positions in layout.ts,
 * so the radar polygon naturally inherits wind sway and elliptical geometry.
 */

import { BRANCH_COUNT } from '../constants'
import { getEvents } from '../events/store'
import { computeBranchEngagement } from '../events/radar-charting'

const SVG_NS = 'http://www.w3.org/2000/svg'

// Max reach of the radar polygon as a fraction of center→branch distance.
// Keeps the chart subtle — a score of 1.0 reaches 25% of the way to the branch.
const REACH = 0.25

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

  // Persistent element references for per-frame updates
  const dataDots: SVGCircleElement[] = []
  let dataPolygon: SVGPolygonElement | null = null
  let scores: number[] = []

  function rebuild(): void {
    while (svg.firstChild) svg.removeChild(svg.firstChild)
    dataDots.length = 0
    dataPolygon = null

    const engagement = computeBranchEngagement(getEvents())
    const hasData = engagement.some((b) => b.rawTotal > 0)

    if (!hasData) {
      scores = []
      return
    }

    scores = engagement.map((b) => b.score)

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

    // Data dots
    for (let i = 0; i < BRANCH_COUNT; i++) {
      const dot = svgEl('circle') as SVGCircleElement
      setAttrs(dot, { r: 2, fill: 'var(--twig)', 'fill-opacity': '0.6' })
      dataDots.push(dot)
      svg.appendChild(dot)
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

    // Update data polygon and dots — vertex at score × REACH along center→branch
    const polyPoints: string[] = []
    for (let i = 0; i < BRANCH_COUNT; i++) {
      const pos = branchPositions[i]
      if (!pos) continue
      const s = scores[i] * REACH
      const x = center.x + s * (pos.x - center.x)
      const y = center.y + s * (pos.y - center.y)
      polyPoints.push(`${x},${y}`)
      if (dataDots[i]) {
        dataDots[i].setAttribute('cx', String(x))
        dataDots[i].setAttribute('cy', String(y))
      }
    }
    dataPolygon?.setAttribute('points', polyPoints.join(' '))
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
