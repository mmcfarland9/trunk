/**
 * Tests for event store roundtrip integrity.
 * Verifies: exportEvents → clearEvents → replaceEvents → deriveState produces identical results.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  initEventStore,
  appendEvent,
  exportEvents,
  clearEvents,
  replaceEvents,
  getState,
  getEvents,
} from '../events/store'
import type {
  TrunkEvent,
  SproutPlantedEvent,
  SproutWateredEvent,
  SproutHarvestedEvent,
} from '../events/types'

// Helper factories
function makePlantedEvent(overrides?: Partial<SproutPlantedEvent>): SproutPlantedEvent {
  return {
    type: 'sprout_planted',
    timestamp: '2026-02-15T10:00:00Z',
    sproutId: 'sprout-1',
    twigId: 'branch-0-twig-0',
    title: 'Test Sprout',
    season: '1m',
    environment: 'fertile',
    soilCost: 3,
    ...overrides,
  }
}

function makeWateredEvent(overrides?: Partial<SproutWateredEvent>): SproutWateredEvent {
  return {
    type: 'sprout_watered',
    timestamp: '2026-02-16T10:00:00Z',
    sproutId: 'sprout-1',
    content: 'Worked on it today',
    ...overrides,
  }
}

function makeHarvestedEvent(overrides?: Partial<SproutHarvestedEvent>): SproutHarvestedEvent {
  return {
    type: 'sprout_harvested',
    timestamp: '2026-03-15T10:00:00Z',
    sproutId: 'sprout-1',
    result: 4,
    capacityGained: 0.47,
    ...overrides,
  }
}

describe('sync roundtrip', () => {
  beforeEach(() => {
    localStorage.clear()
    initEventStore()
  })

  describe('export → clear → replace → derive', () => {
    it('produces identical derived state for a plant+water+harvest sequence', () => {
      // Build up state
      appendEvent(makePlantedEvent())
      appendEvent(makeWateredEvent())
      appendEvent(makeHarvestedEvent())

      // Snapshot derived state before roundtrip
      const stateBefore = getState()
      const exported = exportEvents()

      // Clear everything
      clearEvents()
      expect(getEvents()).toHaveLength(0)

      // Restore from export
      replaceEvents(exported)

      // Verify derived state matches
      const stateAfter = getState()
      expect(stateAfter.soilCapacity).toBe(stateBefore.soilCapacity)
      expect(stateAfter.soilAvailable).toBe(stateBefore.soilAvailable)
      expect(stateAfter.sprouts.size).toBe(stateBefore.sprouts.size)
      expect(stateAfter.leaves.size).toBe(stateBefore.leaves.size)

      // Verify sprout state specifically
      const sproutBefore = stateBefore.sprouts.get('sprout-1')!
      const sproutAfter = stateAfter.sprouts.get('sprout-1')!
      expect(sproutAfter.state).toBe(sproutBefore.state)
      expect(sproutAfter.result).toBe(sproutBefore.result)
      expect(sproutAfter.waterEntries).toHaveLength(sproutBefore.waterEntries.length)
    })

    it('handles multiple sprouts across different twigs', () => {
      appendEvent(makePlantedEvent({ sproutId: 's1', twigId: 'branch-0-twig-0' }))
      appendEvent(
        makePlantedEvent({
          sproutId: 's2',
          twigId: 'branch-1-twig-3',
          timestamp: '2026-02-15T11:00:00Z',
          soilCost: 5,
        }),
      )
      appendEvent(makeWateredEvent({ sproutId: 's1', timestamp: '2026-02-16T10:00:00Z' }))
      appendEvent(makeWateredEvent({ sproutId: 's2', timestamp: '2026-02-16T11:00:00Z' }))

      const stateBefore = getState()
      const exported = exportEvents()

      clearEvents()
      replaceEvents(exported)

      const stateAfter = getState()
      expect(stateAfter.sprouts.size).toBe(2)
      expect(stateAfter.soilAvailable).toBe(stateBefore.soilAvailable)

      // Verify index lookups
      expect(stateAfter.activeSproutsByTwig.get('branch-0-twig-0')).toHaveLength(1)
      expect(stateAfter.activeSproutsByTwig.get('branch-1-twig-3')).toHaveLength(1)
    })

    it('preserves leaf and sun data through roundtrip', () => {
      appendEvent({
        type: 'leaf_created',
        timestamp: '2026-02-14T10:00:00Z',
        leafId: 'leaf-1',
        twigId: 'branch-0-twig-0',
        name: 'Fitness Journey',
      })
      appendEvent(makePlantedEvent({ leafId: 'leaf-1' }))
      appendEvent({
        type: 'sun_shone',
        timestamp: '2026-02-17T10:00:00Z',
        twigId: 'branch-0-twig-0',
        twigLabel: 'movement',
        content: 'Weekly reflection',
      } as TrunkEvent)

      const stateBefore = getState()
      const exported = exportEvents()

      clearEvents()
      replaceEvents(exported)

      const stateAfter = getState()
      expect(stateAfter.leaves.size).toBe(stateBefore.leaves.size)
      expect(stateAfter.sunEntries).toHaveLength(stateBefore.sunEntries.length)
      expect(stateAfter.leavesByTwig.get('branch-0-twig-0')).toHaveLength(1)
      expect(stateAfter.sproutsByLeaf.get('leaf-1')).toHaveLength(1)
    })

    it('handles uprooted sprouts', () => {
      appendEvent(makePlantedEvent({ soilCost: 5 }))
      appendEvent({
        type: 'sprout_uprooted',
        timestamp: '2026-02-20T10:00:00Z',
        sproutId: 'sprout-1',
        soilReturned: 1.25,
      } as TrunkEvent)

      const stateBefore = getState()
      const exported = exportEvents()

      clearEvents()
      replaceEvents(exported)

      const stateAfter = getState()
      const sprout = stateAfter.sprouts.get('sprout-1')!
      expect(sprout.state).toBe('uprooted')
      expect(stateAfter.soilAvailable).toBe(stateBefore.soilAvailable)
    })
  })

  describe('empty events', () => {
    it('roundtrips with empty events array', () => {
      const exported = exportEvents()
      expect(exported).toHaveLength(0)

      clearEvents()
      replaceEvents(exported)

      const state = getState()
      expect(state.sprouts.size).toBe(0)
      expect(state.leaves.size).toBe(0)
      expect(state.soilAvailable).toBe(state.soilCapacity) // Starting values
    })
  })

  describe('event count preservation', () => {
    it('preserves exact event count through roundtrip', () => {
      appendEvent(makePlantedEvent())
      appendEvent(makeWateredEvent({ timestamp: '2026-02-16T10:00:00Z' }))
      appendEvent(makeWateredEvent({ timestamp: '2026-02-17T10:00:00Z' }))
      appendEvent(makeWateredEvent({ timestamp: '2026-02-18T10:00:00Z' }))

      const countBefore = getEvents().length
      const exported = exportEvents()

      clearEvents()
      replaceEvents(exported)

      expect(getEvents()).toHaveLength(countBefore)
    })
  })

  describe('various event types', () => {
    it('roundtrips all 6 event types', () => {
      const events: TrunkEvent[] = [
        makePlantedEvent({ timestamp: '2026-02-15T10:00:00Z' }),
        makeWateredEvent({ timestamp: '2026-02-16T10:00:00Z' }),
        {
          type: 'sun_shone',
          timestamp: '2026-02-17T10:00:00Z',
          twigId: 'branch-0-twig-0',
          twigLabel: 'movement',
          content: 'Reflected on fitness',
        } as TrunkEvent,
        {
          type: 'leaf_created',
          timestamp: '2026-02-14T10:00:00Z',
          leafId: 'leaf-1',
          twigId: 'branch-0-twig-0',
          name: 'Running',
        } as TrunkEvent,
        makeHarvestedEvent({ timestamp: '2026-03-15T10:00:00Z' }),
        {
          type: 'sprout_uprooted',
          timestamp: '2026-03-16T10:00:00Z',
          sproutId: 'sprout-other',
          soilReturned: 1,
        } as TrunkEvent,
      ]

      // We need to plant sprout-other before uprooting it
      appendEvent(
        makePlantedEvent({
          sproutId: 'sprout-other',
          timestamp: '2026-02-14T09:00:00Z',
          soilCost: 4,
        }),
      )
      for (const event of events) {
        appendEvent(event)
      }

      const stateBefore = getState()
      const exported = exportEvents()

      clearEvents()
      replaceEvents(exported)

      const stateAfter = getState()
      expect(stateAfter.sprouts.size).toBe(stateBefore.sprouts.size)
      expect(stateAfter.leaves.size).toBe(stateBefore.leaves.size)
      expect(stateAfter.sunEntries).toHaveLength(stateBefore.sunEntries.length)
      expect(stateAfter.soilCapacity).toBe(stateBefore.soilCapacity)
      expect(stateAfter.soilAvailable).toBe(stateBefore.soilAvailable)
    })
  })
})
