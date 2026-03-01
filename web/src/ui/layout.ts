import type { AppContext } from '../types'
import { BRANCH_COUNT, GUIDE_ANIMATION_DURATION } from '../constants'
import { getViewMode, getActiveBranchIndex, getHoveredBranchIndex } from '../state'
import {
  WIND_BRANCH_AMP,
  WIND_TWIG_AMP,
  WIND_PULSE,
  WIND_MIN,
  WIND_MAX,
  WIND_FOCUS_BRANCH_SCALE,
  WIND_FOCUS_TWIG_SCALE,
  WIND_Y_DAMPING,
  WIND_FLUTTER_SCALE,
  seeded,
  lerp,
  clamp,
  branchWindOffset,
} from '../utils/wind'

// Layout constants
const GUIDE_GAP = 8,
  TWIG_GAP = 4,
  TWIG_COLLISION_PAD = 8,
  TWIG_BASE_SIZE = 36,
  TWIG_PREVIEW_SIZE = 14,
  TWIG_MAX_SIZE = 80
const BLOOM_MIN = 0.12,
  BLOOM_MAX = 0.34,
  BLOOM_OV_MIN = 0.06,
  BLOOM_OV_MAX = 0.18,
  TWIG_RING_RATIO = 0.55
const BRANCH_ORBIT_RATIO_X = 0.42,
  BRANCH_ORBIT_MIN_X = 0.34,
  BRANCH_ORBIT_RATIO_Y = 0.34
const TWIG_SPREAD_ACTIVE = 1.8,
  TWIG_SPREAD_OVERVIEW = 1.4
const BLOOM_CAP_ACTIVE = 0.42,
  BLOOM_CAP_OVERVIEW = 0.22
const BRANCH_ANGLE_STEP = (2 * Math.PI) / BRANCH_COUNT
const CURVE_SEGMENTS = 12
const PREVIEW_FADE = 500,
  PREVIEW_OPACITY_MAX = 0.4

let guideAnimationId = 0,
  windAnimationId = 0,
  windStartTime = 0,
  previewStartTime = 0
let lastHoveredBranch: number | null = null

// Position cache to avoid parseFloat in animation frames
const positionCache = new WeakMap<HTMLElement, { x: number; y: number }>()
const twigRadiusCache = new WeakMap<HTMLElement, number>()

export function positionNodes(ctx: AppContext): void {
  const { canvas } = ctx.elements
  const { branchGroups } = ctx
  const width = canvas.clientWidth,
    height = canvas.clientHeight
  if (!width || !height) return

  const base = Math.min(width, height)
  const centerX = width / 2,
    centerY = height / 2
  const viewMode = getViewMode(),
    activeBranchIndex = getActiveBranchIndex()
  const isBranchView = viewMode === 'branch' && activeBranchIndex !== null
  const isTwigView = viewMode === 'twig' && activeBranchIndex !== null
  const isFocusedBranch = isBranchView || isTwigView
  const radiusX = Math.max(base * BRANCH_ORBIT_RATIO_X, width * BRANCH_ORBIT_MIN_X),
    radiusY = height * BRANCH_ORBIT_RATIO_Y
  let activeBranchX = centerX,
    activeBranchY = centerY

  branchGroups.forEach((group, index) => {
    const angle = BRANCH_ANGLE_STEP * index - Math.PI / 2
    const branchX = centerX + Math.cos(angle) * radiusX
    const branchY = centerY + Math.sin(angle) * radiusY
    setBasePosition(group.group, branchX, branchY)
    if (index === activeBranchIndex) {
      activeBranchX = branchX
      activeBranchY = branchY
    }

    const mainRadius = Math.max(group.branch.offsetWidth, group.branch.offsetHeight) / 2
    const isActive = isFocusedBranch && index === activeBranchIndex
    const twigSizes = group.twigs.map((twig) =>
      isActive ? getTwigCollisionDiameter(twig) + TWIG_COLLISION_PAD * 2 : TWIG_PREVIEW_SIZE,
    )
    const maxTwigRadius = twigSizes.length ? Math.max(...twigSizes) / 2 : TWIG_BASE_SIZE / 2
    const [minRatio, maxRatio] = isActive ? [BLOOM_MIN, BLOOM_MAX] : [BLOOM_OV_MIN, BLOOM_OV_MAX]
    const minRadius = Math.max(mainRadius + maxTwigRadius + GUIDE_GAP, base * minRatio)
    const maxRadius = Math.min(
      Math.max(
        minRadius + maxTwigRadius * (isActive ? TWIG_SPREAD_ACTIVE : TWIG_SPREAD_OVERVIEW),
        base * maxRatio,
      ),
      base * (isActive ? BLOOM_CAP_ACTIVE : BLOOM_CAP_OVERVIEW), // Hard cap to keep twigs in bounds
    )
    const offsets = buildRadialOffsets(group.twigs.length, minRadius, maxRadius, twigSizes, angle)

    group.twigs.forEach((twig, i) => {
      setBasePosition(twig, offsets[i]?.x ?? 0, offsets[i]?.y ?? 0)
      if (isActive) {
        const r = twigSizes[i] / 2
        twig.dataset.twigRadius = `${r}`
        twigRadiusCache.set(twig, r)
      } else {
        delete twig.dataset.twigRadius
        twigRadiusCache.delete(twig)
      }
    })
  })

  setCameraTransform(
    ctx,
    isFocusedBranch ? centerX - activeBranchX : 0,
    isFocusedBranch ? centerY - activeBranchY : 0,
  )
  drawGuideLines(ctx)
}

