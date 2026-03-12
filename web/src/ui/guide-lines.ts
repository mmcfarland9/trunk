import { getActiveBranchIndex, getHoveredBranchIndex, getViewMode } from '../state'
import type { AppContext } from '../types'

// Gap constants shared with layout.ts for positioning calculations
export const GUIDE_GAP = 8
export const TWIG_GAP = 4

const TWIG_LINE_SPACING = 8,
  BRANCH_LINE_SPACING = 12
const PREVIEW_FADE = 500,
  PREVIEW_OPACITY_MAX = 0.4

// Cached guide line colors resolved from CSS custom properties
let guideColors: { trunk: string; branch: string; twig: string } | null = null
let lastHoveredBranch: number | null = null
let previewStartTime = 0

const VARIANT_ALPHA: Record<string, number> = { trunk: 0.6, branch: 0.5, twig: 0.4 }

function resolveGuideColors(): { trunk: string; branch: string; twig: string } {
  if (guideColors) return guideColors
  const style = getComputedStyle(document.documentElement)
  const wood = style.getPropertyValue('--wood').trim() || '#8B7355'
  const inkFaint = style.getPropertyValue('--ink-faint').trim() || '#999'
  const twigColor = style.getPropertyValue('--twig').trim() || '#6B8E23'
  guideColors = { trunk: wood, branch: inkFaint, twig: twigColor }
  return guideColors
}

export function drawGuideLines(ctx: AppContext): void {
  const { canvas, trunk, guideLayer } = ctx.elements
  const { branchGroups } = ctx

  // Per-frame rect cache to avoid repeated getBoundingClientRect calls
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
      drawLineBetween(c2d, colors, trunkCenter, trunkRadius, mainCenter, mainRadius, 'trunk')
      bg.twigs.forEach((twig) => {
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
        )
      })
    }
  } else {
    branchGroups.forEach((bg) => {
      const mr = getCachedRect(bg.branch)
      drawLineBetween(
        c2d,
        colors,
        trunkCenter,
        trunkRadius,
        getCenterPoint(mr, rect),
        Math.max(mr.width, mr.height) / 2,
        'branch',
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
        bg.twigs.forEach((twig) => {
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
          )
        })
      }
    } else {
      lastHoveredBranch = null
    }
  }
}

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
): void {
  const dx = p2.x - p1.x,
    dy = p2.y - p1.y,
    dist = Math.hypot(dx, dy)
  if (!dist) return
  const ux = dx / dist,
    uy = dy / dist
  drawDotLine(
    c2d,
    colors,
    p1.x + ux * (r1 + GUIDE_GAP),
    p1.y + uy * (r1 + GUIDE_GAP),
    p2.x - ux * (r2 + gap2),
    p2.y - uy * (r2 + gap2),
    variant,
    opacity,
  )
}

const DOT_RADIUS = 1.5

function drawDotLine(
  c2d: CanvasRenderingContext2D,
  colors: { trunk: string; branch: string; twig: string },
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  variant: 'branch' | 'twig' | 'trunk',
  opacity?: number,
): void {
  const dx = x2 - x1,
    dy = y2 - y1,
    dist = Math.hypot(dx, dy)
  const spacing = variant === 'twig' ? TWIG_LINE_SPACING : BRANCH_LINE_SPACING,
    n = Math.max(1, Math.floor(dist / spacing))
  const alpha = opacity ?? VARIANT_ALPHA[variant] ?? 0.5
  c2d.globalAlpha = alpha
  c2d.fillStyle = colors[variant]
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0.5
    c2d.beginPath()
    c2d.arc(x1 + dx * t, y1 + dy * t, DOT_RADIUS, 0, Math.PI * 2)
    c2d.fill()
  }
  c2d.globalAlpha = 1
}

function getCenterPoint(r: DOMRect, canvas: DOMRect): { x: number; y: number } {
  return { x: r.left - canvas.left + r.width / 2, y: r.top - canvas.top + r.height / 2 }
}
