/**
 * Tests for services/sync-types.ts
 * Tests localToSyncPayload conversion, syncToLocalEvent round-trip,
 * and validateSyncPayload rejection of invalid payloads.
 */

import { describe, it, expect } from 'vitest'
import { localToSyncPayload, syncToLocalEvent } from '../services/sync-types'
import type { SyncEvent } from '../services/sync-types'
import type { TrunkEvent } from '../events/types'

const TEST_USER_ID = 'user-abc-123'

function makeSyncEvent(overrides: Partial<SyncEvent> = {}): SyncEvent {
  return {
    id: 'sync-1',
    user_id: TEST_USER_ID,
    type: 'sprout_planted',
    payload: {
      type: 'sprout_planted',
      timestamp: '2024-06-15T12:00:00Z',
      sproutId: 'sprout-1',
      twigId: 'branch-0-twig-0',
      title: 'Test goal',
      season: '1m',
      environment: 'fertile',
      soilCost: 3,
      leafId: 'leaf-default',
    },
    client_id: 'client-1',
    client_timestamp: '2024-06-15T12:00:00Z',
    created_at: '2024-06-15T12:00:01Z',
    ...overrides,
  }
}

describe('localToSyncPayload', () => {
  it('converts sprout_planted event', () => {
    const event: TrunkEvent = {
      type: 'sprout_planted',
      timestamp: '2024-06-15T12:00:00Z',
      sproutId: 'sprout-1',
      twigId: 'branch-0-twig-0',
      title: 'Learn piano',
      season: '3m',
      environment: 'firm',
      soilCost: 8,
      leafId: 'leaf-default',
      client_id: 'client-abc',
    }

    const result = localToSyncPayload(event, TEST_USER_ID)

    expect(result.user_id).toBe(TEST_USER_ID)
    expect(result.type).toBe('sprout_planted')
    expect(result.client_id).toBe('client-abc')
    expect(result.client_timestamp).toBe('2024-06-15T12:00:00Z')
    expect(result.payload).toEqual(event)
  })

  it('converts sprout_watered event', () => {
    const event: TrunkEvent = {
      type: 'sprout_watered',
      timestamp: '2024-06-16T08:00:00Z',
      sproutId: 'sprout-1',
      content: 'Made progress today',
      client_id: 'client-def',
    }

    const result = localToSyncPayload(event, TEST_USER_ID)

    expect(result.type).toBe('sprout_watered')
    expect(result.client_timestamp).toBe('2024-06-16T08:00:00Z')
  })

  it('converts sprout_harvested event', () => {
    const event: TrunkEvent = {
      type: 'sprout_harvested',
      timestamp: '2024-09-15T12:00:00Z',
      sproutId: 'sprout-1',
      result: 4,
      capacityGained: 1.5,
      client_id: 'client-ghi',
    }

    const result = localToSyncPayload(event, TEST_USER_ID)

    expect(result.type).toBe('sprout_harvested')
    expect(result.payload).toEqual(event)
  })

  it('converts sprout_uprooted event', () => {
    const event: TrunkEvent = {
      type: 'sprout_uprooted',
      timestamp: '2024-07-01T12:00:00Z',
      sproutId: 'sprout-2',
      soilReturned: 1.5,
      client_id: 'client-jkl',
    }

    const result = localToSyncPayload(event, TEST_USER_ID)

    expect(result.type).toBe('sprout_uprooted')
  })

  it('converts sun_shone event', () => {
    const event: TrunkEvent = {
      type: 'sun_shone',
      timestamp: '2024-06-17T06:00:00Z',
      twigId: 'branch-0-twig-0',
      twigLabel: 'movement',
      content: 'Reflected on movement',
      client_id: 'client-mno',
    }

    const result = localToSyncPayload(event, TEST_USER_ID)

    expect(result.type).toBe('sun_shone')
  })

  it('converts leaf_created event', () => {
    const event: TrunkEvent = {
      type: 'leaf_created',
      timestamp: '2024-06-15T12:00:00Z',
      leafId: 'leaf-1',
      twigId: 'branch-0-twig-0',
      name: 'Fitness Journey',
      client_id: 'client-pqr',
    }

    const result = localToSyncPayload(event, TEST_USER_ID)

    expect(result.type).toBe('leaf_created')
  })

  it('generates client_id when event has none', () => {
    const event: TrunkEvent = {
      type: 'sprout_watered',
      timestamp: '2024-06-16T08:00:00Z',
      sproutId: 'sprout-1',
      content: 'Watered',
    }

    const result = localToSyncPayload(event, TEST_USER_ID)

    expect(result.client_id).toBeTruthy()
    expect(typeof result.client_id).toBe('string')
    expect(result.client_id.length).toBeGreaterThan(0)
  })

  it('preserves existing client_id from event', () => {
    const event: TrunkEvent = {
      type: 'sprout_watered',
      timestamp: '2024-06-16T08:00:00Z',
      sproutId: 'sprout-1',
      content: 'Watered',
      client_id: 'my-custom-id',
    }

    const result = localToSyncPayload(event, TEST_USER_ID)

    expect(result.client_id).toBe('my-custom-id')
  })
})

