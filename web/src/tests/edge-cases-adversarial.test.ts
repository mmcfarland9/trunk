/**
 * Edge case tests: Adversarial / unusual inputs.
 * Tests duplicate events, invalid references, unicode, and unexpected states.
 */

import { describe, it, expect } from 'vitest'
import {
  deriveState,
  getActiveSprouts,
  getCompletedSprouts,
  getSproutsForTwig,
  getLeavesForTwig,
  getLeafById,
  getSproutsByLeaf,
} from '../events/derive'
import type { TrunkEvent } from '../events/types'

// Helper to create a plant event
function plantEvent(overrides: Partial<TrunkEvent & { type: 'sprout_planted' }> = {}): TrunkEvent {
  return {
    type: 'sprout_planted',
    timestamp: '2026-01-01T10:00:00Z',
    sproutId: 'sprout-1',
    twigId: 'branch-0-twig-0',
    title: 'Test Sprout',
    season: '2w',
    environment: 'fertile',
    soilCost: 2,
    ...overrides,
  } as TrunkEvent
}

describe('Edge Cases — Adversarial', () => {
  describe('duplicate harvest events for same sprout', () => {
    it('deduplicates events with identical type, sproutId, and timestamp', () => {
      const events: TrunkEvent[] = [
        plantEvent(),
        {
          type: 'sprout_harvested',
          timestamp: '2026-01-15T10:00:00Z',
          sproutId: 'sprout-1',
          result: 5,
          capacityGained: 0.5,
        },
        // Exact duplicate (same type, sproutId, timestamp → same dedupe key)
        {
          type: 'sprout_harvested',
          timestamp: '2026-01-15T10:00:00Z',
          sproutId: 'sprout-1',
          result: 5,
          capacityGained: 0.5,
        },
      ]

      const state = deriveState(events)
      const sprout = state.sprouts.get('sprout-1')!

      expect(sprout.state).toBe('completed')
      // Only one harvest processed (deduped)
      // Capacity: 10 + 0.5 = 10.5 (not 11)
      expect(state.soilCapacity).toBeCloseTo(10.5, 2)
    })

    it('deduplicates events with matching client_id', () => {
      const events: TrunkEvent[] = [
        plantEvent(),
        {
          type: 'sprout_harvested',
          timestamp: '2026-01-15T10:00:00Z',
          sproutId: 'sprout-1',
          result: 5,
          capacityGained: 0.5,
          client_id: 'unique-harvest-id',
        },
        // Same client_id, different timestamp — still deduped
        {
          type: 'sprout_harvested',
          timestamp: '2026-01-16T10:00:00Z',
          sproutId: 'sprout-1',
          result: 3,
          capacityGained: 0.3,
          client_id: 'unique-harvest-id',
        },
      ]

      const state = deriveState(events)
      const sprout = state.sprouts.get('sprout-1')!

      expect(sprout.result).toBe(5) // First event wins
      expect(state.soilCapacity).toBeCloseTo(10.5, 2) // Only 0.5 gained
    })

    it('processes two harvests with different timestamps and no client_id', () => {
      // Different timestamps → different dedupe keys → both processed
      const events: TrunkEvent[] = [
        plantEvent(),
        {
          type: 'sprout_harvested',
          timestamp: '2026-01-15T10:00:00Z',
          sproutId: 'sprout-1',
          result: 5,
          capacityGained: 0.5,
        },
        {
          type: 'sprout_harvested',
          timestamp: '2026-01-16T10:00:00Z',
          sproutId: 'sprout-1',
          result: 3,
          capacityGained: 0.3,
        },
      ]

      const state = deriveState(events)
      const sprout = state.sprouts.get('sprout-1')!

      // Both processed — second overwrites result (last writer wins on sprout fields)
      expect(sprout.state).toBe('completed')
      expect(sprout.result).toBe(3) // Second harvest's result
      // Capacity: 10 + 0.5 + 0.3 = 10.8 (both applied)
      expect(state.soilCapacity).toBeCloseTo(10.8, 2)
    })
  })

  describe('uproot already-uprooted sprout', () => {
    it('does not transition state twice', () => {
      const events: TrunkEvent[] = [
        plantEvent(),
        {
          type: 'sprout_uprooted',
          timestamp: '2026-01-05T10:00:00Z',
          sproutId: 'sprout-1',
          soilReturned: 1,
        },
        // Second uproot attempt (different timestamp, so not deduped)
        {
          type: 'sprout_uprooted',
          timestamp: '2026-01-06T10:00:00Z',
          sproutId: 'sprout-1',
          soilReturned: 1,
        },
      ]

      const state = deriveState(events)
      const sprout = state.sprouts.get('sprout-1')!

      // State stays uprooted (second uproot check: sprout.state === 'active' → false)
      expect(sprout.state).toBe('uprooted')
      // First uprootedAt preserved (second doesn't overwrite since guard fails)
      expect(sprout.uprootedAt).toBe('2026-01-05T10:00:00Z')
    })

    it('soil is returned for both uproots (no state guard on soil return)', () => {
      const events: TrunkEvent[] = [
        plantEvent(),
        {
          type: 'sprout_uprooted',
          timestamp: '2026-01-05T10:00:00Z',
          sproutId: 'sprout-1',
          soilReturned: 1,
        },
        {
          type: 'sprout_uprooted',
          timestamp: '2026-01-06T10:00:00Z',
          sproutId: 'sprout-1',
          soilReturned: 1,
        },
      ]

      const state = deriveState(events)
      // 10 - 2 (plant) + 1 (first uproot) + 1 (second uproot) = 10, capped at 10
      expect(state.soilAvailable).toBe(10)
    })
  })

  describe('water a completed/uprooted sprout', () => {
    it('watering a completed sprout does not recover soil', () => {
      const events: TrunkEvent[] = [
        plantEvent(),
        {
          type: 'sprout_harvested',
          timestamp: '2026-01-15T10:00:00Z',
          sproutId: 'sprout-1',
          result: 5,
          capacityGained: 0.5,
        },
        {
          type: 'sprout_watered',
          timestamp: '2026-01-16T10:00:00Z',
          sproutId: 'sprout-1',
          content: 'Watering completed sprout',
        },
      ]

      const state = deriveState(events)
      // After harvest: capacity=10.5, available=10
      // Water on completed sprout: no soil recovery (state !== 'active')
      expect(state.soilAvailable).toBe(10)
    })

    it('watering a completed sprout still adds a water entry', () => {
      const events: TrunkEvent[] = [
        plantEvent(),
        {
          type: 'sprout_harvested',
          timestamp: '2026-01-15T10:00:00Z',
          sproutId: 'sprout-1',
          result: 5,
          capacityGained: 0.5,
        },
        {
          type: 'sprout_watered',
          timestamp: '2026-01-16T10:00:00Z',
          sproutId: 'sprout-1',
          content: 'Post-harvest water',
        },
      ]

      const state = deriveState(events)
      const sprout = state.sprouts.get('sprout-1')!
      // Water entry is added regardless of state
      expect(sprout.waterEntries).toHaveLength(1)
      expect(sprout.waterEntries[0].content).toBe('Post-harvest water')
    })

    it('watering an uprooted sprout does not recover soil', () => {
      const events: TrunkEvent[] = [
        plantEvent(),
        {
          type: 'sprout_uprooted',
          timestamp: '2026-01-05T10:00:00Z',
          sproutId: 'sprout-1',
          soilReturned: 1,
        },
        {
          type: 'sprout_watered',
          timestamp: '2026-01-06T10:00:00Z',
          sproutId: 'sprout-1',
          content: 'Watering uprooted sprout',
        },
      ]

      const state = deriveState(events)
      // 10 - 2 (plant) + 1 (uproot) = 9
      // No soil recovery from watering uprooted sprout
      expect(state.soilAvailable).toBe(9)
    })
  })

  describe('water a non-existent sprout', () => {
    it('does not crash and no soil recovery', () => {
      const events: TrunkEvent[] = [
        {
          type: 'sprout_watered',
          timestamp: '2026-01-01T10:00:00Z',
          sproutId: 'nonexistent-sprout',
          content: 'Watering ghost sprout',
        },
      ]

      const state = deriveState(events)
      expect(state.soilAvailable).toBe(10) // No change
      expect(state.sprouts.size).toBe(0)
    })
  })

  describe('sprout referencing non-existent leafId', () => {
    it('does not crash, sprout is created normally', () => {
      const events: TrunkEvent[] = [plantEvent({ leafId: 'nonexistent-leaf' })]

      const state = deriveState(events)
      const sprout = state.sprouts.get('sprout-1')!

      expect(sprout.leafId).toBe('nonexistent-leaf')
      expect(sprout.state).toBe('active')
    })

    it('leaf lookup returns undefined', () => {
      const events: TrunkEvent[] = [plantEvent({ leafId: 'nonexistent-leaf' })]

      const state = deriveState(events)
      expect(getLeafById(state, 'nonexistent-leaf')).toBeUndefined()
    })

    it('sproutsByLeaf still indexes the sprout', () => {
      const events: TrunkEvent[] = [plantEvent({ leafId: 'nonexistent-leaf' })]

      const state = deriveState(events)
      const leafSprouts = getSproutsByLeaf(state, 'nonexistent-leaf')
      expect(leafSprouts).toHaveLength(1)
      expect(leafSprouts[0].id).toBe('sprout-1')
    })
  })

  describe('multiple sprouts with identical titles', () => {
    it('both tracked independently with different IDs', () => {
      const events: TrunkEvent[] = [
        plantEvent({ sproutId: 'sprout-a', title: 'Same Title' }),
        plantEvent({
          sproutId: 'sprout-b',
          title: 'Same Title',
          timestamp: '2026-01-01T11:00:00Z',
        }),
      ]

      const state = deriveState(events)
      expect(state.sprouts.size).toBe(2)

      const sproutA = state.sprouts.get('sprout-a')!
      const sproutB = state.sprouts.get('sprout-b')!

      expect(sproutA.title).toBe('Same Title')
      expect(sproutB.title).toBe('Same Title')
      expect(sproutA.id).not.toBe(sproutB.id)
    })

    it('harvesting one does not affect the other', () => {
      const events: TrunkEvent[] = [
        plantEvent({ sproutId: 'sprout-a', title: 'Same Title' }),
        plantEvent({
          sproutId: 'sprout-b',
          title: 'Same Title',
          timestamp: '2026-01-01T11:00:00Z',
        }),
        {
          type: 'sprout_harvested',
          timestamp: '2026-01-15T10:00:00Z',
          sproutId: 'sprout-a',
          result: 5,
          capacityGained: 0.5,
        },
      ]

      const state = deriveState(events)
      expect(state.sprouts.get('sprout-a')!.state).toBe('completed')
      expect(state.sprouts.get('sprout-b')!.state).toBe('active')
    })
  })

  describe('unicode in titles and leaf names', () => {
    it('handles emoji in sprout title', () => {
      const events: TrunkEvent[] = [plantEvent({ title: '🏃‍♂️ Run Every Day 🌟' })]

      const state = deriveState(events)
      const sprout = state.sprouts.get('sprout-1')!
      expect(sprout.title).toBe('🏃‍♂️ Run Every Day 🌟')
    })

    it('handles CJK characters in sprout title', () => {
      const events: TrunkEvent[] = [plantEvent({ title: '毎日走る計画' })]

      const state = deriveState(events)
      const sprout = state.sprouts.get('sprout-1')!
      expect(sprout.title).toBe('毎日走る計画')
    })

    it('handles RTL characters in sprout title', () => {
      const events: TrunkEvent[] = [plantEvent({ title: 'تمرين يومي' })]

      const state = deriveState(events)
      const sprout = state.sprouts.get('sprout-1')!
      expect(sprout.title).toBe('تمرين يومي')
    })

    it('handles emoji in leaf name', () => {
      const events: TrunkEvent[] = [
        {
          type: 'leaf_created',
          timestamp: '2026-01-01T10:00:00Z',
          leafId: 'leaf-emoji',
          twigId: 'branch-0-twig-0',
          name: '🌿 Fitness Journey 💪',
        },
      ]

      const state = deriveState(events)
      const leaf = getLeafById(state, 'leaf-emoji')!
      expect(leaf.name).toBe('🌿 Fitness Journey 💪')
    })

    it('handles mixed unicode in water entry content', () => {
      const events: TrunkEvent[] = [
        plantEvent(),
        {
          type: 'sprout_watered',
          timestamp: '2026-01-02T10:00:00Z',
          sproutId: 'sprout-1',
          content: 'Ran 5km 🏃 — 很好的一天！ مع السلامة',
        },
      ]

      const state = deriveState(events)
      const sprout = state.sprouts.get('sprout-1')!
      expect(sprout.waterEntries[0].content).toBe('Ran 5km 🏃 — 很好的一天！ مع السلامة')
    })

    it('handles zero-width characters', () => {
      const events: TrunkEvent[] = [
        plantEvent({ title: 'test\u200B\u200Ctitle' }), // zero-width space + zero-width non-joiner
      ]

      const state = deriveState(events)
      const sprout = state.sprouts.get('sprout-1')!
      expect(sprout.title).toBe('test\u200B\u200Ctitle')
    })
  })

  describe('leaf with zero sprouts', () => {
    it('leaf exists in state with no sprouts', () => {
      const events: TrunkEvent[] = [
        {
          type: 'leaf_created',
          timestamp: '2026-01-01T10:00:00Z',
          leafId: 'empty-leaf',
          twigId: 'branch-0-twig-0',
          name: 'Empty Saga',
        },
      ]

      const state = deriveState(events)
      expect(state.leaves.size).toBe(1)
      const leaf = getLeafById(state, 'empty-leaf')!
      expect(leaf.name).toBe('Empty Saga')
    })

    it('appears in getLeavesForTwig', () => {
      const events: TrunkEvent[] = [
        {
          type: 'leaf_created',
          timestamp: '2026-01-01T10:00:00Z',
          leafId: 'empty-leaf',
          twigId: 'branch-0-twig-0',
          name: 'Empty Saga',
        },
      ]

      const state = deriveState(events)
      const twigLeaves = getLeavesForTwig(state, 'branch-0-twig-0')
      expect(twigLeaves).toHaveLength(1)
      expect(twigLeaves[0].id).toBe('empty-leaf')
    })

    it('getSproutsByLeaf returns empty array', () => {
      const events: TrunkEvent[] = [
        {
          type: 'leaf_created',
          timestamp: '2026-01-01T10:00:00Z',
          leafId: 'empty-leaf',
          twigId: 'branch-0-twig-0',
          name: 'Empty Saga',
        },
      ]

      const state = deriveState(events)
      expect(getSproutsByLeaf(state, 'empty-leaf')).toEqual([])
    })
  })

  describe('harvest non-existent sprout', () => {
    it('does not crash, no capacity gained', () => {
      const events: TrunkEvent[] = [
        {
          type: 'sprout_harvested',
          timestamp: '2026-01-15T10:00:00Z',
          sproutId: 'nonexistent',
          result: 5,
          capacityGained: 0.5,
        },
      ]

      const state = deriveState(events)
      expect(state.soilCapacity).toBe(10) // No capacity gained
      expect(state.soilAvailable).toBe(10) // No soil returned
      expect(state.sprouts.size).toBe(0)
    })
  })

  describe('uproot non-existent sprout', () => {
    it('does not crash, soil still returned (no sprout guard on soil)', () => {
      const events: TrunkEvent[] = [
        {
          type: 'sprout_uprooted',
          timestamp: '2026-01-05T10:00:00Z',
          sproutId: 'nonexistent',
          soilReturned: 1,
        },
      ]

      const state = deriveState(events)
      // Soil is returned regardless (no sprout guard on soilAvailable line)
      // But capped at capacity
      expect(state.soilAvailable).toBe(10) // 10 + 1 capped at 10
      expect(state.sprouts.size).toBe(0)
    })
  })

  describe('events out of order', () => {
    it('deriveState sorts events by timestamp before processing', () => {
      const events: TrunkEvent[] = [
        // Harvest BEFORE plant in array order — but sorted by timestamp
        {
          type: 'sprout_harvested',
          timestamp: '2026-01-15T10:00:00Z',
          sproutId: 'sprout-1',
          result: 5,
          capacityGained: 0.5,
        },
        plantEvent({ timestamp: '2026-01-01T10:00:00Z' }),
      ]

      const state = deriveState(events)
      const sprout = state.sprouts.get('sprout-1')!

      // After sorting: plant comes first, then harvest
      expect(sprout.state).toBe('completed')
      expect(state.soilCapacity).toBeCloseTo(10.5, 2)
    })
  })
})
