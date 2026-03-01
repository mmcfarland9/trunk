/**
 * SVG-based soil capacity chart.
 *
 * Renders a smooth bezier-interpolated time series of soil capacity and
 * available values with hover scrubbing, range selection, and gradient fill.
 */

import { getEvents } from '../events/store'
import { computeRawSoilHistory, bucketSoilData } from '../events/soil-charting'
import type { SoilChartRange, SoilChartPoint } from '../events/soil-charting'

const SVG_NS = 'http://www.w3.org/2000/svg'
const RANGES: SoilChartRange[] = ['1d', '1w', '1m', '3m', '6m', 'ytd', 'all']

// Chart geometry (viewBox 300x120)
const PAD_LEFT = 30
const PAD_RIGHT = 5
const PAD_TOP = 5
const PAD_BOTTOM = 18
const CHART_W = 300 - PAD_LEFT - PAD_RIGHT // 265
const CHART_H = 120 - PAD_TOP - PAD_BOTTOM // 97
const VB_W = 300
const VB_H = 120

// Transition timing for range changes (ms)
const FADE_MS = 150

const tooltipDateFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const axisFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
})

// --- Cached CSS var colors (resolved once, refreshed on render) ---
let cachedGridColor = ''
let cachedLabelColor = ''
let cachedPaperColor = ''

function refreshCssColors(): void {
  const style = getComputedStyle(document.documentElement)
  cachedGridColor = style.getPropertyValue('--border-subtle').trim() || 'rgba(60,40,20,0.08)'
  cachedLabelColor = style.getPropertyValue('--ink-faint').trim() || 'rgba(111,86,68,0.6)'
  cachedPaperColor = style.getPropertyValue('--paper').trim() || '#f8f6f1'
}