export function animateGuideLines(ctx: AppContext, duration = GUIDE_ANIMATION_DURATION): void {
  if (windAnimationId) {
    drawGuideLines(ctx)
    return
  }
  if (guideAnimationId) cancelAnimationFrame(guideAnimationId)
  const start = performance.now()
  const tick = () => {
    drawGuideLines(ctx)
    guideAnimationId = performance.now() - start < duration ? requestAnimationFrame(tick) : 0
  }
  guideAnimationId = requestAnimationFrame(tick)
}

export function startWind(ctx: AppContext): void {
  if (windAnimationId) return
  windStartTime = performance.now()
  const tick = (time: number) => {
    applyWind(ctx, time)
    drawGuideLines(ctx)
    windAnimationId = requestAnimationFrame(tick)
  }
  windAnimationId = requestAnimationFrame(tick)
}

export function stopWind(): void {
  if (windAnimationId) {
    cancelAnimationFrame(windAnimationId)
    windAnimationId = 0
  }
}

// Cached guide line colors resolved from CSS custom properties
let guideColors: { trunk: string; branch: string; twig: string } | null = null

function resolveGuideColors(): { trunk: string; branch: string; twig: string } {
  if (guideColors) return guideColors
  const style = getComputedStyle(document.documentElement)
  const wood = style.getPropertyValue('--wood').trim() || '#8B7355'
  const inkFaint = style.getPropertyValue('--ink-faint').trim() || '#999'
  const twigColor = style.getPropertyValue('--twig').trim() || '#6B8E23'
  guideColors = { trunk: wood, branch: inkFaint, twig: twigColor }
  return guideColors
}

const VARIANT_ALPHA: Record<string, number> = { trunk: 0.6, branch: 0.5, twig: 0.4 }
const VARIANT_LINE_WIDTH: Record<string, number> = { trunk: 1.5, branch: 1.0, twig: 0.8 }
const BEZIER_OFFSET: Record<string, number> = { trunk: 0.1, branch: 0.1, twig: 0.05 }

