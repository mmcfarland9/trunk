/**
 * Tests for state/view-state.ts
 * Full transition cycles, boundary conditions, and state isolation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('View State Transitions', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  describe('Full transition cycle', () => {
    it('completes overview → branch → twig → leaf → back to overview', async () => {
      const { getViewMode, setViewModeState, getActiveBranchIndex, getActiveTwigId } = await import(
        '../state/view-state'
      )

      // Start in overview
      expect(getViewMode()).toBe('overview')
      expect(getActiveBranchIndex()).toBeNull()
      expect(getActiveTwigId()).toBeNull()

      // Navigate to branch
      setViewModeState('branch', 2)
      expect(getViewMode()).toBe('branch')
      expect(getActiveBranchIndex()).toBe(2)
      expect(getActiveTwigId()).toBeNull()

      // Navigate to twig
      setViewModeState('twig', 2, 'branch-2-twig-5')
      expect(getViewMode()).toBe('twig')
      expect(getActiveBranchIndex()).toBe(2)
      expect(getActiveTwigId()).toBe('branch-2-twig-5')

      // Navigate to leaf
      setViewModeState('leaf', 2, 'branch-2-twig-5')
      expect(getViewMode()).toBe('leaf')
      expect(getActiveBranchIndex()).toBe(2)
      expect(getActiveTwigId()).toBe('branch-2-twig-5')

      // Back to overview
      setViewModeState('overview')
      expect(getViewMode()).toBe('overview')
      expect(getActiveBranchIndex()).toBeNull()
      expect(getActiveTwigId()).toBeNull()
    })

    it('goes from leaf back to twig', async () => {
      const { getViewMode, setViewModeState, getActiveTwigId } = await import('../state/view-state')

      setViewModeState('branch', 1)
      setViewModeState('twig', 1, 'branch-1-twig-3')
      setViewModeState('leaf', 1, 'branch-1-twig-3')
      expect(getViewMode()).toBe('leaf')

      // Return to twig
      setViewModeState('twig', 1, 'branch-1-twig-3')
      expect(getViewMode()).toBe('twig')
      expect(getActiveTwigId()).toBe('branch-1-twig-3')
    })

    it('goes from leaf back to branch', async () => {
      const { getViewMode, setViewModeState, getActiveTwigId, getActiveBranchIndex } = await import(
        '../state/view-state'
      )

      setViewModeState('leaf', 3, 'branch-3-twig-0')
      setViewModeState('branch', 3)
      expect(getViewMode()).toBe('branch')
      expect(getActiveBranchIndex()).toBe(3)
      expect(getActiveTwigId()).toBeNull()
    })
  })

  describe('State isolation', () => {
    it('branch index does not leak when switching branches', async () => {
      const { setViewModeState, getActiveBranchIndex } = await import('../state/view-state')

      setViewModeState('branch', 5)
      expect(getActiveBranchIndex()).toBe(5)

      setViewModeState('branch', 2)
      expect(getActiveBranchIndex()).toBe(2)
    })

    it('twig ID does not persist across different branch visits', async () => {
      const { setViewModeState, getActiveTwigId, getActiveBranchIndex } = await import(
        '../state/view-state'
      )

      setViewModeState('twig', 0, 'branch-0-twig-3')
      setViewModeState('branch', 1)

      expect(getActiveBranchIndex()).toBe(1)
      expect(getActiveTwigId()).toBeNull()
    })

    it('hoveredBranchIndex clears on any view mode change', async () => {
      const { setViewModeState, setHoveredBranchIndex, getHoveredBranchIndex } = await import(
        '../state/view-state'
      )

      setHoveredBranchIndex(3)
      expect(getHoveredBranchIndex()).toBe(3)

      setViewModeState('branch', 0)
      expect(getHoveredBranchIndex()).toBeNull()
    })

    it('hoveredBranchIndex clears when entering leaf view', async () => {
      const { setViewModeState, setHoveredBranchIndex, getHoveredBranchIndex } = await import(
        '../state/view-state'
      )

      setHoveredBranchIndex(5)
      setViewModeState('leaf', 0, 'branch-0-twig-0')
      expect(getHoveredBranchIndex()).toBeNull()
    })
  })

  describe('Boundary: setViewModeState branch index', () => {
    it('accepts branch index 0', async () => {
      const { setViewModeState, getActiveBranchIndex } = await import('../state/view-state')

      setViewModeState('branch', 0)
      expect(getActiveBranchIndex()).toBe(0)
    })

    it('accepts branch index 7', async () => {
      const { setViewModeState, getActiveBranchIndex } = await import('../state/view-state')

      setViewModeState('branch', 7)
      expect(getActiveBranchIndex()).toBe(7)
    })

    it('accepts branch index 8 (no upper-bound check)', async () => {
      const { setViewModeState, getActiveBranchIndex } = await import('../state/view-state')

      setViewModeState('branch', 8)
      expect(getActiveBranchIndex()).toBe(8)
    })

    it('accepts negative branch index -1 (no lower-bound check)', async () => {
      const { setViewModeState, getActiveBranchIndex } = await import('../state/view-state')

      setViewModeState('branch', -1)
      expect(getActiveBranchIndex()).toBe(-1)
    })
  })

  describe('getViewMode after each transition', () => {
    it('returns overview initially', async () => {
      const { getViewMode } = await import('../state/view-state')
      expect(getViewMode()).toBe('overview')
    })

    it('returns branch after branch transition', async () => {
      const { getViewMode, setViewModeState } = await import('../state/view-state')

      setViewModeState('branch', 0)
      expect(getViewMode()).toBe('branch')
    })

    it('returns twig after twig transition', async () => {
      const { getViewMode, setViewModeState } = await import('../state/view-state')

      setViewModeState('twig', 0, 'branch-0-twig-0')
      expect(getViewMode()).toBe('twig')
    })

    it('returns leaf after leaf transition', async () => {
      const { getViewMode, setViewModeState } = await import('../state/view-state')

      setViewModeState('leaf', 0, 'branch-0-twig-0')
      expect(getViewMode()).toBe('leaf')
    })

    it('returns overview after returning from deep navigation', async () => {
      const { getViewMode, setViewModeState } = await import('../state/view-state')

      setViewModeState('branch', 3)
      setViewModeState('twig', 3, 'branch-3-twig-7')
      setViewModeState('leaf', 3, 'branch-3-twig-7')
      setViewModeState('overview')
      expect(getViewMode()).toBe('overview')
    })
  })

  describe('Leaf view specifics', () => {
    it('preserves branch index from prior twig when entering leaf', async () => {
      const { setViewModeState, getActiveBranchIndex } = await import('../state/view-state')

      setViewModeState('twig', 4, 'branch-4-twig-2')
      setViewModeState('leaf') // No explicit branchIndex - should keep 4
      expect(getActiveBranchIndex()).toBe(4)
    })

    it('preserves twig ID from prior twig when entering leaf without twigId', async () => {
      const { setViewModeState, getActiveTwigId } = await import('../state/view-state')

      setViewModeState('twig', 4, 'branch-4-twig-2')
      setViewModeState('leaf') // No twigId - should keep prior
      expect(getActiveTwigId()).toBe('branch-4-twig-2')
    })

    it('defaults branch index to 0 if no prior state', async () => {
      const { setViewModeState, getActiveBranchIndex } = await import('../state/view-state')

      setViewModeState('leaf') // No branchIndex, no prior state
      expect(getActiveBranchIndex()).toBe(0)
    })
  })

  describe('isBranchView and isTwigView', () => {
    it('isBranchView false in leaf view', async () => {
      const { isBranchView, setViewModeState } = await import('../state/view-state')

      setViewModeState('leaf', 0, 'branch-0-twig-0')
      expect(isBranchView()).toBe(false)
    })

    it('isTwigView false in leaf view', async () => {
      const { isTwigView, setViewModeState } = await import('../state/view-state')

      setViewModeState('leaf', 0, 'branch-0-twig-0')
      expect(isTwigView()).toBe(false)
    })

    it('isTwigView requires activeTwigId', async () => {
      const { isTwigView, setViewModeState } = await import('../state/view-state')

      setViewModeState('twig', 0) // No twigId
      expect(isTwigView()).toBe(false)
    })
  })
})
