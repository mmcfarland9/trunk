/**
 * SVG-based life-balance radar chart.
 *
 * Renders an octagonal radar showing per-branch engagement scores.
 * Axes match the tree branch angles (branch 0 at top, clockwise).
 */

import { getEvents } from '../events/store'
import { computeBranchEngagement } from '../events/radar-charting'

const SVG_NS = 'http://www.w3.org/2000/svg'

const CENTER = 100
const MAX_RADIUS = 80
const BRANCH_COUNT = 8
const GRID_RINGS = [0.25, 0.5, 0.75]

/**
 * Compute the angle for a branch index.
 * Branch 0 points straight up (-π/2), proceeding clockwise in π/4 steps.
 */
function branchAngle(index: number): number {
  return ((2 * Math.PI) / BRANCH_COUNT) * index - Math.PI / 2
}

/**
 * Convert polar (angle, radius) to cartesian (x, y) relative to center.
 */
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

/**
 * Choose a text-anchor value based on the axis angle so labels don't
 * overlap the chart body.
 */
function labelAnchor(angle: number): string {
  const cos = Math.cos(angle)
  if (cos > 0.3) return 'start'
  if (cos < -0.3) return 'end'
  return 'middle'
}

/**
 * Choose a dominant-baseline for vertical positioning of labels.
 */
function labelBaseline(angle: number): string {
  const sin = Math.sin(angle)
  if (sin > 0.3) return 'hanging'
  if (sin < -0.3) return 'auto'
  return 'central'
}

export function buildRadarChart(): { svg: SVGSVGElement; update: () => void } {
  const svg = svgEl('svg') as SVGSVGElement
  svg.classList.add('radar-chart-svg')
  svg.setAttribute('viewBox', '0 0 200 200')
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')

  function render(): void {
    while (svg.firstChild) svg.removeChild(svg.firstChild)

    const events = getEvents()
    const engagement = computeBranchEngagement(events)
    const hasData = engagement.some((b) => b.rawTotal > 0)

    if (!hasData) {
      const text = svgEl('text')
      setAttrs(text, {
        x: CENTER,
        y: CENTER,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        'font-size': '9',
        'font-family': 'monospace',
        fill: 'rgba(111,86,68,0.4)',
      })
      text.textContent = 'No activity yet'
      svg.appendChild(text)
      return
    }

    // Grid rings
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

    // Axis lines + labels
    for (let i = 0; i < BRANCH_COUNT; i++) {
      const angle = branchAngle(i)
      const tip = polar(angle, MAX_RADIUS)

      // Axis line
      const line = svgEl('line')
      setAttrs(line, {
        x1: CENTER,
        y1: CENTER,
        x2: tip.x,
        y2: tip.y,
        stroke: 'rgba(111,86,68,0.12)',
        'stroke-width': '0.5',
      })
      svg.appendChild(line)

      // Label just outside the axis tip
      const labelPos = polar(angle, MAX_RADIUS + 10)
      const label = svgEl('text')
      setAttrs(label, {
        x: labelPos.x,
        y: labelPos.y,
        'text-anchor': labelAnchor(angle),
        'dominant-baseline': labelBaseline(angle),
        'font-size': '6',
        'font-family': 'monospace',
        fill: 'rgba(111,86,68,0.5)',
      })
      label.textContent = engagement[i].branchName
      svg.appendChild(label)
    }

    // Data polygon
    const polyPoints: string[] = []
    for (let i = 0; i < BRANCH_COUNT; i++) {
      const angle = branchAngle(i)
      const r = engagement[i].score * MAX_RADIUS
      const pt = polar(angle, r)
      polyPoints.push(`${pt.x},${pt.y}`)
    }

    const polygon = svgEl('polygon')
    setAttrs(polygon, {
      points: polyPoints.join(' '),
      fill: 'var(--twig)',
      'fill-opacity': '0.12',
      stroke: 'var(--twig)',
      'stroke-opacity': '0.4',
      'stroke-width': '1',
    })
    svg.appendChild(polygon)

    // Data dots
    for (let i = 0; i < BRANCH_COUNT; i++) {
      const angle = branchAngle(i)
      const r = engagement[i].score * MAX_RADIUS
      const pt = polar(angle, r)
      const dot = svgEl('circle')
      setAttrs(dot, {
        cx: pt.x,
        cy: pt.y,
        r: 2,
        fill: 'var(--twig)',
        'fill-opacity': '0.6',
      })
      svg.appendChild(dot)
    }
  }

  function update(): void {
    render()
  }

  update()
  return { svg, update }
}