function drawGuideLines(ctx: AppContext): void {
  const { canvas, trunk, guideLayer } = ctx.elements
  const { branchGroups } = ctx

  // M1: Per-frame rect cache to avoid repeated getBoundingClientRect calls
  const rectCache = new Map<Element, DOMRect>()
  const getCachedRect = (el: Element): DOMRect => {
    let r = rectCache.get(el)
    if (!r) {
      r = el.getBoundingClientRect()
      rectCache.set(el, r)
    }
    return r
  }

  const rect = getCachedRect(canvas)
  if (!rect.width || !rect.height) return

  const parent = guideLayer.parentElement
  const parentRect = parent ? getCachedRect(parent) : undefined
  guideLayer.style.left = `${parentRect ? rect.left - parentRect.left : rect.left}px`
  guideLayer.style.top = `${parentRect ? rect.top - parentRect.top : rect.top}px`
  guideLayer.style.width = `${rect.width}px`
  guideLayer.style.height = `${rect.height}px`

  const dpr = window.devicePixelRatio || 1
  const w = Math.round(rect.width * dpr)
  const h = Math.round(rect.height * dpr)
  if (guideLayer.width !== w) guideLayer.width = w
  if (guideLayer.height !== h) guideLayer.height = h

  const c2d = guideLayer.getContext('2d')
  if (!c2d) return
  c2d.setTransform(dpr, 0, 0, dpr, 0, 0)
  c2d.clearRect(0, 0, rect.width, rect.height)

  const viewMode = getViewMode(),
    activeBranchIndex = getActiveBranchIndex(),
    hoveredBranchIndex = getHoveredBranchIndex()

  // Don't draw guide lines in twig view - everything is fading out
  if (viewMode === 'twig') return

  const colors = resolveGuideColors()
  const trunkRect = getCachedRect(trunk)
  const trunkCenter = getCenterPoint(trunkRect, rect),
    trunkRadius = trunkRect.width / 2

  if (viewMode === 'branch' && activeBranchIndex !== null) {
    const bg = branchGroups[activeBranchIndex]
    if (bg) {
      const mainRect = getCachedRect(bg.branch)
      const mainCenter = getCenterPoint(mainRect, rect),
        mainRadius = Math.max(mainRect.width, mainRect.height) / 2
      drawLineBetween(
        c2d,
        colors,
        trunkCenter,
        trunkRadius,
        mainCenter,
        mainRadius,
        'trunk',
        GUIDE_GAP,
        undefined,
        activeBranchIndex,
      )
      bg.twigs.forEach((twig, ti) => {
        const tr = getCachedRect(twig)
        drawLineBetween(
          c2d,
          colors,
          mainCenter,
          mainRadius,
          getCenterPoint(tr, rect),
          Math.max(tr.width, tr.height) / 2,
          'twig',
          TWIG_GAP,
          undefined,
          ti,
        )
      })
    }
  } else {
    const trunkHovered = trunk.matches(':hover')
    branchGroups.forEach((bg, idx) => {
      const mr = getCachedRect(bg.branch)
      const branchAlpha = trunkHovered
        ? Math.min((VARIANT_ALPHA['branch'] ?? 0.5) * 1.4, 0.9)
        : hoveredBranchIndex !== null
          ? idx === hoveredBranchIndex
            ? undefined
            : (VARIANT_ALPHA['branch'] ?? 0.5) * 0.3
          : undefined
      drawLineBetween(
        c2d,
        colors,
        trunkCenter,
        trunkRadius,
        getCenterPoint(mr, rect),
        Math.max(mr.width, mr.height) / 2,
        'branch',
        GUIDE_GAP,
        branchAlpha,
        idx,
      )
    })
    if (hoveredBranchIndex !== null) {
      if (lastHoveredBranch !== hoveredBranchIndex) {
        previewStartTime = performance.now()
        lastHoveredBranch = hoveredBranchIndex
      }
      const opacity =
        PREVIEW_OPACITY_MAX * Math.min((performance.now() - previewStartTime) / PREVIEW_FADE, 1)
      const bg = branchGroups[hoveredBranchIndex]
      if (bg) {
        const mr = getCachedRect(bg.branch)
        const mc = getCenterPoint(mr, rect),
          mrad = Math.max(mr.width, mr.height) / 2
        bg.twigs.forEach((twig, ti) => {
          const tr = getCachedRect(twig)
          drawLineBetween(
            c2d,
            colors,
            mc,
            mrad,
            getCenterPoint(tr, rect),
            Math.max(tr.width, tr.height) / 2,
            'twig',
            TWIG_GAP,
            opacity,
            ti,
          )
        })
      }
    } else {
      lastHoveredBranch = null
    }
  }
}

