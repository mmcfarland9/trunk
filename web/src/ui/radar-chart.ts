/**
 * SVG-based life-balance radar chart derived from branch positions.
 *
 * Renders an octagonal radar showing per-branch engagement scores.
 * Vertices are derived directly from animated branch positions in layout.ts,
 * so the radar polygon naturally inherits wind sway and elliptical geometry.
 */

import { BRANCH_COUNT } from '../constants'
import { getEvents } from '../events/store'
import { computeBranchEngagement, type BranchEngagement } from '../events/radar-charting'

const SVG_NS = 'http://www.w3.org/2000/svg'

// Fraction of center→branch distance for the minimum (score=0) vertex.
const FLOOR = 0.05
// Additional fraction that a score of 1.0 adds on top of FLOOR.
const REACH = 0.5

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
  const hitAreas: SVGCircleElement[] = []
  let dataPolygon: SVGPolygonElement | null = null
  let scores: number[] = []
  let engagement: BranchEngagement[] = []

  function rebuild(): void {
    while (svg.firstChild) svg.removeChild(svg.firstChild)
    dataDots.length = 0
    hitAreas.length = 0
    dataPolygon = null

    engagement = computeBranchEngagement(getEvents())
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

    // Data dots + invisible hit areas with tooltips
    for (let i = 0; i < BRANCH_COUNT; i++) {
      const dot = svgEl('circle') as SVGCircleElement
      setAttrs(dot, { r: 2, fill: 'var(--twig)', 'fill-opacity': '0.6' })
      dataDots.push(dot)
      svg.appendChild(dot)

      const hit = svgEl('circle') as SVGCircleElement
      setAttrs(hit, {
        r: 12,
        fill: 'transparent',
        'pointer-events': 'all',
        cursor: 'default',
      })
      const title = svgEl('title')
      title.textContent = formatTooltip(engagement[i])
      hit.appendChild(title)
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

    // Update data polygon, dots, and hit areas
    const polyPoints: string[] = []
    for (let i = 0; i < BRANCH_COUNT; i++) {
      const pos = branchPositions[i]
      if (!pos) continue
      const s = FLOOR + scores[i] * REACH
      const x = center.x + s * (pos.x - center.x)
      const y = center.y + s * (pos.y - center.y)
      polyPoints.push(`${x},${y}`)
      if (dataDots[i]) {
        dataDots[i].setAttribute('cx', String(x))
        dataDots[i].setAttribute('cy', String(y))
      }
      if (hitAreas[i]) {
        hitAreas[i].setAttribute('cx', String(x))
        hitAreas[i].setAttribute('cy', String(y))
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

function formatTooltip(b: BranchEngagement): string {
  return [
    b.branchName,
    `Planted: ${b.planted}`,
    `Watered: ${b.watered}`,
    `Sun: ${b.sunReflections}`,
    `Harvested: ${b.harvested}`,
  ].join('\n')
}
