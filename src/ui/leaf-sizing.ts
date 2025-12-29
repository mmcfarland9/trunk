export const LEAF_BASE_SIZE = 36
export const LEAF_PREVIEW_SIZE = 14

export function getLeafCollisionDiameter(element: HTMLElement): number {
  const width = element.offsetWidth || LEAF_BASE_SIZE
  const height = element.offsetHeight || LEAF_BASE_SIZE
  return Math.hypot(width, height)
}