export function buildSoilChart(): {
  container: HTMLDivElement
  update: () => void
} {
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
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')

  // Tooltip
  const tooltip = el('div', 'soil-chart-tooltip hidden')
  const tooltipCap = el('span', 'soil-chart-tooltip-cap')
  const tooltipAvail = el('span', 'soil-chart-tooltip-avail')
  const tooltipDate = el('span', 'soil-chart-tooltip-date')
  tooltip.append(tooltipCap, tooltipAvail, tooltipDate)
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
      updateWithTransition()
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

  // --- Step path builder (fallback for 1d range) ---
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

  // --- Monotone cubic bezier path builder ---
  function buildSmoothPath(
    points: SoilChartPoint[],
    maxY: number,
    accessor: (p: SoilChartPoint) => number,
  ): string {
    if (points.length === 0) return ''
    const xs = points.map((p) => xScale(points, p.timestamp))
    const ys = points.map((p) => yScale(maxY, accessor(p)))
    const n = xs.length

    if (n === 1) return `M ${xs[0]} ${ys[0]}`
    if (n === 2) return `M ${xs[0]} ${ys[0]} L ${xs[1]} ${ys[1]}`

    // Compute slopes using finite differences with monotonicity constraints
    const slopes: number[] = new Array(n)
    for (let i = 0; i < n; i++) {
      if (i === 0) {
        slopes[i] = (ys[1] - ys[0]) / (xs[1] - xs[0])
      } else if (i === n - 1) {
        slopes[i] = (ys[n - 1] - ys[n - 2]) / (xs[n - 1] - xs[n - 2])
      } else {
        const d0 = (ys[i] - ys[i - 1]) / (xs[i] - xs[i - 1])
        const d1 = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i])
        // If signs differ, tangent is zero (monotonicity constraint)
        if (d0 * d1 <= 0) {
          slopes[i] = 0
        } else {
          // Harmonic mean of slopes (Fritsch-Carlson method)
          slopes[i] = (2 * d0 * d1) / (d0 + d1)
        }
      }
    }

    let d = `M ${xs[0]} ${ys[0]}`
    for (let i = 0; i < n - 1; i++) {
      const dx = xs[i + 1] - xs[i]
      const cp1x = xs[i] + dx / 3
      const cp1y = ys[i] + (slopes[i] * dx) / 3
      const cp2x = xs[i + 1] - dx / 3
      const cp2y = ys[i + 1] - (slopes[i + 1] * dx) / 3
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${xs[i + 1]} ${ys[i + 1]}`
    }
    return d
  }

  // Use smooth for most ranges, step for 1d where discrete changes make sense
  function buildPath(
    points: SoilChartPoint[],
    maxY: number,
    accessor: (p: SoilChartPoint) => number,
  ): string {
    return currentRange === '1d'
      ? buildStepPath(points, maxY, accessor)
      : buildSmoothPath(points, maxY, accessor)
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

    // Refresh cached CSS colors for current theme
    refreshCssColors()

    const maxY = Math.max(15, Math.ceil(Math.max(...points.map((p) => p.capacity))))

    // SVG defs — gradient for area fill + glow filter for hover
    const defs = svgEl('defs')
    const gradient = svgEl('linearGradient')
    setAttrs(gradient, { id: 'soil-cap-gradient', x1: 0, y1: 0, x2: 0, y2: 1 })
    const stop1 = svgEl('stop')
    setAttrs(stop1, { offset: '0%', 'stop-color': 'var(--twig)', 'stop-opacity': '0.15' })
    const stop2 = svgEl('stop')
    setAttrs(stop2, { offset: '100%', 'stop-color': 'var(--twig)', 'stop-opacity': '0' })
    gradient.append(stop1, stop2)
    defs.appendChild(gradient)

    const availGradient = svgEl('linearGradient')
    setAttrs(availGradient, { id: 'soil-avail-gradient', x1: 0, y1: 0, x2: 0, y2: 1 })
    const availStop1 = svgEl('stop')
    setAttrs(availStop1, { offset: '0%', 'stop-color': '#44aa77', 'stop-opacity': '0.10' })
    const availStop2 = svgEl('stop')
    setAttrs(availStop2, { offset: '100%', 'stop-color': '#44aa77', 'stop-opacity': '0' })
    availGradient.append(availStop1, availStop2)
    defs.appendChild(availGradient)

    const glowFilter = svgEl('filter')
    glowFilter.setAttribute('id', 'soil-glow')
    const blur = svgEl('feGaussianBlur')
    setAttrs(blur, { in: 'SourceGraphic', stdDeviation: '2', result: 'blur' })
    const glowComposite = svgEl('feComposite')
    setAttrs(glowComposite, { in: 'SourceGraphic', in2: 'blur', operator: 'over' })
    glowFilter.append(blur, glowComposite)
    defs.appendChild(glowFilter)

    svg.appendChild(defs)

    // Grid lines (4) — dashed, using CSS var color
    for (let i = 1; i <= 4; i++) {
      const yVal = (maxY * i) / 4
      const y = yScale(maxY, yVal)
      const line = svgEl('line')
      setAttrs(line, {
        x1: PAD_LEFT,
        y1: y,
        x2: PAD_LEFT + CHART_W,
        y2: y,
        stroke: cachedGridColor,
        'stroke-width': '0.3',
        'stroke-dasharray': '4,4',
      })
      svg.appendChild(line)
      const label = svgEl('text')
      setAttrs(label, {
        x: PAD_LEFT - 2,
        y: y + 3,
        'text-anchor': 'end',
        'font-size': '8',
        'font-family': 'monospace',
        fill: cachedLabelColor,
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
        fill: cachedLabelColor,
      })
      label.textContent = axisFmt.format(pt.timestamp)
      svg.appendChild(label)
    }

    // Capacity area fill with gradient
    const capPath = buildPath(points, maxY, (p) => p.capacity)
    const lastX = xScale(points, points[points.length - 1].timestamp)
    const areaFill = svgEl('path')
    setAttrs(areaFill, {
      d: `${capPath} L ${lastX} ${PAD_TOP + CHART_H} L ${PAD_LEFT} ${PAD_TOP + CHART_H} Z`,
      fill: 'url(#soil-cap-gradient)',
    })
    svg.appendChild(areaFill)

    // Capacity shadow line (subtle depth)
    const capShadow = svgEl('path')
    setAttrs(capShadow, {
      d: capPath,
      fill: 'none',
      stroke: 'var(--twig)',
      'stroke-width': '4',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: '0.08',
    })
    svg.appendChild(capShadow)

    // Capacity line
    const capLine = svgEl('path')
    setAttrs(capLine, {
      d: capPath,
      fill: 'none',
      stroke: 'var(--twig)',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    })
    svg.appendChild(capLine)

    // Available area fill with gradient
    const availPath = buildPath(points, maxY, (p) => p.available)
    const availAreaFill = svgEl('path')
    setAttrs(availAreaFill, {
      d: `${availPath} L ${lastX} ${PAD_TOP + CHART_H} L ${PAD_LEFT} ${PAD_TOP + CHART_H} Z`,
      fill: 'url(#soil-avail-gradient)',
    })
    svg.appendChild(availAreaFill)

    // Available line
    const availLine = svgEl('path')
    setAttrs(availLine, {
      d: availPath,
      fill: 'none',
      stroke: '#44aa77',
      'stroke-width': '1.5',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    })
    svg.appendChild(availLine)

    // Vertical rule line (shown on hover)
    const ruleLine = svgEl('line')
    setAttrs(ruleLine, {
      x1: 0,
      y1: PAD_TOP,
      x2: 0,
      y2: PAD_TOP + CHART_H,
    })
    ruleLine.classList.add('soil-chart-rule')
    svg.appendChild(ruleLine)

    // Data point dots — tracked for hover manipulation
    const capDots: SVGElement[] = []
    const availDots: SVGElement[] = []

    for (const pt of points) {
      const cx = xScale(points, pt.timestamp)
      const capDot = svgEl('circle')
      setAttrs(capDot, {
        cx,
        cy: yScale(maxY, pt.capacity),
        r: '2',
        fill: 'var(--twig)',
        stroke: cachedPaperColor,
        'stroke-width': '0.5',
      })
      capDot.classList.add('soil-chart-dot', 'soil-chart-dot-cap')
      svg.appendChild(capDot)
      capDots.push(capDot)

      const availDot = svgEl('circle')
      setAttrs(availDot, {
        cx,
        cy: yScale(maxY, pt.available),
        r: '2',
        fill: '#44aa77',
        stroke: cachedPaperColor,
        'stroke-width': '0.5',
      })
      availDot.classList.add('soil-chart-dot', 'soil-chart-dot-avail')
      svg.appendChild(availDot)
      availDots.push(availDot)
    }

    // --- Hover interaction ---
    let hoveredIdx = -1

    function setHover(idx: number): void {
      if (idx === hoveredIdx) return
      clearHover()
      hoveredIdx = idx

      const pt = currentPoints[idx]
      const cx = xScale(currentPoints, pt.timestamp)

      capDots[idx].classList.add('is-hovered')
      availDots[idx].classList.add('is-hovered')

      setAttrs(ruleLine, { x1: cx, x2: cx })
      ruleLine.classList.add('is-visible')

      const rect = svg.getBoundingClientRect()
      const pxX = (cx / VB_W) * rect.width
      tooltipCap.textContent = `Cap: ${pt.capacity.toFixed(2)}`
      tooltipAvail.textContent = `Avail: ${pt.available.toFixed(2)}`
      tooltipDate.textContent = tooltipDateFmt.format(pt.timestamp)
      tooltip.style.left = `${Math.min(pxX, rect.width - 150)}px`
      tooltip.classList.remove('hidden')
    }

    function clearHover(): void {
      if (hoveredIdx >= 0) {
        capDots[hoveredIdx].classList.remove('is-hovered')
        availDots[hoveredIdx].classList.remove('is-hovered')
      }
      hoveredIdx = -1
      ruleLine.classList.remove('is-visible')
      tooltip.classList.add('hidden')
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
      setHover(closest)
    })

    hoverRect.addEventListener('mouseleave', () => {
      clearHover()
    })
  }

  // --- Range transition (fade out -> update -> fade in) ---
  function updateWithTransition(): void {
    svg.style.opacity = '0'
    setTimeout(() => {
      update()
      svg.style.opacity = '1'
    }, FADE_MS)
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
