/**
 * Tests for rebuilding nodeState from events.
 */

import { describe, it, expect } from 'vitest'
import { rebuildFromEvents, validateRebuild } from '../events/rebuild'
import type { TrunkEvent } from '../events/types'

describe('Rebuild from Events', () => {
  it('should return empty nodes for empty events', () => {
    const result = rebuildFromEvents([], {})
    expect(Object.keys(result.nodes)).toHaveLength(0)
    expect(result.sunLog).toHaveLength(0)
  })

  it('should rebuild a leaf from leaf_created event', () => {
    const events: TrunkEvent[] = [
      {
        type: 'leaf_created',
        timestamp: '2026-01-15T10:00:00Z',
        leafId: 'leaf-1',
        twigId: 'branch-0-twig-0',
        name: 'My Saga',
      },
    ]

    const result = rebuildFromEvents(events, {})
    expect(result.nodes['branch-0-twig-0']).toBeDefined()
    expect(result.nodes['branch-0-twig-0'].leaves).toHaveLength(1)
    expect(result.nodes['branch-0-twig-0'].leaves![0]).toMatchObject({
      id: 'leaf-1',
      name: 'My Saga',
    })
  })

  it('should rebuild an active sprout from planted event', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Learn TypeScript',
        season: '1m',
        environment: 'firm',
        soilCost: 5,
      },
    ]

    const result = rebuildFromEvents(events, {})
    expect(result.nodes['branch-0-twig-0'].sprouts).toHaveLength(1)

    const sprout = result.nodes['branch-0-twig-0'].sprouts![0]
    expect(sprout.id).toBe('sprout-1')
    expect(sprout.title).toBe('Learn TypeScript')
    expect(sprout.state).toBe('active')
  })

  it('should rebuild completed sprout from planted + harvested events', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Complete Goal',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
      {
        type: 'sprout_harvested',
        timestamp: '2026-01-30T10:00:00Z',
        sproutId: 'sprout-1',
        result: 4,
        reflection: 'Great experience!',
        capacityGained: 0.5,
      },
    ]

    const result = rebuildFromEvents(events, {})
    const sprout = result.nodes['branch-0-twig-0'].sprouts![0]

    expect(sprout.state).toBe('completed')
    expect(sprout.result).toBe(4)
    expect(sprout.reflection).toBe('Great experience!')
  })

  it('should rebuild water entries from sprout_watered events', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
      {
        type: 'sprout_watered',
        timestamp: '2026-01-16T09:00:00Z',
        sproutId: 'sprout-1',
        content: 'Day 1 progress',
      },
      {
        type: 'sprout_watered',
        timestamp: '2026-01-17T09:00:00Z',
        sproutId: 'sprout-1',
        content: 'Day 2 progress',
        prompt: 'How did it go?',
      },
    ]

    const result = rebuildFromEvents(events, {})
    const sprout = result.nodes['branch-0-twig-0'].sprouts![0]

    expect(sprout.waterEntries).toHaveLength(2)
    expect(sprout.waterEntries![0].content).toBe('Day 1 progress')
    expect(sprout.waterEntries![1].content).toBe('Day 2 progress')
    expect(sprout.waterEntries![1].prompt).toBe('How did it go?')
  })

  it('should remove uprooted sprouts', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Abandoned Goal',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
      {
        type: 'sprout_uprooted',
        timestamp: '2026-01-16T10:00:00Z',
        sproutId: 'sprout-1',
        soilReturned: 1,
      },
    ]

    const result = rebuildFromEvents(events, {})
    // Node might not exist at all, or might have empty sprouts
    const sprouts = result.nodes['branch-0-twig-0']?.sprouts || []
    expect(sprouts).toHaveLength(0)
  })

  it('should rebuild sun log from sun_shone events', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sun_shone',
        timestamp: '2026-01-15T10:00:00Z',
        twigId: 'branch-0-twig-0',
        twigLabel: 'Movement',
        content: 'Reflected on movement',
        prompt: 'What does this mean to you?',
      },
    ]

    const result = rebuildFromEvents(events, {})
    expect(result.sunLog).toHaveLength(1)
    expect(result.sunLog[0]).toMatchObject({
      timestamp: '2026-01-15T10:00:00Z',
      content: 'Reflected on movement',
      prompt: 'What does this mean to you?',
      context: {
        twigId: 'branch-0-twig-0',
        twigLabel: 'Movement',
      },
    })
  })

  it('should merge labels and notes from circles', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
    ]

    const circles = {
      'branch-0-twig-0': {
        label: 'Movement',
        note: 'My fitness journey',
      },
      'branch-0-twig-1': {
        label: 'Nutrition',
        note: 'Eating habits',
      },
    }

    const result = rebuildFromEvents(events, circles)

    // Twig with sprout should have merged label/note
    expect(result.nodes['branch-0-twig-0'].label).toBe('Movement')
    expect(result.nodes['branch-0-twig-0'].note).toBe('My fitness journey')

    // Twig without sprout but with label/note should exist
    expect(result.nodes['branch-0-twig-1'].label).toBe('Nutrition')
    expect(result.nodes['branch-0-twig-1'].note).toBe('Eating habits')
  })

  it('should preserve bloom fields through rebuild', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Run 3x per week',
        season: '1m',
        environment: 'firm',
        soilCost: 5,
        leafId: 'leaf-fitness',
        bloomWither: 'Gave up',
        bloomBudding: 'Running 1-2x',
        bloomFlourish: 'Running 3x+',
      },
    ]

    const result = rebuildFromEvents(events, {})
    const sprout = result.nodes['branch-0-twig-0'].sprouts![0]

    expect(sprout.bloomWither).toBe('Gave up')
    expect(sprout.bloomBudding).toBe('Running 1-2x')
    expect(sprout.bloomFlourish).toBe('Running 3x+')
    expect(sprout.leafId).toBe('leaf-fitness')
  })

  it('should pass validation for correct rebuild', () => {
    const events: TrunkEvent[] = [
      {
        type: 'leaf_created',
        timestamp: '2026-01-10T10:00:00Z',
        leafId: 'leaf-1',
        twigId: 'branch-0-twig-0',
        name: 'Saga',
      },
      {
        type: 'sprout_planted',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Active',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
      {
        type: 'sprout_watered',
        timestamp: '2026-01-16T09:00:00Z',
        sproutId: 'sprout-1',
        content: 'Progress',
      },
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T10:00:00Z',
        sproutId: 'sprout-2',
        twigId: 'branch-0-twig-0',
        title: 'Completed',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
      },
      {
        type: 'sprout_harvested',
        timestamp: '2026-01-15T10:00:00Z',
        sproutId: 'sprout-2',
        result: 5,
        capacityGained: 0.3,
      },
      {
        type: 'sun_shone',
        timestamp: '2026-01-12T10:00:00Z',
        twigId: 'branch-0-twig-0',
        twigLabel: 'Test',
        content: 'Reflection',
      },
    ]

    const result = rebuildFromEvents(events, {})
    const validation = validateRebuild(events, result)

    expect(validation.valid).toBe(true)
    expect(validation.errors).toHaveLength(0)
  })
})
