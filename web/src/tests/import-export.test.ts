/**
 * Tests for import/export round-trip data integrity.
 */

import { describe, it, expect } from 'vitest'
import { sanitizeSprout, sanitizeLeaf } from '../utils/validate-import'
import type { Sprout, Leaf, NodeData } from '../types'

describe('Import/Export Round-Trip', () => {
  it('should preserve complete sprout data through sanitization', () => {
    const original: Sprout = {
      id: 'sprout-abc123',
      title: 'Learn TypeScript',
      season: '3m',
      environment: 'firm',
      state: 'active',
      soilCost: 8,
      createdAt: '2024-01-15T10:30:00Z',
      plantedAt: '2024-01-16T08:00:00Z',
      leafId: 'leaf-xyz789',
      bloomWither: 'Gave up after a week',
      bloomBudding: 'Can write basic code',
      bloomFlourish: 'Built a full project',
      waterEntries: [
        { timestamp: '2024-01-17T09:00:00Z', content: 'Read chapter 1' },
        { timestamp: '2024-01-18T10:00:00Z', content: 'Practice exercises', prompt: 'What did you learn?' },
      ],
    }

    const sanitized = sanitizeSprout(original)
    expect(sanitized).not.toBeNull()

    // Core fields
    expect(sanitized?.id).toBe(original.id)
    expect(sanitized?.title).toBe(original.title)
    expect(sanitized?.season).toBe(original.season)
    expect(sanitized?.environment).toBe(original.environment)
    expect(sanitized?.state).toBe(original.state)
    expect(sanitized?.soilCost).toBe(original.soilCost)

    // Dates
    expect(sanitized?.createdAt).toBe(original.createdAt)
    expect(sanitized?.plantedAt).toBe(original.plantedAt)

    // Leaf association
    expect(sanitized?.leafId).toBe(original.leafId)

    // Bloom descriptions
    expect(sanitized?.bloomWither).toBe(original.bloomWither)
    expect(sanitized?.bloomBudding).toBe(original.bloomBudding)
    expect(sanitized?.bloomFlourish).toBe(original.bloomFlourish)

    // Water entries
    expect(sanitized?.waterEntries).toHaveLength(2)
    expect(sanitized?.waterEntries?.[0].content).toBe('Read chapter 1')
    expect(sanitized?.waterEntries?.[1].prompt).toBe('What did you learn?')
  })

  it('should preserve completed sprout with result', () => {
    const original: Sprout = {
      id: 'sprout-done',
      title: 'Completed goal',
      season: '1m',
      environment: 'fertile',
      state: 'completed',
      soilCost: 3,
      result: 4,
      createdAt: '2024-01-01T00:00:00Z',
      plantedAt: '2024-01-02T00:00:00Z',
      harvestedAt: '2024-02-02T00:00:00Z',
    }

    const sanitized = sanitizeSprout(original)
    expect(sanitized).not.toBeNull()
    expect(sanitized?.state).toBe('completed')
    expect(sanitized?.result).toBe(4)
    expect(sanitized?.harvestedAt).toBe(original.harvestedAt)
  })

  it('should preserve complete leaf data through sanitization', () => {
    const original: Leaf = {
      id: 'leaf-abc123',
      name: 'Learning Journey',
      createdAt: '2024-01-01T00:00:00Z',
    }

    const sanitized = sanitizeLeaf(original)
    expect(sanitized).not.toBeNull()
    expect(sanitized?.id).toBe(original.id)
    expect(sanitized?.name).toBe(original.name)
    expect(sanitized?.createdAt).toBe(original.createdAt)
  })

  it('should handle full node data structure', () => {
    // Simulate what gets exported
    const nodeData: NodeData = {
      label: 'Health & Fitness',
      note: 'Focus on sustainable habits',
      sprouts: [
        {
          id: 'sprout-1',
          title: 'Morning runs',
          season: '1m',
          environment: 'fertile',
          state: 'active',
          soilCost: 3,
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'sprout-2',
          title: 'Meditation',
          season: '2w',
          environment: 'fertile',
          state: 'completed',
          soilCost: 2,
          result: 5,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
      leaves: [
        {
          id: 'leaf-1',
          name: 'Fitness Journey',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
    }

    // Simulate import processing
    const sanitizedSprouts = nodeData.sprouts?.map(sanitizeSprout)
      .filter((s): s is NonNullable<typeof s> => s !== null)

    const sanitizedLeaves = nodeData.leaves?.map(sanitizeLeaf)
      .filter((l): l is NonNullable<typeof l> => l !== null)

    expect(sanitizedSprouts).toHaveLength(2)
    expect(sanitizedLeaves).toHaveLength(1)
    expect(sanitizedSprouts[0].title).toBe('Morning runs')
    expect(sanitizedSprouts[1].result).toBe(5)
    expect(sanitizedLeaves[0].name).toBe('Fitness Journey')
  })

  it('should filter invalid sprouts from array', () => {
    const mixedSprouts = [
      { id: 'valid', title: 'Good', season: '1m', environment: 'fertile', state: 'active' },
      { title: 'No ID' }, // Invalid - no id
      { id: 'also-valid', title: 'Also Good', season: '2w', environment: 'firm', state: 'active' },
    ]

    const sanitized = mixedSprouts
      .map(s => sanitizeSprout(s))
      .filter((s): s is NonNullable<typeof s> => s !== null)

    expect(sanitized).toHaveLength(2)
    expect(sanitized[0].id).toBe('valid')
    expect(sanitized[1].id).toBe('also-valid')
  })

  it('should handle JSON serialization round-trip', () => {
    const original: Sprout = {
      id: 'sprout-json',
      title: 'JSON Test',
      season: '1m',
      environment: 'fertile',
      state: 'active',
      soilCost: 3,
      createdAt: '2024-01-01T00:00:00Z',
      waterEntries: [
        { timestamp: '2024-01-02T00:00:00Z', content: 'Entry with "quotes" and <brackets>' },
      ],
    }

    // Serialize to JSON (like export)
    const json = JSON.stringify(original)

    // Parse back (like import)
    const parsed = JSON.parse(json)

    // Sanitize (like import does)
    const sanitized = sanitizeSprout(parsed)

    expect(sanitized).not.toBeNull()
    expect(sanitized?.id).toBe(original.id)
    expect(sanitized?.waterEntries?.[0].content).toBe('Entry with "quotes" and <brackets>')
  })

  it('should preserve all valid season values', () => {
    const seasons = ['2w', '1m', '3m', '6m', '1y'] as const
    seasons.forEach(season => {
      const sprout = {
        id: `sprout-${season}`,
        title: 'Test',
        season,
        environment: 'fertile' as const,
        state: 'active' as const,
      }
      const sanitized = sanitizeSprout(sprout)
      expect(sanitized?.season).toBe(season)
    })
  })

  it('should preserve all valid environment values', () => {
    const environments = ['fertile', 'firm', 'barren'] as const
    environments.forEach(environment => {
      const sprout = {
        id: `sprout-${environment}`,
        title: 'Test',
        season: '1m' as const,
        environment,
        state: 'active' as const,
      }
      const sanitized = sanitizeSprout(sprout)
      expect(sanitized?.environment).toBe(environment)
    })
  })

  it('should convert legacy states during import', () => {
    // Legacy 'draft' should become 'active'
    const draftSprout = sanitizeSprout({
      id: 'sprout-draft',
      title: 'Test',
      season: '1m',
      environment: 'fertile',
      state: 'draft',
    })
    expect(draftSprout?.state).toBe('active')

    // Legacy 'failed' should become 'completed' (showing up counts!)
    const failedSprout = sanitizeSprout({
      id: 'sprout-failed',
      title: 'Test',
      season: '1m',
      environment: 'fertile',
      state: 'failed',
      result: 2,
    })
    expect(failedSprout?.state).toBe('completed')
    expect(failedSprout?.result).toBe(2) // Result preserved

    // Current states should pass through unchanged
    const activeSprout = sanitizeSprout({
      id: 'sprout-active',
      title: 'Test',
      season: '1m',
      environment: 'fertile',
      state: 'active',
    })
    expect(activeSprout?.state).toBe('active')

    const completedSprout = sanitizeSprout({
      id: 'sprout-completed',
      title: 'Test',
      season: '1m',
      environment: 'fertile',
      state: 'completed',
      result: 5,
    })
    expect(completedSprout?.state).toBe('completed')
  })
})
