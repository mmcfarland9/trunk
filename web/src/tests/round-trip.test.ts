/**
 * Round-trip tests: export → import preserves 100% of state.
 */

import { describe, it, expect } from 'vitest'
import { migrateToEvents } from '../events/migrate'
import { rebuildFromEvents, validateRebuild } from '../events/rebuild'
import type { NodeData, SunEntry } from '../types'

describe('Round-trip: Export → Import', () => {
  it('should preserve active sprout with water entries', () => {
    const originalNodes: Record<string, NodeData> = {
      'branch-0-twig-0': {
        label: 'Movement',
        note: 'My fitness journey',
        sprouts: [{
          id: 'sprout-1',
          title: 'Run 3x per week',
          season: '1m',
          environment: 'firm',
          state: 'active',
          soilCost: 5,
          createdAt: '2026-01-01T10:00:00Z',
          plantedAt: '2026-01-01T10:00:00Z',
          waterEntries: [
            { timestamp: '2026-01-02T09:00:00Z', content: 'Ran 2 miles' },
            { timestamp: '2026-01-03T09:00:00Z', content: 'Ran 3 miles', prompt: 'How did it go?' },
          ],
        }],
      },
    }

    // Export: convert to events
    const events = migrateToEvents(originalNodes, [])

    // Import: rebuild from events
    const circles = {
      'branch-0-twig-0': { label: 'Movement', note: 'My fitness journey' },
    }
    const rebuilt = rebuildFromEvents(events, circles)

    // Verify sprout preserved
    const sprout = rebuilt.nodes['branch-0-twig-0']?.sprouts?.[0]
    expect(sprout).toBeDefined()
    expect(sprout!.id).toBe('sprout-1')
    expect(sprout!.title).toBe('Run 3x per week')
    expect(sprout!.season).toBe('1m')
    expect(sprout!.environment).toBe('firm')
    expect(sprout!.state).toBe('active')
    expect(sprout!.soilCost).toBe(5)

    // Verify water entries preserved
    expect(sprout!.waterEntries).toHaveLength(2)
    expect(sprout!.waterEntries![0].content).toBe('Ran 2 miles')
    expect(sprout!.waterEntries![1].content).toBe('Ran 3 miles')
    expect(sprout!.waterEntries![1].prompt).toBe('How did it go?')

    // Verify labels/notes preserved
    expect(rebuilt.nodes['branch-0-twig-0'].label).toBe('Movement')
    expect(rebuilt.nodes['branch-0-twig-0'].note).toBe('My fitness journey')
  })

  it('should preserve completed sprout with result and reflection', () => {
    const originalNodes: Record<string, NodeData> = {
      'branch-0-twig-0': {
        label: 'Learning',
        note: '',
        sprouts: [{
          id: 'sprout-1',
          title: 'Learn TypeScript',
          season: '2w',
          environment: 'fertile',
          state: 'completed',
          soilCost: 2,
          result: 4,
          reflection: 'Really enjoyed it!',
          createdAt: '2026-01-01T10:00:00Z',
          plantedAt: '2026-01-01T10:00:00Z',
          harvestedAt: '2026-01-15T10:00:00Z',
        }],
      },
    }

    const events = migrateToEvents(originalNodes, [])
    const circles = { 'branch-0-twig-0': { label: 'Learning', note: '' } }
    const rebuilt = rebuildFromEvents(events, circles)

    const sprout = rebuilt.nodes['branch-0-twig-0']?.sprouts?.[0]
    expect(sprout!.state).toBe('completed')
    expect(sprout!.result).toBe(4)
    expect(sprout!.reflection).toBe('Really enjoyed it!')
  })

  it('should preserve leaves', () => {
    const originalNodes: Record<string, NodeData> = {
      'branch-0-twig-0': {
        label: 'Test',
        note: '',
        leaves: [
          { id: 'leaf-1', name: 'Fitness Journey', createdAt: '2026-01-01T10:00:00Z' },
          { id: 'leaf-2', name: 'Learning Journey', createdAt: '2026-01-02T10:00:00Z' },
        ],
      },
    }

    const events = migrateToEvents(originalNodes, [])
    const circles = { 'branch-0-twig-0': { label: 'Test', note: '' } }
    const rebuilt = rebuildFromEvents(events, circles)

    expect(rebuilt.nodes['branch-0-twig-0'].leaves).toHaveLength(2)
    expect(rebuilt.nodes['branch-0-twig-0'].leaves![0].name).toBe('Fitness Journey')
    expect(rebuilt.nodes['branch-0-twig-0'].leaves![1].name).toBe('Learning Journey')
  })

  it('should preserve sun entries', () => {
    const sunLog: SunEntry[] = [
      {
        timestamp: '2026-01-15T10:00:00Z',
        content: 'Movement is foundational',
        prompt: 'What does this mean to you?',
        context: { twigId: 'branch-0-twig-0', twigLabel: 'Movement' },
      },
      {
        timestamp: '2026-01-22T10:00:00Z',
        content: 'Consistency matters',
        context: { twigId: 'branch-0-twig-1', twigLabel: 'Nutrition' },
      },
    ]

    const events = migrateToEvents({}, sunLog)
    const rebuilt = rebuildFromEvents(events, {})

    expect(rebuilt.sunLog).toHaveLength(2)
    expect(rebuilt.sunLog[0].content).toBe('Movement is foundational')
    expect(rebuilt.sunLog[0].prompt).toBe('What does this mean to you?')
    expect(rebuilt.sunLog[0].context.twigId).toBe('branch-0-twig-0')
    expect(rebuilt.sunLog[1].content).toBe('Consistency matters')
  })

  it('should preserve bloom fields', () => {
    const originalNodes: Record<string, NodeData> = {
      'branch-0-twig-0': {
        label: 'Test',
        note: '',
        sprouts: [{
          id: 'sprout-1',
          title: 'Run regularly',
          season: '1m',
          environment: 'firm',
          state: 'active',
          soilCost: 5,
          createdAt: '2026-01-01T10:00:00Z',
          plantedAt: '2026-01-01T10:00:00Z',
          bloomWither: 'Gave up completely',
          bloomBudding: 'Running 1-2x per week',
          bloomFlourish: 'Running 3x+ per week',
        }],
      },
    }

    const events = migrateToEvents(originalNodes, [])
    const circles = { 'branch-0-twig-0': { label: 'Test', note: '' } }
    const rebuilt = rebuildFromEvents(events, circles)

    const sprout = rebuilt.nodes['branch-0-twig-0']?.sprouts?.[0]
    expect(sprout!.bloomWither).toBe('Gave up completely')
    expect(sprout!.bloomBudding).toBe('Running 1-2x per week')
    expect(sprout!.bloomFlourish).toBe('Running 3x+ per week')
  })

  it('should preserve sprout-leaf association', () => {
    const originalNodes: Record<string, NodeData> = {
      'branch-0-twig-0': {
        label: 'Test',
        note: '',
        sprouts: [{
          id: 'sprout-1',
          title: 'First sprint',
          season: '2w',
          environment: 'fertile',
          state: 'active',
          soilCost: 2,
          createdAt: '2026-01-01T10:00:00Z',
          plantedAt: '2026-01-01T10:00:00Z',
          leafId: 'leaf-fitness',
        }],
        leaves: [
          { id: 'leaf-fitness', name: 'Fitness Journey', createdAt: '2026-01-01T09:00:00Z' },
        ],
      },
    }

    const events = migrateToEvents(originalNodes, [])
    const circles = { 'branch-0-twig-0': { label: 'Test', note: '' } }
    const rebuilt = rebuildFromEvents(events, circles)

    const sprout = rebuilt.nodes['branch-0-twig-0']?.sprouts?.[0]
    expect(sprout!.leafId).toBe('leaf-fitness')

    const leaf = rebuilt.nodes['branch-0-twig-0'].leaves?.find(l => l.id === 'leaf-fitness')
    expect(leaf).toBeDefined()
    expect(leaf!.name).toBe('Fitness Journey')
  })

  it('should pass validation on complex round-trip', () => {
    const originalNodes: Record<string, NodeData> = {
      'branch-0-twig-0': {
        label: 'Movement',
        note: 'Fitness goals',
        sprouts: [
          {
            id: 'sprout-1',
            title: 'Active Goal',
            season: '1m',
            environment: 'firm',
            state: 'active',
            soilCost: 5,
            createdAt: '2026-01-15T10:00:00Z',
            plantedAt: '2026-01-15T10:00:00Z',
            waterEntries: [
              { timestamp: '2026-01-16T09:00:00Z', content: 'Progress 1' },
              { timestamp: '2026-01-17T09:00:00Z', content: 'Progress 2' },
            ],
          },
          {
            id: 'sprout-2',
            title: 'Completed Goal',
            season: '2w',
            environment: 'fertile',
            state: 'completed',
            soilCost: 2,
            result: 5,
            reflection: 'Nailed it!',
            createdAt: '2026-01-01T10:00:00Z',
            plantedAt: '2026-01-01T10:00:00Z',
            harvestedAt: '2026-01-14T10:00:00Z',
          },
        ],
        leaves: [
          { id: 'leaf-1', name: 'Saga 1', createdAt: '2026-01-01T09:00:00Z' },
        ],
      },
      'branch-0-twig-1': {
        label: 'Nutrition',
        note: 'Eating habits',
        sprouts: [],
        leaves: [],
      },
    }

    const sunLog: SunEntry[] = [
      {
        timestamp: '2026-01-10T10:00:00Z',
        content: 'Reflection 1',
        context: { twigId: 'branch-0-twig-0', twigLabel: 'Movement' },
      },
    ]

    // Export
    const events = migrateToEvents(originalNodes, sunLog)

    // Import
    const circles = {
      'branch-0-twig-0': { label: 'Movement', note: 'Fitness goals' },
      'branch-0-twig-1': { label: 'Nutrition', note: 'Eating habits' },
    }
    const rebuilt = rebuildFromEvents(events, circles)

    // Validate
    const validation = validateRebuild(events, rebuilt)
    expect(validation.valid).toBe(true)
    expect(validation.errors).toHaveLength(0)

    // Deep verification
    expect(rebuilt.nodes['branch-0-twig-0'].sprouts).toHaveLength(2)
    expect(rebuilt.nodes['branch-0-twig-0'].leaves).toHaveLength(1)
    expect(rebuilt.sunLog).toHaveLength(1)
  })
})
