/**
 * Twig ID parsing utility.
 * Extracts branch and twig indices from "branch-N-twig-M" format.
 */

export function parseTwigId(twigId: string): { branchIndex: number; twigIndex: number } | null {
  const match = twigId.match(/^branch-(\d+)-twig-(\d+)$/)
  if (!match) return null
  return {
    branchIndex: parseInt(match[1], 10),
    twigIndex: parseInt(match[2], 10),
  }
}
