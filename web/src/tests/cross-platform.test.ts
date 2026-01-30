/**
 * Cross-platform compatibility tests.
 * Verifies that iOS and web export formats are interchangeable.
 */

import { describe, it, expect } from 'vitest'
import { rebuildFromEvents } from '../events/rebuild'
import { migrateToEvents } from '../events/migrate'
import type { TrunkEvent } from '../events/types'
import type { NodeData } from '../types'

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

  /**
   * ROUND-TRIP TEST: iOS → Web → iOS
   *
   * This is the definitive proof that data survives cross-platform transfer.
   * If events can go: events → rebuild → re-export → rebuild → identical state,
   * then iOS ↔ Web transfers are lossless.
   */
  it('should survive a complete round-trip without data loss', () => {
    // Step 1: Create comprehensive test events (simulating iOS export)
    const originalEvents: TrunkEvent[] = [
      // Leaf in twig 0
      {
        type: 'leaf_created',
        timestamp: '2026-01-01T08:00:00.000Z',
        leafId: 'leaf-rt-1',
        twigId: 'branch-0-twig-0',
        name: 'Fitness Journey',
      },
      // Leaf in twig 1
      {
        type: 'leaf_created',
        timestamp: '2026-01-01T08:30:00.000Z',
        leafId: 'leaf-rt-2',
        twigId: 'branch-1-twig-0',
        name: 'Learning Piano',
      },
      // Active sprout with all fields
      {
        type: 'sprout_planted',
        timestamp: '2026-01-02T10:00:00.000Z',
        sproutId: 'sprout-rt-1',
        twigId: 'branch-0-twig-0',
        title: 'Run 3x per week',
        season: '1m',
        environment: 'firm',
        soilCost: 5,
        leafId: 'leaf-rt-1',
        bloomWither: 'Gave up completely',
        bloomBudding: 'Running 1-2x per week',
        bloomFlourish: 'Running 3x+ per week',
      },
      // Water entry with prompt
      {
        type: 'sprout_watered',
        timestamp: '2026-01-03T09:00:00.000Z',
        sproutId: 'sprout-rt-1',
        content: 'Ran 2 miles today, felt great',
        prompt: 'How did your run go?',
      },
      // Another water entry without prompt
      {
        type: 'sprout_watered',
        timestamp: '2026-01-05T09:00:00.000Z',
        sproutId: 'sprout-rt-1',
        content: 'Rest day, stretched instead',
      },
      // Completed sprout (different twig)
      {
        type: 'sprout_planted',
        timestamp: '2026-01-01T12:00:00.000Z',
        sproutId: 'sprout-rt-2',
        twigId: 'branch-1-twig-0',
        title: 'Practice piano daily',
        season: '2w',
        environment: 'fertile',
        soilCost: 2,
        leafId: 'leaf-rt-2',
        bloomWither: 'Stopped practicing',
        bloomBudding: 'Practiced some days',
        bloomFlourish: 'Practiced every day',
      },
      {
        type: 'sprout_watered',
        timestamp: '2026-01-07T19:00:00.000Z',
        sproutId: 'sprout-rt-2',
        content: 'Learned a new scale',
        prompt: 'What did you practice?',
      },
      {
        type: 'sprout_harvested',
        timestamp: '2026-01-15T10:00:00.000Z',
        sproutId: 'sprout-rt-2',
        result: 4,
        reflection: 'Made great progress!',
        capacityGained: 1.2,
      },
      // Sprout without leaf (standalone)
      {
        type: 'sprout_planted',
        timestamp: '2026-01-10T10:00:00.000Z',
        sproutId: 'sprout-rt-3',
        twigId: 'branch-2-twig-3',
        title: 'Read 2 books this month',
        season: '1m',
        environment: 'barren',
        soilCost: 6,
        // No leafId - standalone sprout
        bloomWither: 'Read nothing',
        bloomBudding: 'Read 1 book',
        bloomFlourish: 'Read 2+ books',
      },
      // Sun entries
      {
        type: 'sun_shone',
        timestamp: '2026-01-07T20:00:00.000Z',
        twigId: 'branch-0-twig-0',
        twigLabel: 'Movement',
        content: 'Movement is foundational to my health goals',
        prompt: 'What does this twig mean to you?',
      },
      {
        type: 'sun_shone',
        timestamp: '2026-01-14T20:00:00.000Z',
        twigId: 'branch-1-twig-0',
        twigLabel: 'Reading',
        content: 'I find peace in learning new things',
        // No prompt
      },
    ]

    const originalCircles: Record<string, { label?: string; note?: string }> = {
      'branch-0-twig-0': { label: 'Movement', note: 'Physical fitness goals' },
      'branch-1-twig-0': { label: 'Reading', note: 'Brain training' },
      'branch-2-twig-3': { label: 'Literature', note: '' },
    }

    // Step 2: Import into web (simulating receiving iOS export)
    const rebuilt1 = rebuildFromEvents(originalEvents, originalCircles)

    // Step 3: Re-export from web (simulating web sending back to iOS)
    const reExportedEvents = migrateToEvents(rebuilt1.nodes, rebuilt1.sunLog)

    // Step 4: Import again (simulating iOS receiving web export)
    // Rebuild circles from nodes for the second import
    const reExportedCircles: Record<string, { label?: string; note?: string }> = {}
    for (const [nodeId, data] of Object.entries(rebuilt1.nodes)) {
      if (data.label || data.note) {
        reExportedCircles[nodeId] = { label: data.label, note: data.note }
      }
    }
    const rebuilt2 = rebuildFromEvents(reExportedEvents, reExportedCircles)

    // Step 5: VERIFY - Compare rebuilt1 and rebuilt2
    // They should be IDENTICAL if the round-trip is lossless

    // Same node IDs
    const nodeIds1 = Object.keys(rebuilt1.nodes).sort()
    const nodeIds2 = Object.keys(rebuilt2.nodes).sort()
    expect(nodeIds2).toEqual(nodeIds1)

    // Compare each node
    for (const nodeId of nodeIds1) {
      const node1 = rebuilt1.nodes[nodeId]
      const node2 = rebuilt2.nodes[nodeId]

      // Labels and notes
      expect(node2.label).toBe(node1.label)
      expect(node2.note).toBe(node1.note)

      // Leaves
      expect(node2.leaves?.length ?? 0).toBe(node1.leaves?.length ?? 0)
      if (node1.leaves) {
        for (let i = 0; i < node1.leaves.length; i++) {
          expect(node2.leaves![i].id).toBe(node1.leaves[i].id)
          expect(node2.leaves![i].name).toBe(node1.leaves[i].name)
          expect(node2.leaves![i].createdAt).toBe(node1.leaves[i].createdAt)
        }
      }

      // Sprouts
      expect(node2.sprouts?.length ?? 0).toBe(node1.sprouts?.length ?? 0)
      if (node1.sprouts) {
        for (let i = 0; i < node1.sprouts.length; i++) {
          const s1 = node1.sprouts[i]
          const s2 = node2.sprouts![i]

          expect(s2.id).toBe(s1.id)
          expect(s2.title).toBe(s1.title)
          expect(s2.season).toBe(s1.season)
          expect(s2.environment).toBe(s1.environment)
          expect(s2.state).toBe(s1.state)
          expect(s2.soilCost).toBe(s1.soilCost)
          expect(s2.leafId).toBe(s1.leafId)
          expect(s2.result).toBe(s1.result)
          expect(s2.bloomWither).toBe(s1.bloomWither)
          expect(s2.bloomBudding).toBe(s1.bloomBudding)
          expect(s2.bloomFlourish).toBe(s1.bloomFlourish)

          // Water entries
          expect(s2.waterEntries?.length ?? 0).toBe(s1.waterEntries?.length ?? 0)
          if (s1.waterEntries) {
            for (let j = 0; j < s1.waterEntries.length; j++) {
              expect(s2.waterEntries![j].content).toBe(s1.waterEntries[j].content)
              expect(s2.waterEntries![j].prompt).toBe(s1.waterEntries[j].prompt)
              expect(s2.waterEntries![j].timestamp).toBe(s1.waterEntries[j].timestamp)
            }
          }
        }
      }
    }

    // Compare sun logs
    expect(rebuilt2.sunLog.length).toBe(rebuilt1.sunLog.length)
    for (let i = 0; i < rebuilt1.sunLog.length; i++) {
      const sun1 = rebuilt1.sunLog[i]
      const sun2 = rebuilt2.sunLog[i]

      expect(sun2.content).toBe(sun1.content)
      expect(sun2.prompt).toBe(sun1.prompt)
      expect(sun2.timestamp).toBe(sun1.timestamp)
      expect(sun2.context.twigId).toBe(sun1.context.twigId)
      expect(sun2.context.twigLabel).toBe(sun1.context.twigLabel)
    }

    // Final counts verification
    const countSprouts = (nodes: Record<string, NodeData>) =>
      Object.values(nodes).reduce((sum, n) => sum + (n.sprouts?.length ?? 0), 0)
    const countLeaves = (nodes: Record<string, NodeData>) =>
      Object.values(nodes).reduce((sum, n) => sum + (n.leaves?.length ?? 0), 0)
    const countWaterEntries = (nodes: Record<string, NodeData>) =>
      Object.values(nodes).reduce(
        (sum, n) => sum + (n.sprouts?.reduce((s, sp) => s + (sp.waterEntries?.length ?? 0), 0) ?? 0),
        0
      )

    expect(countSprouts(rebuilt2.nodes)).toBe(countSprouts(rebuilt1.nodes))
    expect(countLeaves(rebuilt2.nodes)).toBe(countLeaves(rebuilt1.nodes))
    expect(countWaterEntries(rebuilt2.nodes)).toBe(countWaterEntries(rebuilt1.nodes))
    expect(rebuilt2.sunLog.length).toBe(rebuilt1.sunLog.length)

    // Log summary for visibility
    console.log('Round-trip test passed!')
    console.log(`  Sprouts: ${countSprouts(rebuilt1.nodes)}`)
    console.log(`  Leaves: ${countLeaves(rebuilt1.nodes)}`)
    console.log(`  Water entries: ${countWaterEntries(rebuilt1.nodes)}`)
    console.log(`  Sun entries: ${rebuilt1.sunLog.length}`)
  })
})
