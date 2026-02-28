/**
 * Tests for the sprout_edited event type.
 * Covers derivation (sparse merge), validation, and sync round-trip.
 */

import { describe, it, expect } from 'vitest'
import { deriveState } from '../events/derive'
import { validateEvent } from '../events/types'
import { localToSyncPayload, syncToLocalEvent } from '../services/sync-types'
import type { SyncEvent } from '../services/sync-types'
import type { TrunkEvent } from '../events/types'

const TEST_USER_ID = 'user-test-123'

function plantEvent(overrides: Partial<TrunkEvent> = {}): TrunkEvent {
  return {
    type: 'sprout_planted',
    timestamp: '2026-01-01T10:00:00.000Z',
    sproutId: 'sprout-1',
    twigId: 'branch-0-twig-0',
    title: 'Original Title',
    season: '1m',
    environment: 'fertile',
    soilCost: 3,
    leafId: 'leaf-1',
    bloomWither: 'fail outcome',
    bloomBudding: 'moderate outcome',
    bloomFlourish: 'best outcome',
    ...overrides,
  } as TrunkEvent
}

describe('sprout_edited — derivation', () => {
  it('updates title when title field is present', () => {
    const events: TrunkEvent[] = [
      plantEvent(),
      {
        type: 'sprout_edited',
        timestamp: '2026-01-02T10:00:00.000Z',
        sproutId: 'sprout-1',
        title: 'Updated Title',
      } as TrunkEvent,
    ]

    const state = deriveState(events)
    const sprout = state.sprouts.get('sprout-1')!
    expect(sprout.title).toBe('Updated Title')
    // Other fields unchanged
    expect(sprout.season).toBe('1m')
    expect(sprout.environment).toBe('fertile')
    expect(sprout.soilCost).toBe(3)
    expect(sprout.bloomWither).toBe('fail outcome')
    expect(sprout.bloomBudding).toBe('moderate outcome')
    expect(sprout.bloomFlourish).toBe('best outcome')
    expect(sprout.leafId).toBe('leaf-1')
  })

  it('updates bloom fields when present', () => {
    const events: TrunkEvent[] = [
      plantEvent(),
      {
        type: 'sprout_edited',
        timestamp: '2026-01-02T10:00:00.000Z',
        sproutId: 'sprout-1',
        bloomWither: 'new fail',
        bloomFlourish: 'new best',
      } as TrunkEvent,
    ]

    const state = deriveState(events)
    const sprout = state.sprouts.get('sprout-1')!
    expect(sprout.bloomWither).toBe('new fail')
    expect(sprout.bloomBudding).toBe('moderate outcome') // unchanged
    expect(sprout.bloomFlourish).toBe('new best')
    expect(sprout.title).toBe('Original Title') // unchanged
  })

  it('updates leafId when present', () => {
    const events: TrunkEvent[] = [
      plantEvent(),
      {
        type: 'sprout_edited',
        timestamp: '2026-01-02T10:00:00.000Z',
        sproutId: 'sprout-1',
        leafId: 'leaf-2',
      } as TrunkEvent,
    ]

    const state = deriveState(events)
    const sprout = state.sprouts.get('sprout-1')!
    expect(sprout.leafId).toBe('leaf-2')
    expect(sprout.title).toBe('Original Title') // unchanged
  })

  it('does not modify sprout when no optional fields present', () => {
    const events: TrunkEvent[] = [
      plantEvent(),
      {
        type: 'sprout_edited',
        timestamp: '2026-01-02T10:00:00.000Z',
        sproutId: 'sprout-1',
      } as TrunkEvent,
    ]

    const state = deriveState(events)
    const sprout = state.sprouts.get('sprout-1')!
    expect(sprout.title).toBe('Original Title')
    expect(sprout.bloomWither).toBe('fail outcome')
    expect(sprout.leafId).toBe('leaf-1')
  })

  it('ignores edit for non-existent sprout', () => {
    const events: TrunkEvent[] = [
      plantEvent(),
      {
        type: 'sprout_edited',
        timestamp: '2026-01-02T10:00:00.000Z',
        sproutId: 'sprout-nonexistent',
        title: 'Should Not Appear',
      } as TrunkEvent,
    ]

    const state = deriveState(events)
    const sprout = state.sprouts.get('sprout-1')!
    expect(sprout.title).toBe('Original Title')
    expect(state.sprouts.has('sprout-nonexistent')).toBe(false)
  })

  it('applies multiple edits in sequence', () => {
    const events: TrunkEvent[] = [
      plantEvent(),
      {
        type: 'sprout_edited',
        timestamp: '2026-01-02T10:00:00.000Z',
        sproutId: 'sprout-1',
        title: 'First Edit',
      } as TrunkEvent,
      {
        type: 'sprout_edited',
        timestamp: '2026-01-03T10:00:00.000Z',
        sproutId: 'sprout-1',
        title: 'Second Edit',
        bloomBudding: 'new budding',
      } as TrunkEvent,
    ]

    const state = deriveState(events)
    const sprout = state.sprouts.get('sprout-1')!
    expect(sprout.title).toBe('Second Edit')
    expect(sprout.bloomBudding).toBe('new budding')
    expect(sprout.bloomWither).toBe('fail outcome') // unchanged from plant
  })

  it('does not affect soil/capacity', () => {
    const events: TrunkEvent[] = [
      plantEvent(),
      {
        type: 'sprout_edited',
        timestamp: '2026-01-02T10:00:00.000Z',
        sproutId: 'sprout-1',
        title: 'Changed',
      } as TrunkEvent,
    ]

    const state = deriveState(events)
    // Starting 10 - 3 (soilCost) = 7
    expect(state.soilAvailable).toBe(7)
    expect(state.soilCapacity).toBe(10)
  })

  it('updates indexes when leafId changes', () => {
    const events: TrunkEvent[] = [
      {
        type: 'leaf_created',
        timestamp: '2026-01-01T09:00:00.000Z',
        leafId: 'leaf-1',
        twigId: 'branch-0-twig-0',
        name: 'Leaf One',
      } as TrunkEvent,
      {
        type: 'leaf_created',
        timestamp: '2026-01-01T09:01:00.000Z',
        leafId: 'leaf-2',
        twigId: 'branch-0-twig-0',
        name: 'Leaf Two',
      } as TrunkEvent,
      plantEvent({ leafId: 'leaf-1' }),
      {
        type: 'sprout_edited',
        timestamp: '2026-01-02T10:00:00.000Z',
        sproutId: 'sprout-1',
        leafId: 'leaf-2',
      } as TrunkEvent,
    ]

    const state = deriveState(events)
    // Sprout should now be indexed under leaf-2
    const leaf2Sprouts = state.sproutsByLeaf.get('leaf-2') || []
    expect(leaf2Sprouts.length).toBe(1)
    expect(leaf2Sprouts[0].id).toBe('sprout-1')

    // And no longer under leaf-1
    const leaf1Sprouts = state.sproutsByLeaf.get('leaf-1') || []
    expect(leaf1Sprouts.length).toBe(0)
  })
})