describe('syncToLocalEvent', () => {
  it('round-trips sprout_planted', () => {
    const sync = makeSyncEvent()
    const result = syncToLocalEvent(sync)

    expect(result).not.toBeNull()
    expect(result!.type).toBe('sprout_planted')
    expect(result!.timestamp).toBe('2024-06-15T12:00:00Z')
    expect(result!.client_id).toBe('client-1')
    if (result!.type === 'sprout_planted') {
      expect(result!.sproutId).toBe('sprout-1')
      expect(result!.title).toBe('Test goal')
      expect(result!.season).toBe('1m')
      expect(result!.environment).toBe('fertile')
      expect(result!.soilCost).toBe(3)
    }
  })

  it('round-trips sprout_watered', () => {
    const sync = makeSyncEvent({
      type: 'sprout_watered',
      payload: {
        type: 'sprout_watered',
        timestamp: '2024-06-16T08:00:00Z',
        sproutId: 'sprout-1',
        content: 'Good day',
      },
      client_timestamp: '2024-06-16T08:00:00Z',
    })

    const result = syncToLocalEvent(sync)

    expect(result).not.toBeNull()
    expect(result!.type).toBe('sprout_watered')
  })

  it('round-trips sprout_harvested', () => {
    const sync = makeSyncEvent({
      type: 'sprout_harvested',
      payload: {
        type: 'sprout_harvested',
        timestamp: '2024-09-15T12:00:00Z',
        sproutId: 'sprout-1',
        result: 4,
        capacityGained: 1.5,
      },
      client_timestamp: '2024-09-15T12:00:00Z',
    })

    const result = syncToLocalEvent(sync)

    expect(result).not.toBeNull()
    expect(result!.type).toBe('sprout_harvested')
  })

  it('round-trips sprout_uprooted', () => {
    const sync = makeSyncEvent({
      type: 'sprout_uprooted',
      payload: {
        type: 'sprout_uprooted',
        timestamp: '2024-07-01T12:00:00Z',
        sproutId: 'sprout-2',
        soilReturned: 1.5,
      },
      client_timestamp: '2024-07-01T12:00:00Z',
    })

    const result = syncToLocalEvent(sync)

    expect(result).not.toBeNull()
    expect(result!.type).toBe('sprout_uprooted')
  })

  it('round-trips sun_shone', () => {
    const sync = makeSyncEvent({
      type: 'sun_shone',
      payload: {
        type: 'sun_shone',
        timestamp: '2024-06-17T06:00:00Z',
        twigId: 'branch-0-twig-0',
        twigLabel: 'movement',
        content: 'Reflected',
      },
      client_timestamp: '2024-06-17T06:00:00Z',
    })

    const result = syncToLocalEvent(sync)

    expect(result).not.toBeNull()
    expect(result!.type).toBe('sun_shone')
  })

  it('round-trips leaf_created', () => {
    const sync = makeSyncEvent({
      type: 'leaf_created',
      payload: {
        type: 'leaf_created',
        timestamp: '2024-06-15T12:00:00Z',
        leafId: 'leaf-1',
        twigId: 'branch-0-twig-0',
        name: 'Fitness Journey',
      },
      client_timestamp: '2024-06-15T12:00:00Z',
    })

    const result = syncToLocalEvent(sync)

    expect(result).not.toBeNull()
    expect(result!.type).toBe('leaf_created')
  })

  it('merges type from top-level column when payload lacks it (iOS format)', () => {
    const sync = makeSyncEvent({
      type: 'sprout_watered',
      payload: {
        // iOS stores only domain fields, no type/timestamp in payload
        sproutId: 'sprout-1',
        content: 'Good session',
      },
      client_timestamp: '2024-06-16T08:00:00Z',
    })

    const result = syncToLocalEvent(sync)

    expect(result).not.toBeNull()
    expect(result!.type).toBe('sprout_watered')
    expect(result!.timestamp).toBe('2024-06-16T08:00:00Z')
  })
})

