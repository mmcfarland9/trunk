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

const GRID_RINGS = [0.25, 0.5, 0.75]

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
  const gridPolygons: SVGPolygonElement[] = []
  const axisLines: SVGLineElement[] = []
  const dataDots: SVGCircleElement[] = []
  let dataPolygon: SVGPolygonElement | null = null
  let scores: number[] = []

  function rebuild(): void {
    while (svg.firstChild) svg.removeChild(svg.firstChild)
    gridPolygons.length = 0
    axisLines.length = 0
    dataDots.length = 0
    dataPolygon = null

    const engagement = computeBranchEngagement(getEvents())
    const hasData = engagement.some((b) => b.rawTotal > 0)

    if (!hasData) {
      scores = []
      return
    }

    scores = engagement.map((b) => b.score)

    // Grid ring polygons (one per ring fraction, positioned each frame)
    for (const _ of GRID_RINGS) {
      const poly = svgEl('polygon') as SVGPolygonElement
      setAttrs(poly, {
        fill: 'none',
        stroke: 'rgba(111,86,68,0.12)',
        'stroke-width': '0.5',
      })
      gridPolygons.push(poly)
      svg.appendChild(poly)
    }

    // Axis lines (from center to each branch position)
    for (let i = 0; i < BRANCH_COUNT; i++) {
      const line = svgEl('line') as SVGLineElement
      setAttrs(line, {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        stroke: 'rgba(111,86,68,0.12)',
        'stroke-width': '0.5',
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

    // Update grid ring polygons — each vertex at fraction f along center→branch
    for (let g = 0; g < gridPolygons.length; g++) {
      const frac = GRID_RINGS[g]
      const pts: string[] = []
      for (let i = 0; i < BRANCH_COUNT; i++) {
        const pos = branchPositions[i]
        if (!pos) continue
        const x = center.x + frac * (pos.x - center.x)
        const y = center.y + frac * (pos.y - center.y)
        pts.push(`${x},${y}`)
      }
      gridPolygons[g]?.setAttribute('points', pts.join(' '))
    }

    // Update axis lines — from center to each branch position
    for (let i = 0; i < BRANCH_COUNT; i++) {
      const pos = branchPositions[i]
      if (!pos || !axisLines[i]) continue
      axisLines[i].setAttribute('x1', String(center.x))
      axisLines[i].setAttribute('y1', String(center.y))
      axisLines[i].setAttribute('x2', String(pos.x))
      axisLines[i].setAttribute('y2', String(pos.y))
    }

    // Update data polygon and dots — vertex sits at score fraction along center→branch
    const polyPoints: string[] = []
    for (let i = 0; i < BRANCH_COUNT; i++) {
      const pos = branchPositions[i]
      if (!pos) continue
      const s = scores[i]
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