describe('sprout_edited — validation', () => {
  it('validates minimal sprout_edited event', () => {
    expect(
      validateEvent({
        type: 'sprout_edited',
        timestamp: '2026-01-02T10:00:00.000Z',
        sproutId: 'sprout-1',
      }),
    ).toBe(true)
  })

  it('validates sprout_edited with optional fields', () => {
    expect(
      validateEvent({
        type: 'sprout_edited',
        timestamp: '2026-01-02T10:00:00.000Z',
        sproutId: 'sprout-1',
        title: 'New Title',
        bloomWither: 'fail',
        leafId: 'leaf-2',
      }),
    ).toBe(true)
  })

  it('rejects sprout_edited without sproutId', () => {
    expect(
      validateEvent({
        type: 'sprout_edited',
        timestamp: '2026-01-02T10:00:00.000Z',
      }),
    ).toBe(false)
  })

  it('rejects sprout_edited with non-string sproutId', () => {
    expect(
      validateEvent({
        type: 'sprout_edited',
        timestamp: '2026-01-02T10:00:00.000Z',
        sproutId: 123,
      }),
    ).toBe(false)
  })
})

describe('sprout_edited — sync round-trip', () => {
  it('converts to sync payload and back', () => {
    const event: TrunkEvent = {
      type: 'sprout_edited',
      timestamp: '2026-01-02T10:00:00.000Z',
      sproutId: 'sprout-1',
      title: 'Edited Title',
      bloomWither: 'new wither',
      client_id: 'client-edit-1',
    } as TrunkEvent

    const payload = localToSyncPayload(event, TEST_USER_ID)
    expect(payload.type).toBe('sprout_edited')
    expect(payload.client_timestamp).toBe('2026-01-02T10:00:00.000Z')

    // Round-trip back
    const syncEvent: SyncEvent = {
      id: 'sync-edit-1',
      user_id: TEST_USER_ID,
      type: payload.type,
      payload: payload.payload,
      client_id: payload.client_id,
      client_timestamp: payload.client_timestamp,
      created_at: '2026-01-02T10:00:01.000Z',
    }

    const local = syncToLocalEvent(syncEvent)
    expect(local).not.toBeNull()
    expect(local!.type).toBe('sprout_edited')
    expect((local as { sproutId: string }).sproutId).toBe('sprout-1')
    expect((local as { title: string }).title).toBe('Edited Title')
    expect((local as { bloomWither: string }).bloomWither).toBe('new wither')
  })

  it('round-trips minimal edit event', () => {
    const event: TrunkEvent = {
      type: 'sprout_edited',
      timestamp: '2026-01-02T10:00:00.000Z',
      sproutId: 'sprout-1',
      client_id: 'client-edit-2',
    } as TrunkEvent

    const payload = localToSyncPayload(event, TEST_USER_ID)
    const syncEvent: SyncEvent = {
      id: 'sync-edit-2',
      user_id: TEST_USER_ID,
      type: payload.type,
      payload: payload.payload,
      client_id: payload.client_id,
      client_timestamp: payload.client_timestamp,
      created_at: '2026-01-02T10:00:01.000Z',
    }

    const local = syncToLocalEvent(syncEvent)
    expect(local).not.toBeNull()
    expect(local!.type).toBe('sprout_edited')
  })

  it('round-trips iOS-style payload (type/timestamp in columns only)', () => {
    // iOS stores domain fields in payload, type/timestamp are separate columns
    const syncEvent: SyncEvent = {
      id: 'sync-edit-3',
      user_id: TEST_USER_ID,
      type: 'sprout_edited',
      payload: {
        sproutId: 'sprout-1',
        title: 'iOS Edit',
      },
      client_id: 'client-edit-3',
      client_timestamp: '2026-01-02T10:00:00.000Z',
      created_at: '2026-01-02T10:00:01.000Z',
    }

    const local = syncToLocalEvent(syncEvent)
    expect(local).not.toBeNull()
    expect(local!.type).toBe('sprout_edited')
    expect((local as { sproutId: string }).sproutId).toBe('sprout-1')
    expect((local as { title: string }).title).toBe('iOS Edit')
  })
})
