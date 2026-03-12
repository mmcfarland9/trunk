import { GUIDE_ANIMATION_DURATION } from '../constants'
import { getActiveBranchIndex, getViewMode } from '../state'
import type { AppContext } from '../types'
import {
  branchWindOffset,
  clamp,
  lerp,
  seeded,
  WIND_BRANCH_AMP,
  WIND_FLUTTER_SCALE,
  WIND_FOCUS_BRANCH_SCALE,
  WIND_FOCUS_TWIG_SCALE,
  WIND_MAX,
  WIND_MIN,
  WIND_PULSE,
  WIND_TWIG_AMP,
  WIND_Y_DAMPING,
} from '../utils/wind'
import { drawGuideLines } from './guide-lines'
import { getBase, getTwigRadius, TWIG_BASE_SIZE } from './layout'

let guideAnimationId = 0
let windAnimationId = 0
let windStartTime = 0

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
