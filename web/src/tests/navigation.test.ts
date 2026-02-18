/**
 * Tests for navigation state management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('Navigation State', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('View Mode', () => {
    it('starts in overview mode', async () => {
      const { getViewMode } = await import('../state')
      expect(getViewMode()).toBe('overview')
    })

    it('setViewModeState updates view mode', async () => {
      const { getViewMode, setViewModeState } = await import('../state')

      setViewModeState('branch', 0)
      expect(getViewMode()).toBe('branch')

      setViewModeState('twig', 0, 'branch-0-twig-0')
      expect(getViewMode()).toBe('twig')

      setViewModeState('overview')
      expect(getViewMode()).toBe('overview')
    })
  })

  describe('Branch Index', () => {
    it('starts as null in overview', async () => {
      const { getActiveBranchIndex } = await import('../state')
      expect(getActiveBranchIndex()).toBeNull()
    })

    it('sets branch index in branch view', async () => {
      const { getActiveBranchIndex, setViewModeState } = await import('../state')

      setViewModeState('branch', 3)
      expect(getActiveBranchIndex()).toBe(3)
    })

    it('preserves branch index in twig view', async () => {
      const { getActiveBranchIndex, setViewModeState } = await import('../state')

      setViewModeState('branch', 2)
      setViewModeState('twig', undefined, 'branch-2-twig-5')

      expect(getActiveBranchIndex()).toBe(2)
    })

    it('clears branch index when returning to overview', async () => {
      const { getActiveBranchIndex, setViewModeState } = await import('../state')

      setViewModeState('branch', 5)
      setViewModeState('overview')

      expect(getActiveBranchIndex()).toBeNull()
    })
  })

  describe('Twig ID', () => {
    it('starts as null', async () => {
      const { getActiveTwigId } = await import('../state')
      expect(getActiveTwigId()).toBeNull()
    })

    it('sets twig ID in twig view', async () => {
      const { getActiveTwigId, setViewModeState } = await import('../state')

      setViewModeState('twig', 0, 'branch-0-twig-3')
      expect(getActiveTwigId()).toBe('branch-0-twig-3')
    })

    it('clears twig ID when returning to branch view', async () => {
      const { getActiveTwigId, setViewModeState } = await import('../state')

      setViewModeState('twig', 0, 'branch-0-twig-3')
      setViewModeState('branch', 0)

      expect(getActiveTwigId()).toBeNull()
    })

    it('clears twig ID when returning to overview', async () => {
      const { getActiveTwigId, setViewModeState } = await import('../state')

      setViewModeState('twig', 0, 'branch-0-twig-3')
      setViewModeState('overview')

      expect(getActiveTwigId()).toBeNull()
    })
  })

  describe('Hovered Branch', () => {
    it('starts as null', async () => {
      const { getHoveredBranchIndex } = await import('../state')
      expect(getHoveredBranchIndex()).toBeNull()
    })

    it('sets hovered branch index', async () => {
      const { getHoveredBranchIndex, setHoveredBranchIndex } = await import('../state')

      setHoveredBranchIndex(4)
      expect(getHoveredBranchIndex()).toBe(4)

      setHoveredBranchIndex(null)
      expect(getHoveredBranchIndex()).toBeNull()
    })

    it('clears on view mode change', async () => {
      const { getHoveredBranchIndex, setHoveredBranchIndex, setViewModeState } = await import(
        '../state'
      )

      setHoveredBranchIndex(2)
      setViewModeState('branch', 2)

      expect(getHoveredBranchIndex()).toBeNull()
    })
  })

  describe('Hovered Twig', () => {
    it('starts as null', async () => {
      const { getHoveredTwigId } = await import('../state')
      expect(getHoveredTwigId()).toBeNull()
    })

    it('sets hovered twig ID', async () => {
      const { getHoveredTwigId, setHoveredTwigId } = await import('../state')

      setHoveredTwigId('branch-0-twig-5')
      expect(getHoveredTwigId()).toBe('branch-0-twig-5')

      setHoveredTwigId(null)
      expect(getHoveredTwigId()).toBeNull()
    })
  })

  describe('View Mode Helpers', () => {
    it('isBranchView returns true in branch view with index', async () => {
      const { isBranchView, setViewModeState } = await import('../state')

      setViewModeState('branch', 0)
      expect(isBranchView()).toBe(true)
    })

    it('isBranchView returns false in overview', async () => {
      const { isBranchView, setViewModeState } = await import('../state')

      setViewModeState('overview')
      expect(isBranchView()).toBe(false)
    })

    it('isTwigView returns true in twig view with ID', async () => {
      const { isTwigView, setViewModeState } = await import('../state')

      setViewModeState('twig', 0, 'branch-0-twig-0')
      expect(isTwigView()).toBe(true)
    })

    it('isTwigView returns false in branch view', async () => {
      const { isTwigView, setViewModeState } = await import('../state')

      setViewModeState('branch', 0)
      expect(isTwigView()).toBe(false)
    })
  })

  describe('Focused Node', () => {
    it('starts as null', async () => {
      const { getFocusedNode } = await import('../state')
      expect(getFocusedNode()).toBeNull()
    })

    it('sets focused node', async () => {
      const { getFocusedNode, setFocusedNodeState } = await import('../state')

      const mockButton = document.createElement('button') as HTMLButtonElement
      setFocusedNodeState(mockButton)

      expect(getFocusedNode()).toBe(mockButton)
    })

    it('clears focused node with null', async () => {
      const { getFocusedNode, setFocusedNodeState } = await import('../state')

      const mockButton = document.createElement('button') as HTMLButtonElement
      setFocusedNodeState(mockButton)
      setFocusedNodeState(null)

      expect(getFocusedNode()).toBeNull()
    })
  })

  describe('Active Node', () => {
    it('starts as null', async () => {
      const { getActiveNode } = await import('../state')
      expect(getActiveNode()).toBeNull()
    })

    it('sets active node', async () => {
      const { getActiveNode, setActiveNode } = await import('../state')

      const mockButton = document.createElement('button') as HTMLButtonElement
      setActiveNode(mockButton)

      expect(getActiveNode()).toBe(mockButton)
    })
  })
})
