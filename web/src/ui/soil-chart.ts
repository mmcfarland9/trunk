/**
 * SVG-based soil capacity chart.
 *
 * Renders a step-interpolated time series of soil capacity and available
 * values with hover scrubbing and range selection.
 */

import { getEvents } from '../events/store'
import { computeRawSoilHistory, bucketSoilData } from '../events/soil-charting'
import type { SoilChartRange, SoilChartPoint } from '../events/soil-charting'

const SVG_NS = 'http://www.w3.org/2000/svg'
const RANGES: SoilChartRange[] = ['1d', '1w', '1m', '3m', '6m', 'ytd', 'all']

// Chart geometry (viewBox 300×120)
const PAD_LEFT = 30
const PAD_RIGHT = 5
const PAD_TOP = 5
const PAD_BOTTOM = 18
const CHART_W = 300 - PAD_LEFT - PAD_RIGHT // 265
const CHART_H = 120 - PAD_TOP - PAD_BOTTOM // 97
const VB_W = 300
const VB_H = 120

const tooltipFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const axisFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
})

export function buildSoilChart(): { container: HTMLDivElement; update: () => void } {
  let currentRange: SoilChartRange = 'all'
  let currentPoints: SoilChartPoint[] = []

  // --- DOM ---
  const container = el('div', 'soil-chart')

  // Header
  const header = el('div', 'soil-chart-header')
  const title = el('span', 'soil-chart-title')
  title.textContent = 'SOIL'
  const legend = el('span', 'soil-chart-legend')
  const legendCap = el('span', 'soil-chart-legend-item')
  legendCap.dataset.series = 'capacity'
  legendCap.textContent = '\u2014 Capacity'
  const legendAvail = el('span', 'soil-chart-legend-item')
  legendAvail.dataset.series = 'available'
  legendAvail.textContent = '\u2014 Available'
  legend.append(legendCap, legendAvail)
  header.append(title, legend)

  // Body (position:relative wrapper for tooltip)
  const body = el('div', 'soil-chart-body')
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.classList.add('soil-chart-svg')
  svg.setAttribute('viewBox', `0 0 ${VB_W} ${VB_H}`)
  svg.setAttribute('preserveAspectRatio', 'none')

  // Tooltip
  const tooltip = el('div', 'soil-chart-tooltip hidden')
  const tooltipDate = el('span', 'soil-chart-tooltip-date')
  const tooltipCap = el('span', 'soil-chart-tooltip-cap')
  const tooltipAvail = el('span', 'soil-chart-tooltip-avail')
  tooltip.append(tooltipDate, tooltipCap, tooltipAvail)
  body.append(svg, tooltip)

  // Empty state
  const emptyMsg = el('p', 'soil-chart-empty hidden')
  emptyMsg.textContent = 'Harvest sprouts to grow capacity'

  // Range picker
  const rangesDiv = el('div', 'soil-chart-ranges')
  const rangeButtons: HTMLButtonElement[] = []
  for (const r of RANGES) {
    const btn = document.createElement('button')
    btn.dataset.range = r
    btn.textContent = r
    if (r === currentRange) btn.classList.add('is-active')
    btn.addEventListener('click', () => {
      currentRange = r
      for (const b of rangeButtons) b.classList.toggle('is-active', b.dataset.range === r)
      update()
    })
    rangeButtons.push(btn)
    rangesDiv.appendChild(btn)
  }

  container.append(header, body, emptyMsg, rangesDiv)

  // --- Scales ---
  function xScale(points: SoilChartPoint[], ts: Date): number {
    const t0 = points[0].timestamp.getTime()
    const t1 = points[points.length - 1].timestamp.getTime()
    if (t1 === t0) return PAD_LEFT
    return PAD_LEFT + ((ts.getTime() - t0) / (t1 - t0)) * CHART_W
  }

  function yScale(maxY: number, val: number): number {
    return PAD_TOP + CHART_H - (val / maxY) * CHART_H
  }

  // --- Step path builder ---
  function buildStepPath(
    points: SoilChartPoint[],
    maxY: number,
    accessor: (p: SoilChartPoint) => number,
  ): string {
    if (points.length === 0) return ''
    let d = `M ${xScale(points, points[0].timestamp)} ${yScale(maxY, accessor(points[0]))}`
    for (let i = 1; i < points.length; i++) {
      const x = xScale(points, points[i].timestamp)
      const newY = yScale(maxY, accessor(points[i]))
      d += ` H ${x} V ${newY}`
    }
    return d
  }

  // --- Render ---
  function renderChart(points: SoilChartPoint[]): void {
    while (svg.firstChild) svg.removeChild(svg.firstChild)

    if (points.length < 2) {
      body.classList.add('hidden')
      emptyMsg.classList.remove('hidden')
      return
    }
    body.classList.remove('hidden')
    emptyMsg.classList.add('hidden')

    const maxY = Math.max(15, Math.ceil(Math.max(...points.map((p) => p.capacity))))

    // Grid lines (4)
    for (let i = 1; i <= 4; i++) {
      const yVal = (maxY * i) / 4
      const y = yScale(maxY, yVal)
      const line = svgEl('line')
      setAttrs(line, {
        x1: PAD_LEFT,
        y1: y,
        x2: PAD_LEFT + CHART_W,
        y2: y,
        stroke: 'rgba(60,40,20,0.1)',
        'stroke-width': '0.5',
      })
      svg.appendChild(line)
      const label = svgEl('text')
      setAttrs(label, {
        x: PAD_LEFT - 2,
        y: y + 3,
        'text-anchor': 'end',
        'font-size': '8',
        'font-family': 'monospace',
        fill: 'rgba(111,86,68,0.6)',
      })
      label.textContent = yVal.toFixed(0)
      svg.appendChild(label)
    }

    // X-axis labels (4)
    for (let i = 0; i <= 3; i++) {
      const idx = Math.round((i * (points.length - 1)) / 3)
      const pt = points[idx]
      const x = xScale(points, pt.timestamp)
      const label = svgEl('text')
      setAttrs(label, {
        x,
        y: VB_H - 3,
        'text-anchor': 'middle',
        'font-size': '8',
        'font-family': 'monospace',
        fill: 'rgba(111,86,68,0.6)',
      })
      label.textContent = axisFmt.format(pt.timestamp)
      svg.appendChild(label)
    }

    // Capacity area fill
    const capPath = buildStepPath(points, maxY, (p) => p.capacity)
    const areaFill = svgEl('path')
    setAttrs(areaFill, {
      d: `${capPath} V ${PAD_TOP + CHART_H} H ${PAD_LEFT} Z`,
      fill: 'var(--twig)',
      opacity: '0.08',
    })
    svg.appendChild(areaFill)

    // Capacity line
    const capLine = svgEl('path')
    setAttrs(capLine, { d: capPath, fill: 'none', stroke: 'var(--twig)', 'stroke-width': '1.5' })
    svg.appendChild(capLine)

    // Available line
    const availPath = buildStepPath(points, maxY, (p) => p.available)
    const availLine = svgEl('path')
    setAttrs(availLine, { d: availPath, fill: 'none', stroke: '#44aa77', 'stroke-width': '1.5' })
    svg.appendChild(availLine)

    // Data point dots
    for (const pt of points) {
      const cx = xScale(points, pt.timestamp)
      const capDot = svgEl('circle')
      setAttrs(capDot, { cx, cy: yScale(maxY, pt.capacity), r: '1.5', fill: 'var(--twig)' })
      svg.appendChild(capDot)
      const availDot = svgEl('circle')
      setAttrs(availDot, { cx, cy: yScale(maxY, pt.available), r: '1.5', fill: '#44aa77' })
      svg.appendChild(availDot)
    }

    // Hover overlay rect
    const hoverRect = svgEl('rect')
    setAttrs(hoverRect, {
      x: PAD_LEFT,
      y: PAD_TOP,
      width: CHART_W,
      height: CHART_H,
      fill: 'transparent',
      class: 'soil-chart-hover-area',
    })
    svg.appendChild(hoverRect)

    // Hover events
    hoverRect.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = svg.getBoundingClientRect()
      const svgX = ((e.clientX - rect.left) / rect.width) * VB_W
      let closest = 0
      let bestDist = Infinity
      for (let i = 0; i < currentPoints.length; i++) {
        const px = xScale(currentPoints, currentPoints[i].timestamp)
        const dist = Math.abs(svgX - px)
        if (dist < bestDist) {
          bestDist = dist
          closest = i
        }
      }
      const pt = currentPoints[closest]
      const tooltipX = e.clientX - rect.left
      tooltip.style.left = `${Math.min(tooltipX, rect.width - 150)}px`
      tooltipDate.textContent = tooltipFmt.format(pt.timestamp)
      tooltipCap.textContent = pt.capacity.toFixed(2)
      tooltipAvail.textContent = pt.available.toFixed(2)
      tooltip.classList.remove('hidden')
    })

    hoverRect.addEventListener('mouseleave', () => {
      tooltip.classList.add('hidden')
    })
  }

  // --- Update ---
  function update(): void {
    const events = getEvents()
    const raw = computeRawSoilHistory(events)
    const points = bucketSoilData(raw, currentRange)
    currentPoints = points
    renderChart(points)
  }

  update()
  return { container, update }
}

// --- Helpers ---

function el(
  tag: string,
  className: string,
): HTMLDivElement & HTMLParagraphElement & HTMLSpanElement {
  const e = document.createElement(tag)
  for (const c of className.split(' ')) if (c) e.classList.add(c)
  return e as HTMLDivElement & HTMLParagraphElement & HTMLSpanElement
}

function svgEl(tag: string): SVGElement {
  return document.createElementNS(SVG_NS, tag)
}

function setAttrs(el: SVGElement, attrs: Record<string, string | number>): void {
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v))
}