describe('syncToLocalEvent validation (via validateSyncPayload)', () => {
  it('throws on null payload (not guarded before merge)', () => {
    const sync = makeSyncEvent({ payload: null as unknown as Record<string, unknown> })
    expect(() => syncToLocalEvent(sync)).toThrow()
  })

  it('rejects missing type', () => {
    const sync = makeSyncEvent({
      type: '' as 'sprout_planted',
      payload: {
        timestamp: '2024-06-15T12:00:00Z',
        sproutId: 'sprout-1',
      },
    })
    expect(syncToLocalEvent(sync)).toBeNull()
  })

  it('rejects unknown event type', () => {
    const sync = makeSyncEvent({
      type: 'sprout_deleted' as 'sprout_planted',
      payload: {
        type: 'sprout_deleted',
        timestamp: '2024-06-15T12:00:00Z',
        sproutId: 'sprout-1',
      },
    })
    expect(syncToLocalEvent(sync)).toBeNull()
  })

  it('rejects missing timestamp', () => {
    const sync = makeSyncEvent({
      payload: {
        type: 'sprout_planted',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '1m',
        environment: 'fertile',
        soilCost: 3,
      },
      client_timestamp: '',
    })
    expect(syncToLocalEvent(sync)).toBeNull()
  })

  it('rejects sprout_planted with missing sproutId', () => {
    const sync = makeSyncEvent({
      payload: {
        type: 'sprout_planted',
        timestamp: '2024-06-15T12:00:00Z',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '1m',
        environment: 'fertile',
        soilCost: 3,
      },
    })
    expect(syncToLocalEvent(sync)).toBeNull()
  })

  it('rejects sprout_planted with invalid season', () => {
    const sync = makeSyncEvent({
      payload: {
        type: 'sprout_planted',
        timestamp: '2024-06-15T12:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: 'invalid',
        environment: 'fertile',
        soilCost: 3,
      },
    })
    expect(syncToLocalEvent(sync)).toBeNull()
  })

  it('rejects sprout_planted with invalid environment', () => {
    const sync = makeSyncEvent({
      payload: {
        type: 'sprout_planted',
        timestamp: '2024-06-15T12:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '1m',
        environment: 'unknown',
        soilCost: 3,
      },
    })
    expect(syncToLocalEvent(sync)).toBeNull()
  })

  it('rejects sprout_planted with negative soilCost', () => {
    const sync = makeSyncEvent({
      payload: {
        type: 'sprout_planted',
        timestamp: '2024-06-15T12:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Test',
        season: '1m',
        environment: 'fertile',
        soilCost: -1,
      },
    })
    expect(syncToLocalEvent(sync)).toBeNull()
  })

  it('rejects sprout_harvested with result out of range', () => {
    const sync = makeSyncEvent({
      type: 'sprout_harvested',
      payload: {
        type: 'sprout_harvested',
        timestamp: '2024-09-15T12:00:00Z',
        sproutId: 'sprout-1',
        result: 6,
        capacityGained: 1,
      },
      client_timestamp: '2024-09-15T12:00:00Z',
    })
    expect(syncToLocalEvent(sync)).toBeNull()
  })

  it('rejects sprout_harvested with result 0', () => {
    const sync = makeSyncEvent({
      type: 'sprout_harvested',
      payload: {
        type: 'sprout_harvested',
        timestamp: '2024-09-15T12:00:00Z',
        sproutId: 'sprout-1',
        result: 0,
        capacityGained: 1,
      },
      client_timestamp: '2024-09-15T12:00:00Z',
    })
    expect(syncToLocalEvent(sync)).toBeNull()
  })

  it('rejects sprout_harvested with negative capacityGained', () => {
    const sync = makeSyncEvent({
      type: 'sprout_harvested',
      payload: {
        type: 'sprout_harvested',
        timestamp: '2024-09-15T12:00:00Z',
        sproutId: 'sprout-1',
        result: 4,
        capacityGained: -1,
      },
      client_timestamp: '2024-09-15T12:00:00Z',
    })
    expect(syncToLocalEvent(sync)).toBeNull()
  })

  it('rejects leaf_created with missing name', () => {
    const sync = makeSyncEvent({
      type: 'leaf_created',
      payload: {
        type: 'leaf_created',
        timestamp: '2024-06-15T12:00:00Z',
        leafId: 'leaf-1',
      },
      client_timestamp: '2024-06-15T12:00:00Z',
    })
    expect(syncToLocalEvent(sync)).toBeNull()
  })

  it('handles extra/unknown fields gracefully (does not reject)', () => {
    const sync = makeSyncEvent({
      payload: {
        type: 'sprout_planted',
        timestamp: '2024-06-15T12:00:00Z',
        sproutId: 'sprout-1',
        twigId: 'branch-0-twig-0',
        title: 'Test goal',
        season: '1m',
        environment: 'fertile',
        soilCost: 3,
        leafId: 'leaf-default',
        extraField: 'should be ignored',
        anotherUnknown: 42,
      },
    })
    const result = syncToLocalEvent(sync)
    expect(result).not.toBeNull()
    expect(result!.type).toBe('sprout_planted')
  })
})
