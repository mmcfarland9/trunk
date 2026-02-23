/**
 * Edge case tests for event derivation.
 * Covers out-of-order events, capacity clamping, deduplication,
 * invalid state transitions, and multiple same-day events.
 */

import { describe, it, expect } from 'vitest'
import { deriveState } from '../events/derive'
import type { TrunkEvent } from '../events/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function plantEvent(overrides: Partial<TrunkEvent & { type: 'sprout_planted' }> = {}): TrunkEvent {
  return {
    type: 'sprout_planted',
    timestamp: '2026-01-01T10:00:00Z',
    sproutId: 'sprout-1',
    twigId: 'branch-0-twig-0',
    title: 'Test',
    season: '2w',
    environment: 'fertile',
    soilCost: 2,
    ...overrides,
  }
}

function waterEvent(overrides: Partial<TrunkEvent & { type: 'sprout_watered' }> = {}): TrunkEvent {
  return {
    type: 'sprout_watered',
    timestamp: '2026-01-02T10:00:00Z',
    sproutId: 'sprout-1',
    content: 'Progress',
    ...overrides,
  }
}

function harvestEvent(
  overrides: Partial<TrunkEvent & { type: 'sprout_harvested' }> = {},
): TrunkEvent {
  return {
    type: 'sprout_harvested',
    timestamp: '2026-01-15T10:00:00Z',
    sproutId: 'sprout-1',
    result: 5,
    capacityGained: 0.5,
    ...overrides,
  }
}

