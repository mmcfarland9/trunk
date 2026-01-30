/**
 * Tests for event migration from nodeState + sunLog.
 */

import { describe, it, expect } from 'vitest'
import { migrateToEvents, validateMigration } from '../events/migrate'
import type { NodeData, SunEntry } from '../types'

describe('Migration to Events', () => {
  it('should generate no events from empty state', () => {
    const events = migrateToEvents({}, [])
    expect(events).toHaveLength(0)
  })

  it('should generate leaf_created event', () => {
    const nodeState: Record<string, NodeData> = {
      'branch-0-twig-0': {
        label: 'Test',
        note: '',
        leaves: [{
          id: 'leaf-1',
          name: 'My Saga',
          createdAt: '2026-01-15T10:00:00Z',
        }],
      },
    }

    const events = migrateToEvents(nodeState, [])
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('leaf_created')
    expect(events[0]).toMatchObject({
      leafId: 'leaf-1',
      twigId: 'branch-0-twig-0',
      name: 'My Saga',
    })
  })

  it('should generate sprout_planted event for active sprout', () => {
    const nodeState: Record<string, NodeData> = {
      'branch-0-twig-0': {
        label: 'Test',
        note: '',
        sprouts: [{
          id: 'sprout-1',
          title: 'Learn TypeScript',
          season: '1m',
          environment: 'firm',
          state: 'active',
          soilCost: 5,
          createdAt: '2026-01-15T10:00:00Z',
          plantedAt: '2026-01-15T10:00:00Z',
        }],
      },
    }

    const events = migrateToEvents(nodeState, [])
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('sprout_planted')
    expect(events[0]).toMatchObject({
      sproutId: 'sprout-1',
      twigId: 'branch-0-twig-0',
      title: 'Learn TypeScript',
      season: '1m',
      environment: 'firm',
      soilCost: 5,
    })
  })

  it('should generate sprout_watered events', () => {
    const nodeState: Record<string, NodeData> = {
      'branch-0-twig-0': {
        label: 'Test',
        note: '',
        sprouts: [{
          id: 'sprout-1',
          title: 'Test',
          season: '2w',
          environment: 'fertile',
          state: 'active',
          soilCost: 2,
          createdAt: '2026-01-15T10:00:00Z',
          waterEntries: [
            { timestamp: '2026-01-16T09:00:00Z', content: 'Day 1 progress' },
            { timestamp: '2026-01-17T09:00:00Z', content: 'Day 2 progress', prompt: 'How did it go?' },
          ],
        }],
      },
    }

    const events = migrateToEvents(nodeState, [])
    expect(events).toHaveLength(3) // 1 planted + 2 watered

    const waterEvents = events.filter(e => e.type === 'sprout_watered')
    expect(waterEvents).toHaveLength(2)
    expect(waterEvents[0]).toMatchObject({
      sproutId: 'sprout-1',
      content: 'Day 1 progress',
    })
    expect(waterEvents[1]).toMatchObject({
      sproutId: 'sprout-1',
      content: 'Day 2 progress',
      prompt: 'How did it go?',
    })
  })

  it('should generate sprout_harvested event for completed sprout', () => {
    const nodeState: Record<string, NodeData> = {
      'branch-0-twig-0': {
        label: 'Test',
        note: '',
        sprouts: [{
          id: 'sprout-1',
          title: 'Completed Goal',
          season: '2w',
          environment: 'fertile',
          state: 'completed',
          soilCost: 2,
          result: 4,
          reflection: 'Great experience!',
          createdAt: '2026-01-15T10:00:00Z',
          plantedAt: '2026-01-15T10:00:00Z',
          harvestedAt: '2026-01-30T10:00:00Z',
        }],
      },
    }

    const events = migrateToEvents(nodeState, [])
    expect(events).toHaveLength(2) // 1 planted + 1 harvested

    const harvestEvent = events.find(e => e.type === 'sprout_harvested')
    expect(harvestEvent).toBeDefined()
    expect(harvestEvent).toMatchObject({
      sproutId: 'sprout-1',
      result: 4,
      reflection: 'Great experience!',
    })
    // Verify capacityGained was calculated
    expect((harvestEvent as any).capacityGained).toBeGreaterThan(0)
  })

  it('should generate sun_shone events', () => {
    const sunLog: SunEntry[] = [
      {
        timestamp: '2026-01-15T10:00:00Z',
        content: 'Reflected on movement',
        prompt: 'What does this mean to you?',
        context: {
          twigId: 'branch-0-twig-0',
          twigLabel: 'Movement',
        },
      },
    ]

    const events = migrateToEvents({}, sunLog)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('sun_shone')
    expect(events[0]).toMatchObject({
      twigId: 'branch-0-twig-0',
      twigLabel: 'Movement',
      content: 'Reflected on movement',
      prompt: 'What does this mean to you?',
    })
  })

  it('should sort events chronologically', () => {
    const nodeState: Record<string, NodeData> = {
      'branch-0-twig-0': {
        label: 'Test',
        note: '',
        sprouts: [{
          id: 'sprout-1',
          title: 'Test',
          season: '2w',
          environment: 'fertile',
          state: 'active',
          soilCost: 2,
          createdAt: '2026-01-15T10:00:00Z',
          plantedAt: '2026-01-15T10:00:00Z',
        }],
        leaves: [{
          id: 'leaf-1',
          name: 'Saga',
          createdAt: '2026-01-10T10:00:00Z', // Before the sprout
        }],
      },
    }

    const sunLog: SunEntry[] = [
      {
        timestamp: '2026-01-12T10:00:00Z', // Between leaf and sprout
        content: 'Reflection',
        context: { twigId: 'branch-0-twig-0', twigLabel: 'Test' },
      },
    ]

    const events = migrateToEvents(nodeState, sunLog)
    expect(events).toHaveLength(3)

    // Should be: leaf (Jan 10), sun (Jan 12), sprout (Jan 15)
    expect(events[0].type).toBe('leaf_created')
    expect(events[1].type).toBe('sun_shone')
    expect(events[2].type).toBe('sprout_planted')
  })

  it('should pass validation for correct migration', () => {
    const nodeState: Record<string, NodeData> = {
      'branch-0-twig-0': {
        label: 'Test',
        note: '',
        sprouts: [
          {
            id: 'sprout-1',
            title: 'Active',
            season: '2w',
            environment: 'fertile',
            state: 'active',
            soilCost: 2,
            createdAt: '2026-01-15T10:00:00Z',
            waterEntries: [
              { timestamp: '2026-01-16T09:00:00Z', content: 'Progress' },
            ],
          },
          {
            id: 'sprout-2',
            title: 'Completed',
            season: '2w',
            environment: 'fertile',
            state: 'completed',
            soilCost: 2,
            result: 5,
            createdAt: '2026-01-01T10:00:00Z',
            harvestedAt: '2026-01-15T10:00:00Z',
          },
        ],
        leaves: [
          { id: 'leaf-1', name: 'Saga', createdAt: '2026-01-01T10:00:00Z' },
        ],
      },
    }

    const events = migrateToEvents(nodeState, [])
    const validation = validateMigration(nodeState, events)

    expect(validation.valid).toBe(true)
    expect(validation.errors).toHaveLength(0)
  })

  it('should preserve all data through round-trip', () => {
    const nodeState: Record<string, NodeData> = {
      'branch-0-twig-0': {
        label: 'Movement',
        note: 'My fitness journey',
        sprouts: [{
          id: 'sprout-running',
          title: 'Run 3x per week',
          season: '1m',
          environment: 'firm',
          state: 'completed',
          soilCost: 5,
          result: 4,
          reflection: 'Built a solid habit',
          createdAt: '2026-01-01T10:00:00Z',
          plantedAt: '2026-01-01T10:00:00Z',
          harvestedAt: '2026-02-01T10:00:00Z',
          bloomWither: 'Gave up',
          bloomBudding: 'Running 1-2x',
          bloomFlourish: 'Running 3x+',
          leafId: 'leaf-fitness',
          waterEntries: [
            { timestamp: '2026-01-15T09:00:00Z', content: 'Ran 5k today!' },
          ],
        }],
        leaves: [{
          id: 'leaf-fitness',
          name: 'Fitness Journey',
          createdAt: '2026-01-01T09:00:00Z',
        }],
      },
    }

    const sunLog: SunEntry[] = [{
      timestamp: '2026-01-20T10:00:00Z',
      content: 'Movement is foundational',
      prompt: 'What does movement mean to you?',
      context: { twigId: 'branch-0-twig-0', twigLabel: 'Movement' },
    }]

    const events = migrateToEvents(nodeState, sunLog)

    // Verify all events were created
    expect(events.filter(e => e.type === 'leaf_created')).toHaveLength(1)
    expect(events.filter(e => e.type === 'sprout_planted')).toHaveLength(1)
    expect(events.filter(e => e.type === 'sprout_watered')).toHaveLength(1)
    expect(events.filter(e => e.type === 'sprout_harvested')).toHaveLength(1)
    expect(events.filter(e => e.type === 'sun_shone')).toHaveLength(1)

    // Verify key data preserved
    const plantedEvent = events.find(e => e.type === 'sprout_planted') as any
    expect(plantedEvent.title).toBe('Run 3x per week')
    expect(plantedEvent.bloomFlourish).toBe('Running 3x+')
    expect(plantedEvent.leafId).toBe('leaf-fitness')

    const harvestedEvent = events.find(e => e.type === 'sprout_harvested') as any
    expect(harvestedEvent.result).toBe(4)
    expect(harvestedEvent.reflection).toBe('Built a solid habit')
  })
})
