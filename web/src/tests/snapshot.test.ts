/**
 * Snapshot tests for UI rendering functions.
 * These catch unexpected changes to HTML output.
 *
 * Run: npm test
 * Update snapshots: npm test -- --update
 */

import { describe, it, expect } from 'vitest'
import { deriveState, getActiveSprouts, toSprout } from '../events/derive'
import type { TrunkEvent } from '../events/types'

describe('Snapshot Tests', () => {
  describe('State Derivation Snapshots', () => {
    it('empty events produces default state', () => {
      const state = deriveState([])

      expect({
        soilCapacity: state.soilCapacity,
        soilAvailable: state.soilAvailable,
        sproutCount: state.sprouts.size,
        leafCount: state.leaves.size,
        sunEntryCount: state.sunEntries.length,
      }).toMatchInlineSnapshot(`
        {
          "leafCount": 0,
          "soilAvailable": 10,
          "soilCapacity": 10,
          "sproutCount": 0,
          "sunEntryCount": 0,
        }
      `)
    })

    it('planted sprout state structure', () => {
      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: '2026-01-01T10:00:00Z',
          sproutId: 'test-sprout',
          twigId: 'branch-0-twig-0',
          title: 'Test Goal',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
      ]

      const state = deriveState(events)
      const sprouts = getActiveSprouts(state)
      const sprout = toSprout(sprouts[0])

      // Snapshot the sprout structure (excluding dynamic dates)
      expect({
        id: sprout.id,
        title: sprout.title,
        season: sprout.season,
        environment: sprout.environment,
        state: sprout.state,
        soilCost: sprout.soilCost,
      }).toMatchInlineSnapshot(`
        {
          "environment": "fertile",
          "id": "test-sprout",
          "season": "2w",
          "soilCost": 2,
          "state": "active",
          "title": "Test Goal",
        }
      `)
    })

    it('harvested sprout includes result', () => {
      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: '2026-01-01T10:00:00Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          title: 'Completed Goal',
          season: '2w',
          environment: 'firm',
          soilCost: 3,
        },
        {
          type: 'sprout_harvested',
          timestamp: '2026-01-15T10:00:00Z',
          sproutId: 'sprout-1',
          result: 4,
          capacityGained: 1.5,
        },
      ]

      const state = deriveState(events)
      const sprout = state.sprouts.get('sprout-1')!

      expect({
        state: sprout.state,
        result: sprout.result,
        hasHarvestedAt: !!sprout.harvestedAt,
      }).toMatchInlineSnapshot(`
        {
          "hasHarvestedAt": true,
          "result": 4,
          "state": "completed",
        }
      `)
    })
  })

  describe('Soil Calculation Snapshots', () => {
    it('soil after multiple operations', () => {
      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: '2026-01-01T10:00:00Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          title: 'Goal 1',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
        {
          type: 'sprout_watered',
          timestamp: '2026-01-02T10:00:00Z',
          sproutId: 'sprout-1',
          content: 'Progress',
        },
        {
          type: 'sun_shone',
          timestamp: '2026-01-03T10:00:00Z',
          twigId: 'branch-0-twig-0',
          twigLabel: 'Test',
          content: 'Reflection',
        },
      ]

      const state = deriveState(events)

      expect({
        soilCapacity: state.soilCapacity,
        soilAvailable: Number(state.soilAvailable.toFixed(2)),
      }).toMatchInlineSnapshot(`
        {
          "soilAvailable": 8.4,
          "soilCapacity": 10,
        }
      `)
    })
  })

  describe('Event Structure Snapshots', () => {
    it('sun entry structure', () => {
      const events: TrunkEvent[] = [
        {
          type: 'sun_shone',
          timestamp: '2026-01-05T10:00:00Z',
          twigId: 'branch-0-twig-0',
          twigLabel: 'Movement',
          content: 'Weekly reflection content',
          prompt: 'What did you learn?',
        },
      ]

      const state = deriveState(events)

      expect(state.sunEntries[0]).toMatchInlineSnapshot(`
        {
          "content": "Weekly reflection content",
          "context": {
            "twigId": "branch-0-twig-0",
            "twigLabel": "Movement",
          },
          "prompt": "What did you learn?",
          "timestamp": "2026-01-05T10:00:00Z",
        }
      `)
    })
  })
})