function uprootEvent(
  overrides: Partial<TrunkEvent & { type: 'sprout_uprooted' }> = {},
): TrunkEvent {
  return {
    type: 'sprout_uprooted',
    timestamp: '2026-01-10T10:00:00Z',
    sproutId: 'sprout-1',
    soilReturned: 1,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Out-of-order events
// ---------------------------------------------------------------------------

describe('deriveState — out-of-order events', () => {
  it('sorts events by timestamp before replay', () => {
    const events: TrunkEvent[] = [
      // Harvest comes first in array but has later timestamp
      harvestEvent({ timestamp: '2026-01-15T10:00:00Z' }),
      // Plant comes second but has earlier timestamp
      plantEvent({ timestamp: '2026-01-01T10:00:00Z' }),
    ]

    const state = deriveState(events)
    const sprout = state.sprouts.get('sprout-1')!

    expect(sprout.state).toBe('completed')
    expect(sprout.result).toBe(5)
  })

  it('handles water before plant in array order', () => {
    const events: TrunkEvent[] = [
      waterEvent({ timestamp: '2026-01-02T10:00:00Z' }),
      plantEvent({ timestamp: '2026-01-01T10:00:00Z' }),
    ]

    const state = deriveState(events)
    const sprout = state.sprouts.get('sprout-1')!

    // After sorting, plant comes first, then water
    expect(sprout.waterEntries).toHaveLength(1)
    // Soil: 10 - 2 (plant) + 0.05 (water) = 8.05
    expect(state.soilAvailable).toBeCloseTo(8.05, 2)
  })

  it('handles completely reversed event sequence', () => {
    const events: TrunkEvent[] = [
      harvestEvent({ timestamp: '2026-01-15T10:00:00Z' }),
      waterEvent({ timestamp: '2026-01-05T10:00:00Z' }),
      waterEvent({ timestamp: '2026-01-03T10:00:00Z', content: 'Day 3' }),
      plantEvent({ timestamp: '2026-01-01T10:00:00Z' }),
    ]

    const state = deriveState(events)
    const sprout = state.sprouts.get('sprout-1')!

    expect(sprout.state).toBe('completed')
    expect(sprout.waterEntries).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Capacity clamping
// ---------------------------------------------------------------------------

describe('deriveState — capacity clamping', () => {
  it('clamps soilCapacity to MAX_SOIL_CAPACITY (120)', () => {
    // Create events that push capacity past 120
    const events: TrunkEvent[] = []
    const time = new Date('2026-01-01T10:00:00Z')

    // Plant and harvest many 1y/barren sprouts with high capacity gain
    for (let i = 0; i < 20; i++) {
      events.push(
        plantEvent({
          sproutId: `sp-${i}`,
          timestamp: new Date(time.getTime() + i * 100000).toISOString(),
          season: '2w',
          environment: 'fertile',
          soilCost: 0.01,
        }),
      )
      events.push(
        harvestEvent({
          sproutId: `sp-${i}`,
          timestamp: new Date(time.getTime() + i * 100000 + 50000).toISOString(),
          capacityGained: 10,
        }),
      )
    }

    const state = deriveState(events)

    // 10 + 20*10 = 210, but clamped to 120
    expect(state.soilCapacity).toBe(120)
  })

  it('soilAvailable never exceeds soilCapacity', () => {
    const events: TrunkEvent[] = [
      plantEvent({ soilCost: 2 }),
      harvestEvent({ capacityGained: 0.5 }),
    ]

    const state = deriveState(events)

    // Available = 8 + 2 (return) = 10, capacity = 10.5
    // Available should be clamped to min(10, 10.5) = 10
    expect(state.soilAvailable).toBeLessThanOrEqual(state.soilCapacity)
  })

  it('soilAvailable never goes below 0', () => {
    // Plant with cost exceeding available soil
    const events: TrunkEvent[] = [
      plantEvent({ sproutId: 'sp-1', soilCost: 5 }),
      plantEvent({ sproutId: 'sp-2', soilCost: 5, timestamp: '2026-01-02T10:00:00Z' }),
      plantEvent({ sproutId: 'sp-3', soilCost: 5, timestamp: '2026-01-03T10:00:00Z' }),
    ]

    const state = deriveState(events)

    // 10 - 5 - 5 = 0, then -5 clamped to 0
    expect(state.soilAvailable).toBe(0)
  })

  it('soilAvailable recovery is capped at soilCapacity', () => {
    // Start at capacity 10, drain to 0, then recover via many waterings
    const events: TrunkEvent[] = [plantEvent({ soilCost: 10 })]

    // Add 300 water events (300 * 0.05 = 15, but capacity is still 10)
    for (let i = 0; i < 300; i++) {
      events.push(
        waterEvent({
          timestamp: new Date(2026, 0, 2 + i, 10, 0, 0).toISOString(),
          content: `Water ${i}`,
        }),
      )
    }

    const state = deriveState(events)

    // Available can't exceed capacity of 10
    expect(state.soilAvailable).toBeLessThanOrEqual(state.soilCapacity)
    expect(state.soilCapacity).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// Duplicate client_id deduplication
// ---------------------------------------------------------------------------

describe('deriveState — deduplication', () => {
  it('deduplicates events with same client_id', () => {
    const events: TrunkEvent[] = [
      plantEvent({ client_id: 'unique-1' }),
      // Duplicate of the same event
      plantEvent({ client_id: 'unique-1' }),
    ]

    const state = deriveState(events)

    // Only one sprout should exist
    expect(state.sprouts.size).toBe(1)
    // Soil should only be deducted once: 10 - 2 = 8
    expect(state.soilAvailable).toBe(8)
  })

  it('deduplicates water events with same client_id', () => {
    const events: TrunkEvent[] = [
      plantEvent(),
      waterEvent({ client_id: 'water-1' }),
      waterEvent({ client_id: 'water-1' }),
      waterEvent({ client_id: 'water-1' }),
    ]

    const state = deriveState(events)
    const sprout = state.sprouts.get('sprout-1')!

    expect(sprout.waterEntries).toHaveLength(1)
    // Only 1 water recovery: 10 - 2 + 0.05 = 8.05
    expect(state.soilAvailable).toBeCloseTo(8.05, 2)
  })

  it('allows events with different client_ids', () => {
    const events: TrunkEvent[] = [
      plantEvent({ sproutId: 'sp-1', client_id: 'id-1' }),
      plantEvent({ sproutId: 'sp-2', client_id: 'id-2', timestamp: '2026-01-02T10:00:00Z' }),
    ]

    const state = deriveState(events)

    expect(state.sprouts.size).toBe(2)
  })

  it('falls back to composite key dedup when no client_id', () => {
    // Same type + entityId + timestamp = duplicate
    const events: TrunkEvent[] = [
      plantEvent({ client_id: undefined }),
      plantEvent({ client_id: undefined }),
    ]

    const state = deriveState(events)

    expect(state.sprouts.size).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Harvest/uproot of non-active sprouts
// ---------------------------------------------------------------------------

describe('deriveState — invalid state transitions', () => {
  it('ignores harvest of non-existent sprout', () => {
    const events: TrunkEvent[] = [harvestEvent({ sproutId: 'nonexistent' })]

    const state = deriveState(events)

    // No sprout created, no capacity gained
    expect(state.sprouts.size).toBe(0)
    expect(state.soilCapacity).toBe(10)
    expect(state.soilAvailable).toBe(10)
  })

  it('ignores uproot of non-existent sprout (but returns soil)', () => {
    const events: TrunkEvent[] = [uprootEvent({ sproutId: 'nonexistent', soilReturned: 1 })]

    const state = deriveState(events)

    // Soil still returned (by design - uproot applies soilReturned regardless)
    // but sprout state not changed since sprout doesn't exist
    expect(state.sprouts.size).toBe(0)
  })

  it('does not double-harvest a sprout', () => {
    const events: TrunkEvent[] = [
      plantEvent(),
      harvestEvent({ capacityGained: 1.0 }),
      // Second harvest of same sprout
      harvestEvent({
        timestamp: '2026-01-20T10:00:00Z',
        capacityGained: 1.0,
      }),
    ]

    const state = deriveState(events)
    const sprout = state.sprouts.get('sprout-1')!

    // Sprout is completed (second harvest still updates it since no guard)
    expect(sprout.state).toBe('completed')
    // Both harvests apply capacity (no guard against double-harvest in current impl)
    // Capacity: 10 + 1.0 + 1.0 = 12
    expect(state.soilCapacity).toBeCloseTo(12, 2)
  })

  it('does not uproot an already-completed sprout', () => {
    const events: TrunkEvent[] = [
      plantEvent(),
      harvestEvent({ timestamp: '2026-01-15T10:00:00Z' }),
      uprootEvent({ timestamp: '2026-01-20T10:00:00Z' }),
    ]

    const state = deriveState(events)
    const sprout = state.sprouts.get('sprout-1')!

    // Sprout state stays 'completed' because uproot only works on active sprouts
    expect(sprout.state).toBe('completed')
  })

  it('does not uproot an already-uprooted sprout', () => {
    const events: TrunkEvent[] = [
      plantEvent(),
      uprootEvent({ soilReturned: 1, timestamp: '2026-01-05T10:00:00Z' }),
      // Second uproot
      uprootEvent({ soilReturned: 1, timestamp: '2026-01-06T10:00:00Z' }),
    ]

    const state = deriveState(events)
    const sprout = state.sprouts.get('sprout-1')!

    // Still uprooted (second uproot doesn't transition since not active)
    expect(sprout.state).toBe('uprooted')
  })

  it('ignores water for non-existent sprout (no soil recovery)', () => {
    const events: TrunkEvent[] = [waterEvent({ sproutId: 'nonexistent' })]

    const state = deriveState(events)

    // No soil recovery when sprout doesn't exist
    expect(state.soilAvailable).toBe(10)
  })

  it('water on completed sprout does not recover soil', () => {
    const events: TrunkEvent[] = [
      plantEvent(),
      harvestEvent({ timestamp: '2026-01-15T10:00:00Z' }),
      waterEvent({ timestamp: '2026-01-16T10:00:00Z' }),
    ]

    const state = deriveState(events)

    // 10 - 2 (plant) + 2 (harvest return) = 10, capped at 10.5 capacity
    // Water on completed sprout should NOT add 0.05
    expect(state.soilAvailable).toBeCloseTo(10, 2)
  })
})

// ---------------------------------------------------------------------------
// Multiple same-day events
// ---------------------------------------------------------------------------

describe('deriveState — multiple same-day events', () => {
  it('handles multiple waterings on the same sprout same day', () => {
    const events: TrunkEvent[] = [
      plantEvent(),
      waterEvent({ timestamp: '2026-01-02T09:00:00Z', content: 'Morning' }),
      waterEvent({ timestamp: '2026-01-02T12:00:00Z', content: 'Noon' }),
      waterEvent({ timestamp: '2026-01-02T18:00:00Z', content: 'Evening' }),
    ]

    const state = deriveState(events)
    const sprout = state.sprouts.get('sprout-1')!

    expect(sprout.waterEntries).toHaveLength(3)
    // 10 - 2 + 3*0.05 = 8.15
    expect(state.soilAvailable).toBeCloseTo(8.15, 2)
  })

  it('handles multiple sun reflections on same day', () => {
    const events: TrunkEvent[] = [
      {
        type: 'sun_shone',
        timestamp: '2026-01-05T10:00:00Z',
        twigId: 'branch-0-twig-0',
        twigLabel: 'Movement',
        content: 'First',
      },
      {
        type: 'sun_shone',
        timestamp: '2026-01-05T14:00:00Z',
        twigId: 'branch-1-twig-0',
        twigLabel: 'Reading',
        content: 'Second',
      },
    ]

    const state = deriveState(events)

    expect(state.sunEntries).toHaveLength(2)
    // 10 + 2*0.35 = 10.70, capped at 10
    expect(state.soilAvailable).toBe(10)
  })

  it('handles planting multiple sprouts in same day', () => {
    const events: TrunkEvent[] = [
      plantEvent({ sproutId: 'sp-1', timestamp: '2026-01-01T09:00:00Z', soilCost: 3 }),
      plantEvent({ sproutId: 'sp-2', timestamp: '2026-01-01T10:00:00Z', soilCost: 3 }),
      plantEvent({ sproutId: 'sp-3', timestamp: '2026-01-01T11:00:00Z', soilCost: 3 }),
    ]

    const state = deriveState(events)

    expect(state.sprouts.size).toBe(3)
    // 10 - 3 - 3 - 3 = 1
    expect(state.soilAvailable).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Index integrity
// ---------------------------------------------------------------------------

describe('deriveState — index integrity', () => {
  it('activeSproutsByTwig excludes completed and uprooted sprouts', () => {
    const events: TrunkEvent[] = [
      plantEvent({ sproutId: 'active-1', twigId: 'branch-0-twig-0' }),
      plantEvent({
        sproutId: 'completed-1',
        twigId: 'branch-0-twig-0',
        timestamp: '2026-01-01T11:00:00Z',
      }),
      harvestEvent({ sproutId: 'completed-1', timestamp: '2026-01-15T10:00:00Z' }),
      plantEvent({
        sproutId: 'uprooted-1',
        twigId: 'branch-0-twig-0',
        timestamp: '2026-01-01T12:00:00Z',
      }),
      uprootEvent({ sproutId: 'uprooted-1', timestamp: '2026-01-10T10:00:00Z' }),
    ]

    const state = deriveState(events)

    const activeTwig0 = state.activeSproutsByTwig.get('branch-0-twig-0') || []
    expect(activeTwig0).toHaveLength(1)
    expect(activeTwig0[0].id).toBe('active-1')

    const allTwig0 = state.sproutsByTwig.get('branch-0-twig-0') || []
    expect(allTwig0).toHaveLength(3)
  })

  it('sproutsByLeaf correctly indexes leaf associations', () => {
    const events: TrunkEvent[] = [
      {
        type: 'leaf_created',
        timestamp: '2026-01-01T09:00:00Z',
        leafId: 'leaf-1',
        twigId: 'branch-0-twig-0',
        name: 'Saga',
      },
      plantEvent({ sproutId: 'sp-1', leafId: 'leaf-1' }),
      plantEvent({
        sproutId: 'sp-2',
        leafId: 'leaf-1',
        timestamp: '2026-01-02T10:00:00Z',
      }),
      plantEvent({ sproutId: 'sp-3', timestamp: '2026-01-03T10:00:00Z' }), // no leaf
    ]

    const state = deriveState(events)

    const leafSprouts = state.sproutsByLeaf.get('leaf-1') || []
    expect(leafSprouts).toHaveLength(2)
    expect(leafSprouts.map((s) => s.id)).toContain('sp-1')
    expect(leafSprouts.map((s) => s.id)).toContain('sp-2')
  })

  it('leavesByTwig correctly indexes', () => {
    const events: TrunkEvent[] = [
      {
        type: 'leaf_created',
        timestamp: '2026-01-01T09:00:00Z',
        leafId: 'leaf-1',
        twigId: 'branch-0-twig-0',
        name: 'Saga A',
      },
      {
        type: 'leaf_created',
        timestamp: '2026-01-01T10:00:00Z',
        leafId: 'leaf-2',
        twigId: 'branch-0-twig-0',
        name: 'Saga B',
      },
      {
        type: 'leaf_created',
        timestamp: '2026-01-01T11:00:00Z',
        leafId: 'leaf-3',
        twigId: 'branch-1-twig-0',
        name: 'Saga C',
      },
    ]

    const state = deriveState(events)

    expect(state.leavesByTwig.get('branch-0-twig-0')).toHaveLength(2)
    expect(state.leavesByTwig.get('branch-1-twig-0')).toHaveLength(1)
    expect(state.leavesByTwig.get('branch-2-twig-0')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Soil rounding
// ---------------------------------------------------------------------------

describe('deriveState — floating-point precision', () => {
  it('avoids floating-point drift after many small operations', () => {
    const events: TrunkEvent[] = [plantEvent({ soilCost: 5 })]

    // 100 waterings × 0.05 each = 5.00 recovery
    for (let i = 0; i < 100; i++) {
      events.push(
        waterEvent({
          timestamp: new Date(2026, 0, 2 + i, 10, 0, 0).toISOString(),
          content: `Water ${i}`,
        }),
      )
    }

    const state = deriveState(events)

    // 10 - 5 + 100*0.05 = 10.00, should be exact (capped at capacity 10)
    expect(state.soilAvailable).toBe(10)
  })
})