function applyWind(ctx: AppContext, timestamp: number): void {
  const { branchGroups } = ctx
  const viewMode = getViewMode(),
    activeBranchIndex = getActiveBranchIndex()
  const isFocusedBranch =
    (viewMode === 'branch' || viewMode === 'twig') && activeBranchIndex !== null
  const time = (timestamp - windStartTime) / 1000
  const bAmp = WIND_BRANCH_AMP * (isFocusedBranch ? WIND_FOCUS_BRANCH_SCALE : 1)
  const tAmp = WIND_TWIG_AMP * (isFocusedBranch ? WIND_FOCUS_TWIG_SCALE : 1)
  const pulse = WIND_PULSE * (isFocusedBranch ? WIND_FOCUS_TWIG_SCALE : 1)

  const branchPositions: Array<{ x: number; y: number } | undefined> = []

  branchGroups.forEach((bg, idx) => {
    if (isFocusedBranch && idx !== activeBranchIndex) return
    const wind = branchWindOffset(idx, time, bAmp)
    const bx = getBase(bg.group, 'x'),
      by = getBase(bg.group, 'y')
    if (bx !== null && by !== null) {
      const animX = bx + wind.x
      const animY = by + wind.y
      bg.group.style.left = `${animX}px`
      bg.group.style.top = `${animY}px`
      branchPositions[idx] = { x: animX, y: animY }
    }
    bg.twigs.forEach((twig) => {
      const x = getBase(twig, 'x'),
        y = getBase(twig, 'y')
      if (x === null || y === null) return
      const ti = Number(twig.dataset.twigIndex || '0')
      const tr = getTwigRadius(twig)
      const scale = clamp(1 - (tr - TWIG_BASE_SIZE / 2) / (TWIG_BASE_SIZE * 1.6), 0.5, 1)
      const s = 131 + idx * 71 + ti * 17
      const sp = lerp(WIND_MIN, WIND_MAX, seeded(s, 17.9))
      const ph = seeded(s, 29.3) * Math.PI * 2
      const amp = tAmp * scale * (0.7 + seeded(s, 41.7) * 0.6)
      const p = 1 + Math.sin(time * sp * 0.5 + ph) * pulse * scale
      const fl = Math.sin(time * sp * 2.2 + ph) * amp * WIND_FLUTTER_SCALE
      twig.style.left = `${x * p + Math.sin(time * sp + ph) * amp + fl}px`
      twig.style.top = `${y * p + Math.cos(time * sp * 0.9 + ph) * amp * WIND_Y_DAMPING - fl}px`
    })
  })

  // Radar vertices are derived from animated branch positions (overview only)
  if (!isFocusedBranch) {
    const { canvas } = ctx.elements
    const center = { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 }
    ctx.radarTick?.(branchPositions, center)
  }
}

// Helpers
function drawLineBetween(
  c2d: CanvasRenderingContext2D,
  colors: { trunk: string; branch: string; twig: string },
  p1: { x: number; y: number },
  r1: number,
  p2: { x: number; y: number },
  r2: number,
  variant: 'branch' | 'twig' | 'trunk',
  gap2 = GUIDE_GAP,
  opacity?: number,
  curveIndex = 0,
): void {
  const dx = p2.x - p1.x,
    dy = p2.y - p1.y,
    dist = Math.hypot(dx, dy)
  if (!dist) return
  const ux = dx / dist,
    uy = dy / dist

  const sx = p1.x + ux * (r1 + GUIDE_GAP),
    sy = p1.y + uy * (r1 + GUIDE_GAP)
  const ex = p2.x - ux * (r2 + gap2),
    ey = p2.y - uy * (r2 + gap2)

  // Bezier control point: perpendicular offset at midpoint
  const mx = (sx + ex) / 2,
    my = (sy + ey) / 2
  const segDist = Math.hypot(ex - sx, ey - sy)
  const offset = segDist * (BEZIER_OFFSET[variant] ?? 0.05)
  const sign = curveIndex % 2 === 0 ? 1 : -1
  const cpx = mx + -uy * offset * sign,
    cpy = my + ux * offset * sign

  drawCurveLine(c2d, colors, sx, sy, cpx, cpy, ex, ey, variant, opacity)
}

