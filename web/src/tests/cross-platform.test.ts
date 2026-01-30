/**
 * Cross-platform compatibility tests.
 * Verifies that iOS and web export formats are interchangeable.
 */

import { describe, it, expect } from 'vitest'
import { rebuildFromEvents } from '../events/rebuild'
import type { TrunkEvent } from '../events/types'

describe('Cross-Platform Compatibility', () => {
  /**
   * Simulates an iOS export with the exact structure DataExportService.swift produces.
   * This proves web can import iOS exports.
   */
  it('should import iOS-style export (v4 format)', () => {
    // This matches the exact JSON structure from iOS DataExportService
    const iosExport = {
      version: 4,
      exportedAt: '2026-01-29T20:00:00.000Z',
      events: [
        {
          type: 'leaf_created',
          timestamp: '2026-01-01T10:00:00.000Z',
          leafId: 'leaf-ios-1',
          twigId: 'branch-0-twig-0',
          name: 'Fitness Journey',
        },
        {
          type: 'sprout_planted',
          timestamp: '2026-01-02T10:00:00.000Z',
          sproutId: 'sprout-ios-1',
          twigId: 'branch-0-twig-0',
          title: 'Run 3x per week',
          season: '1m',
          environment: 'firm',
          soilCost: 5,
          leafId: 'leaf-ios-1',
          bloomWither: 'Gave up completely',
          bloomBudding: 'Running 1-2x per week',
          bloomFlourish: 'Running 3x+ per week',
        },
        {
          type: 'sprout_watered',
          timestamp: '2026-01-03T09:00:00.000Z',
          sproutId: 'sprout-ios-1',
          content: 'Ran 2 miles today',
          prompt: 'How did it go?',
        },
        {
          type: 'sprout_harvested',
          timestamp: '2026-01-15T10:00:00.000Z',
          sproutId: 'sprout-ios-1',
          result: 4,
          reflection: null,
          capacityGained: 1.5,
        },
        {
          type: 'sun_shone',
          timestamp: '2026-01-10T10:00:00.000Z',
          twigId: 'branch-0-twig-0',
          twigLabel: 'Movement',
          content: 'Movement is foundational to health',
          prompt: 'What does this mean to you?',
        },
      ],
      circles: {
        'branch-0-twig-0': {
          label: 'Movement',
          note: 'Physical activity goals',
        },
      },
      settings: {
        name: null,
      },
    }

    // Parse events (web rebuildFromEvents expects TrunkEvent[])
    const events = iosExport.events as TrunkEvent[]
    const circles = iosExport.circles as Record<string, { label?: string; note?: string }>

    const rebuilt = rebuildFromEvents(events, circles)

    // Verify leaf was reconstructed
    expect(rebuilt.nodes['branch-0-twig-0'].leaves).toHaveLength(1)
    expect(rebuilt.nodes['branch-0-twig-0'].leaves![0].name).toBe('Fitness Journey')

    // Verify sprout was reconstructed with all fields
    expect(rebuilt.nodes['branch-0-twig-0'].sprouts).toHaveLength(1)
    const sprout = rebuilt.nodes['branch-0-twig-0'].sprouts![0]
    expect(sprout.title).toBe('Run 3x per week')
    expect(sprout.season).toBe('1m')
    expect(sprout.environment).toBe('firm')
    expect(sprout.state).toBe('completed')
    expect(sprout.result).toBe(4)
    expect(sprout.leafId).toBe('leaf-ios-1')
    expect(sprout.bloomWither).toBe('Gave up completely')
    expect(sprout.bloomBudding).toBe('Running 1-2x per week')
    expect(sprout.bloomFlourish).toBe('Running 3x+ per week')

    // Verify water entries
    expect(sprout.waterEntries).toHaveLength(1)
    expect(sprout.waterEntries![0].content).toBe('Ran 2 miles today')
    expect(sprout.waterEntries![0].prompt).toBe('How did it go?')

    // Verify sun log
    expect(rebuilt.sunLog).toHaveLength(1)
    expect(rebuilt.sunLog[0].content).toBe('Movement is foundational to health')
    expect(rebuilt.sunLog[0].context.twigId).toBe('branch-0-twig-0')
    expect(rebuilt.sunLog[0].context.twigLabel).toBe('Movement')

    // Verify labels/notes preserved
    expect(rebuilt.nodes['branch-0-twig-0'].label).toBe('Movement')
    expect(rebuilt.nodes['branch-0-twig-0'].note).toBe('Physical activity goals')
  })

  it('should handle iOS export with null/undefined optional fields', () => {
    const iosExport = {
      version: 4,
      exportedAt: '2026-01-29T20:00:00.000Z',
      events: [
        {
          type: 'sprout_planted',
          timestamp: '2026-01-02T10:00:00.000Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          title: 'Simple sprout',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
          // No leafId, no bloom fields - should work
        },
        {
          type: 'sun_shone',
          timestamp: '2026-01-10T10:00:00.000Z',
          twigId: 'branch-0-twig-0',
          twigLabel: 'Test',
          content: 'Reflection',
          // No prompt - should work
        },
      ],
      circles: {},
      settings: { name: null },
    }

    const events = iosExport.events as TrunkEvent[]
    const rebuilt = rebuildFromEvents(events, {})

    expect(rebuilt.nodes['branch-0-twig-0'].sprouts).toHaveLength(1)
    expect(rebuilt.nodes['branch-0-twig-0'].sprouts![0].leafId).toBeUndefined()
    expect(rebuilt.sunLog).toHaveLength(1)
    expect(rebuilt.sunLog[0].prompt).toBeUndefined()
  })

  it('should preserve field naming conventions (web style)', () => {
    // Verify we use web-style field names, not iOS-style
    const events: TrunkEvent[] = [
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T10:00:00.000Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
        // These are the web field names (not bloomLow/Mid/High)
        bloomWither: 'Wither description',
        bloomBudding: 'Budding description',
        bloomFlourish: 'Flourish description',
      },
    ]

    const rebuilt = rebuildFromEvents(events, {})
    const sprout = rebuilt.nodes['branch-0-twig-0'].sprouts![0]

    // Verify the web app uses these exact field names
    expect(sprout.bloomWither).toBe('Wither description')
    expect(sprout.bloomBudding).toBe('Budding description')
    expect(sprout.bloomFlourish).toBe('Flourish description')
  })
})
