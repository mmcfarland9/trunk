import { BRANCH_COUNT } from '../constants'
import { getActiveBranchIndex, getViewMode } from '../state'
import type { AppContext } from '../types'
import { drawGuideLines, GUIDE_GAP, TWIG_GAP } from './guide-lines'

// Layout constants
const TWIG_COLLISION_PAD = 8
export const TWIG_BASE_SIZE = 36
const TWIG_PREVIEW_SIZE = 14
const TWIG_MAX_SIZE = 80
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

// Exported for layout-wind.ts
export function getBase(el: HTMLElement, axis: 'x' | 'y'): number | null {
  const cached = positionCache.get(el)
  if (cached) return axis === 'x' ? cached.x : cached.y
  const v = el.dataset[axis === 'x' ? 'baseX' : 'baseY']
  if (!v) return null
  const p = parseFloat(v)
  return Number.isNaN(p) ? null : p
}

export function getTwigRadius(el: HTMLElement): number {
  const cached = twigRadiusCache.get(el)
  if (cached !== undefined) return cached
  const r = el.dataset.twigRadius
  if (r) {
    const p = parseFloat(r)
    if (!Number.isNaN(p)) return p
  }
  return Math.hypot(el.offsetWidth || TWIG_BASE_SIZE, el.offsetHeight || TWIG_BASE_SIZE) / 2
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

function getTwigCollisionDiameter(el: HTMLElement): number {
  const w = Math.min(el.offsetWidth || TWIG_BASE_SIZE, TWIG_MAX_SIZE)
  const h = Math.min(el.offsetHeight || TWIG_BASE_SIZE, TWIG_MAX_SIZE)
  return Math.hypot(w, h)
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