function drawCurveLine(
  c2d: CanvasRenderingContext2D,
  colors: { trunk: string; branch: string; twig: string },
  x1: number,
  y1: number,
  cpx: number,
  cpy: number,
  x2: number,
  y2: number,
  variant: 'branch' | 'twig' | 'trunk',
  opacity?: number,
): void {
  const alpha = opacity ?? VARIANT_ALPHA[variant] ?? 0.5
  const baseWidth = VARIANT_LINE_WIDTH[variant] ?? 1.0
  const startW = baseWidth * 1.3
  const endW = baseWidth * 0.7

  c2d.lineCap = 'round'
  c2d.strokeStyle = colors[variant]

  // Shadow pass for trunk lines (depth effect)
  if (variant === 'trunk') {
    c2d.lineWidth = startW + 1.5
    c2d.globalAlpha = alpha * 0.12
    c2d.beginPath()
    c2d.moveTo(x1, y1)
    c2d.quadraticCurveTo(cpx, cpy, x2, y2)
    c2d.stroke()
  }

  // Segmented drawing: taper width + edge-bright opacity along the curve
  let prevX = x1,
    prevY = y1
  for (let i = 1; i <= CURVE_SEGMENTS; i++) {
    const t = i / CURVE_SEGMENTS
    const tMid = (i - 0.5) / CURVE_SEGMENTS

    // Quadratic bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
    const it = 1 - t
    const px = it * it * x1 + 2 * it * t * cpx + t * t * x2
    const py = it * it * y1 + 2 * it * t * cpy + t * t * y2

    // Taper width: thick at source, thin at target
    c2d.lineWidth = startW + (endW - startW) * tMid

    // Opacity: brighter near endpoints, slightly dimmer in the middle
    const edgeBrightness = 1 - Math.sin(tMid * Math.PI) * 0.25
    c2d.globalAlpha = alpha * edgeBrightness

    c2d.beginPath()
    c2d.moveTo(prevX, prevY)
    c2d.lineTo(px, py)
    c2d.stroke()

    prevX = px
    prevY = py
  }

  c2d.globalAlpha = 1
}

function getCenterPoint(r: DOMRect, canvas: DOMRect): { x: number; y: number } {
  return { x: r.left - canvas.left + r.width / 2, y: r.top - canvas.top + r.height / 2 }
}

function setBasePosition(el: HTMLElement, x: number, y: number): void {
  el.style.left = `${x}px`
  el.style.top = `${y}px`
  el.dataset.baseX = `${x}`
  el.dataset.baseY = `${y}`
  positionCache.set(el, { x, y })
}

function setCameraTransform(ctx: AppContext, x: number, y: number): void {
  ctx.elements.canvas.style.setProperty('--camera-x', `${x}px`)
  ctx.elements.canvas.style.setProperty('--camera-y', `${y}px`)
}

function getBase(el: HTMLElement, axis: 'x' | 'y'): number | null {
  const cached = positionCache.get(el)
  if (cached) return axis === 'x' ? cached.x : cached.y
  const v = el.dataset[axis === 'x' ? 'baseX' : 'baseY']
  if (!v) return null
  const p = parseFloat(v)
  return Number.isNaN(p) ? null : p
}

function getTwigCollisionDiameter(el: HTMLElement): number {
  const w = Math.min(el.offsetWidth || TWIG_BASE_SIZE, TWIG_MAX_SIZE)
  const h = Math.min(el.offsetHeight || TWIG_BASE_SIZE, TWIG_MAX_SIZE)
  return Math.hypot(w, h)
}

function getTwigRadius(el: HTMLElement): number {
  const cached = twigRadiusCache.get(el)
  if (cached !== undefined) return cached
  const r = el.dataset.twigRadius
  if (r) {
    const p = parseFloat(r)
    if (!Number.isNaN(p)) return p
  }
  return Math.hypot(el.offsetWidth || TWIG_BASE_SIZE, el.offsetHeight || TWIG_BASE_SIZE) / 2
}

function buildRadialOffsets(
  count: number,
  minR: number,
  maxR: number,
  sizes: number[],
  angle: number,
): Array<{ x: number; y: number }> {
  if (!count) return []
  const radii = sizes.map((s) => s / 2),
    step = (Math.PI * 2) / count
  const safe = getSafeRadius(radii, step)
  const ring = Math.max(minR + (maxR - minR) * TWIG_RING_RATIO, safe, minR)
  return Array.from({ length: count }, (_, i) => ({
    x: Math.cos(step * i + angle) * ring,
    y: Math.sin(step * i + angle) * ring,
  }))
}

function getSafeRadius(radii: number[], step: number): number {
  if (radii.length < 2) return 0
  const denom = 2 * Math.sin(step / 2)
  if (!denom) return 0
  return Math.max(...radii.map((r, i) => (r + radii[(i + 1) % radii.length] + TWIG_GAP) / denom))
}
