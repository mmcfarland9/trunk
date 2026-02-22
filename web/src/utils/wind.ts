/**
 * Seeded wind animation utilities shared by layout and radar chart.
 *
 * Each branch gets a deterministic speed and phase derived from its index,
 * producing varied but repeatable organic sway. Y-axis is damped for realism.
 */

// Wind amplitude and speed range
export const WIND_BRANCH_AMP = 6
export const WIND_TWIG_AMP = 10
export const WIND_PULSE = 0.04
export const WIND_MIN = 0.35
export const WIND_MAX = 0.7
export const WIND_FOCUS_BRANCH_SCALE = 0.7
export const WIND_FOCUS_TWIG_SCALE = 0.85
export const WIND_Y_DAMPING = 0.6
export const WIND_FLUTTER_SCALE = 0.18

export function seeded(seed: number, salt: number): number {
  const v = Math.sin(seed * salt) * 43758.5453
  return v - Math.floor(v)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

/**
 * Compute seeded wind offset for a branch at a given time (seconds).
 * Returns {x, y} in pixel space with Y damped to 60%.
 */
export function branchWindOffset(
  index: number,
  time: number,
  amplitude = WIND_BRANCH_AMP,
): { x: number; y: number } {
  const seed = 97 + index * 41
  const speed = lerp(WIND_MIN, WIND_MAX, seeded(seed, 13.7))
  const phase = seeded(seed, 23.1) * Math.PI * 2
  return {
    x: Math.sin(time * speed + phase) * amplitude,
    y: Math.cos(time * speed * 0.8 + phase) * amplitude * WIND_Y_DAMPING,
  }
}
