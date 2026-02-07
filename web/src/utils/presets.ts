/**
 * Preset labels and notes for trunk tree structure.
 * These are the default values from shared constants.
 */

import constants from '../../../shared/constants.json'

const branches = constants.tree.branches

const BRANCH_PATTERN = /^branch-(\d+)$/
const TWIG_PATTERN = /^branch-(\d+)-twig-(\d+)$/

/**
 * Get the preset label for a node (trunk, branch, or twig)
 */
export function getPresetLabel(nodeId: string): string {
  if (nodeId === 'trunk') {
    return 'TRUNK'
  }

  // Branch: "branch-N"
  const branchMatch = nodeId.match(BRANCH_PATTERN)
  if (branchMatch) {
    const index = parseInt(branchMatch[1], 10)
    return branches[index]?.name || ''
  }

  // Twig: "branch-N-twig-M"
  const twigMatch = nodeId.match(TWIG_PATTERN)
  if (twigMatch) {
    const branchIndex = parseInt(twigMatch[1], 10)
    const twigIndex = parseInt(twigMatch[2], 10)
    return branches[branchIndex]?.twigs[twigIndex] || ''
  }

  return ''
}

/**
 * Get the preset note/description for a node
 */
export function getPresetNote(nodeId: string): string {
  if (nodeId === 'trunk') {
    return 'Your life map'
  }

  // Branch: "branch-N"
  const branchMatch = nodeId.match(BRANCH_PATTERN)
  if (branchMatch) {
    const index = parseInt(branchMatch[1], 10)
    return branches[index]?.description || ''
  }

  return ''
}

