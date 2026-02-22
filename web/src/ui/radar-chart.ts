/**
 * SVG-based life-balance radar chart with wind animation.
 *
 * Renders an octagonal radar showing per-branch engagement scores.
 * Axis tips and data vertices sway with the same seeded wind as tree branches,
 * imported from the shared wind utility (no duplication).
 */

import { getEvents } from '../events/store'
import { computeBranchEngagement } from '../events/radar-charting'
import { branchWindOffset } from '../utils/wind'

const SVG_NS = 'http://www.w3.org/2000/svg'

const CENTER = 100
const MAX_RADIUS = 80
const BRANCH_COUNT = 8
const GRID_RINGS = [0.25, 0.5, 0.75]

// Wind amplitude in SVG units (proportional to 6px branch sway in pixel space)
const RADAR_WIND_AMP = 3

function branchAngle(index: number): number {
  return ((2 * Math.PI) / BRANCH_COUNT) * index - Math.PI / 2
}

function polar(angle: number, radius: number): { x: number; y: number } {
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  }
}

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
  tick: (time: number) => void
} {
  const svg = svgEl('svg') as SVGSVGElement
  svg.classList.add('radar-chart-svg')
  svg.setAttribute('viewBox', '0 0 200 200')
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')

  // Persistent element references for per-frame wind updates
  const axisLines: SVGLineElement[] = []
  const dataDots: SVGCircleElement[] = []
  let dataPolygon: SVGPolygonElement | null = null
  let scores: number[] = []

  function rebuild(): void {
    while (svg.firstChild) svg.removeChild(svg.firstChild)
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

    // Grid rings (static — no wind)
    for (const frac of GRID_RINGS) {
      const circle = svgEl('circle')
      setAttrs(circle, {
        cx: CENTER,
        cy: CENTER,
        r: MAX_RADIUS * frac,
        fill: 'none',
        stroke: 'rgba(111,86,68,0.12)',
        'stroke-width': '0.5',
      })
      svg.appendChild(circle)
    }

    // Axis lines (tips shift with wind each frame)
    for (let i = 0; i < BRANCH_COUNT; i++) {
      const angle = branchAngle(i)
      const tip = polar(angle, MAX_RADIUS)
      const line = svgEl('line') as SVGLineElement
      setAttrs(line, {
        x1: CENTER,
        y1: CENTER,
        x2: tip.x,
        y2: tip.y,
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

    applyPositions(0)
  }

  function applyPositions(time: number): void {
    if (!scores.length) return

    const polyPoints: string[] = []
    for (let i = 0; i < BRANCH_COUNT; i++) {
      const angle = branchAngle(i)
      // Same seeded wind as tree branches, scaled to SVG coordinate space
      const wind = branchWindOffset(i, time, RADAR_WIND_AMP)

      // Axis tip: full wind sway (matches branch node movement)
      const tip = polar(angle, MAX_RADIUS)
      if (axisLines[i]) {
        axisLines[i].setAttribute('x2', String(tip.x + wind.x))
        axisLines[i].setAttribute('y2', String(tip.y + wind.y))
      }

      // Data vertex sits along the swayed axis at score fraction.
      // Wind scales with score so center stays pinned, edges sway fully.
      const s = scores[i]
      const pt = polar(angle, s * MAX_RADIUS)
      const wx = wind.x * s
      const wy = wind.y * s
      polyPoints.push(`${pt.x + wx},${pt.y + wy}`)

      if (dataDots[i]) {
        dataDots[i].setAttribute('cx', String(pt.x + wx))
        dataDots[i].setAttribute('cy', String(pt.y + wy))
      }
    }

    dataPolygon?.setAttribute('points', polyPoints.join(' '))
  }

  function tick(time: number): void {
    applyPositions(time)
  }

  function update(): void {
    rebuild()
  }

  rebuild()
  return { svg, update, tick }
}
