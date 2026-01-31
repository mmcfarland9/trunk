/**
 * Tests for state persistence and loading.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('State Persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('loadState', () => {
    it('loads from localStorage when data exists', async () => {
      // Pre-populate localStorage with valid state
      const testState = {
        _version: 2,
        nodes: {
          'trunk': { label: 'My Life', note: 'Test note' }
        }
      }
      localStorage.setItem('trunk-notes-v1', JSON.stringify(testState))

      const { nodeState } = await import('../state')

      expect(nodeState['trunk']).toBeDefined()
      expect(nodeState['trunk'].label).toBe('My Life')
    })

    it('falls back to preset when localStorage is empty', async () => {
      const { getPresetLabel } = await import('../state')

      // Should have preset labels loaded
      const trunkLabel = getPresetLabel('trunk')
      expect(trunkLabel).toBeDefined()
    })

    it('runs migrations on old version data', async () => {
      // Pre-populate with version 1 data that needs migration
      const oldState = {
        _version: 1,
        nodes: {
          'branch-0-twig-0': {
            label: 'Test',
            note: '',
            sprouts: [
              {
                id: 'sprout-1',
                title: 'Old Goal',
                season: '1w', // Old season that should be migrated to 2w
                environment: 'fertile',
                state: 'active',
                soilCost: 2
              }
            ]
          }
        }
      }
      localStorage.setItem('trunk-notes-v1', JSON.stringify(oldState))

      const { nodeState } = await import('../state')

      // Season should be migrated from 1w to 2w
      const twig = nodeState['branch-0-twig-0']
      expect(twig?.sprouts?.[0]?.season).toBe('2w')
    })
  })

  describe('saveState', () => {
    it('writes to localStorage', async () => {
      const { nodeState, saveState } = await import('../state')

      // Modify state
      nodeState['test-node'] = { label: 'Test', note: 'Note' }

      saveState()

      const stored = localStorage.getItem('trunk-notes-v1')
      expect(stored).not.toBeNull()
      const parsed = JSON.parse(stored!)
      expect(parsed.nodes['test-node']).toBeDefined()
    })

    it('includes version number', async () => {
      const { saveState } = await import('../state')

      saveState()

      const stored = localStorage.getItem('trunk-notes-v1')
      const parsed = JSON.parse(stored!)
      expect(parsed._version).toBeDefined()
      expect(parsed._version).toBeGreaterThanOrEqual(1)
    })

    it('includes sunLog', async () => {
      const { sunLog, saveState } = await import('../state')

      sunLog.push({
        timestamp: new Date().toISOString(),
        content: 'Test reflection',
        prompt: 'Test prompt',
        context: { twigId: 'branch-0-twig-0', twigLabel: 'Test' }
      })

      saveState()

      const stored = localStorage.getItem('trunk-notes-v1')
      const parsed = JSON.parse(stored!)
      expect(parsed.sunLog).toBeDefined()
      expect(parsed.sunLog.length).toBe(1)
    })

    it('includes soilLog', async () => {
      const { saveState, addSoilEntry } = await import('../state')

      addSoilEntry(5, 'test', 'Test context')

      saveState()

      const stored = localStorage.getItem('trunk-notes-v1')
      const parsed = JSON.parse(stored!)
      expect(parsed.soilLog).toBeDefined()
      expect(parsed.soilLog.length).toBeGreaterThan(0)
    })
  })

  describe('clearState', () => {
    it('removes all node data', async () => {
      const { nodeState, clearState } = await import('../state')

      // Add some data
      nodeState['test'] = { label: 'Test', note: '' }

      clearState()

      expect(Object.keys(nodeState).length).toBe(0)
    })

    it('removes from localStorage', async () => {
      const { saveState, clearState } = await import('../state')

      saveState()
      expect(localStorage.getItem('trunk-notes-v1')).not.toBeNull()

      clearState()
      expect(localStorage.getItem('trunk-notes-v1')).toBeNull()
    })
  })

  describe('getPresetLabel', () => {
    it('returns preset label for known node', async () => {
      const { getPresetLabel } = await import('../state')

      // Trunk should have a preset label
      const label = getPresetLabel('trunk')
      expect(typeof label).toBe('string')
    })

    it('returns empty string for unknown node', async () => {
      const { getPresetLabel } = await import('../state')

      const label = getPresetLabel('nonexistent-node-xyz')
      expect(label).toBe('')
    })
  })

  describe('getPresetNote', () => {
    it('returns preset note for known node', async () => {
      const { getPresetNote } = await import('../state')

      // This may be empty string depending on preset data
      const note = getPresetNote('trunk')
      expect(typeof note).toBe('string')
    })

    it('returns empty string for unknown node', async () => {
      const { getPresetNote } = await import('../state')

      const note = getPresetNote('nonexistent-node-xyz')
      expect(note).toBe('')
    })
  })

  describe('hasNodeData', () => {
    it('returns true when state has data', async () => {
      const { hasNodeData, nodeState } = await import('../state')

      nodeState['test'] = { label: 'Test', note: '' }

      expect(hasNodeData()).toBe(true)
    })
  })

  describe('deleteNodeData', () => {
    it('removes specific node from state', async () => {
      const { deleteNodeData, nodeState } = await import('../state')

      nodeState['test-node'] = { label: 'Test', note: '' }
      expect(nodeState['test-node']).toBeDefined()

      deleteNodeData('test-node')

      expect(nodeState['test-node']).toBeUndefined()
    })

    it('does not affect other nodes', async () => {
      const { deleteNodeData, nodeState } = await import('../state')

      nodeState['keep-node'] = { label: 'Keep', note: '' }
      nodeState['delete-node'] = { label: 'Delete', note: '' }

      deleteNodeData('delete-node')

      expect(nodeState['keep-node']).toBeDefined()
    })
  })
})
