/**
 * Tests for services/sync-types.ts
 * Tests: validateSyncPayload (via syncToLocalEvent), localToSyncPayload, syncToLocalEvent
 * for all 6 event types, plus invalid payloads.
 */

import { describe, it, expect } from 'vitest'
import { localToSyncPayload, syncToLocalEvent, generateClientId } from '../services/sync-types'
import type { SyncEvent } from '../services/sync-types'
import type { TrunkEvent } from '../events/types'

// Helper to build a SyncEvent from a payload
function makeSyncEvent(
  payload: Record<string, unknown>,
  overrides?: Partial<SyncEvent>,
): SyncEvent {
  return {
    id: 'sync-1',
    user_id: 'user-123',
    type: (payload.type as string) ?? 'unknown',
    payload,
    client_id: 'client-1',
    client_timestamp: (payload.timestamp as string) ?? '2026-02-15T10:00:00Z',
    created_at: '2026-02-15T10:00:00Z',
    ...overrides,
  }
}

describe('syncToLocalEvent (validates payloads)', () => {
  describe('valid payloads for all 6 event types', () => {
    it('accepts valid sprout_planted', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'sprout_planted',
          timestamp: '2026-02-15T10:00:00Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          title: 'Test Sprout',
          season: '1m',
          environment: 'fertile',
          soilCost: 3,
        }),
      )

      expect(result).not.toBeNull()
      expect(result!.type).toBe('sprout_planted')
      if (result!.type === 'sprout_planted') {
        expect(result!.sproutId).toBe('sprout-1')
        expect(result!.title).toBe('Test Sprout')
        expect(result!.season).toBe('1m')
        expect(result!.environment).toBe('fertile')
        expect(result!.soilCost).toBe(3)
      }
    })

    it('accepts valid sprout_watered', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'sprout_watered',
          timestamp: '2026-02-16T10:00:00Z',
          sproutId: 'sprout-1',
          content: 'Worked on it',
        }),
      )

      expect(result).not.toBeNull()
      expect(result!.type).toBe('sprout_watered')
    })

    it('accepts valid sprout_harvested', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'sprout_harvested',
          timestamp: '2026-03-15T10:00:00Z',
          sproutId: 'sprout-1',
          result: 4,
          capacityGained: 0.47,
        }),
      )

      expect(result).not.toBeNull()
      expect(result!.type).toBe('sprout_harvested')
    })

    it('accepts valid sprout_uprooted', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'sprout_uprooted',
          timestamp: '2026-02-20T10:00:00Z',
          sproutId: 'sprout-1',
          soilReturned: 1.25,
        }),
      )

      expect(result).not.toBeNull()
      expect(result!.type).toBe('sprout_uprooted')
    })

    it('accepts valid sun_shone', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'sun_shone',
          timestamp: '2026-02-17T10:00:00Z',
          twigId: 'branch-0-twig-0',
          twigLabel: 'movement',
          content: 'Weekly reflection',
        }),
      )

      expect(result).not.toBeNull()
      expect(result!.type).toBe('sun_shone')
    })

    it('accepts valid leaf_created', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'leaf_created',
          timestamp: '2026-02-14T10:00:00Z',
          leafId: 'leaf-1',
          twigId: 'branch-0-twig-0',
          name: 'Fitness Journey',
        }),
      )

      expect(result).not.toBeNull()
      expect(result!.type).toBe('leaf_created')
    })
  })

  describe('payloads missing required fields', () => {
    it('rejects sprout_planted missing sproutId', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'sprout_planted',
          timestamp: '2026-02-15T10:00:00Z',
          twigId: 'branch-0-twig-0',
          title: 'Test',
          season: '1m',
          environment: 'fertile',
          soilCost: 3,
        }),
      )
      expect(result).toBeNull()
    })

    it('rejects sprout_planted missing title', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'sprout_planted',
          timestamp: '2026-02-15T10:00:00Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          season: '1m',
          environment: 'fertile',
          soilCost: 3,
        }),
      )
      expect(result).toBeNull()
    })

    it('rejects sprout_watered missing sproutId', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'sprout_watered',
          timestamp: '2026-02-16T10:00:00Z',
          content: 'Did some work',
        }),
      )
      expect(result).toBeNull()
    })

    it('rejects sprout_harvested missing result', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'sprout_harvested',
          timestamp: '2026-03-15T10:00:00Z',
          sproutId: 'sprout-1',
          capacityGained: 0.47,
        }),
      )
      expect(result).toBeNull()
    })

    it('rejects sprout_harvested missing capacityGained', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'sprout_harvested',
          timestamp: '2026-03-15T10:00:00Z',
          sproutId: 'sprout-1',
          result: 4,
        }),
      )
      expect(result).toBeNull()
    })

    it('rejects sprout_uprooted missing sproutId', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'sprout_uprooted',
          timestamp: '2026-02-20T10:00:00Z',
          soilReturned: 1.25,
        }),
      )
      expect(result).toBeNull()
    })

    it('rejects sun_shone missing twigId', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'sun_shone',
          timestamp: '2026-02-17T10:00:00Z',
          twigLabel: 'movement',
          content: 'Reflection',
        }),
      )
      expect(result).toBeNull()
    })

    it('rejects leaf_created missing leafId', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'leaf_created',
          timestamp: '2026-02-14T10:00:00Z',
          twigId: 'branch-0-twig-0',
          name: 'Fitness',
        }),
      )
      expect(result).toBeNull()
    })

    it('rejects leaf_created missing name', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'leaf_created',
          timestamp: '2026-02-14T10:00:00Z',
          leafId: 'leaf-1',
          twigId: 'branch-0-twig-0',
        }),
      )
      expect(result).toBeNull()
    })

    it('rejects payload missing timestamp', () => {
      const result = syncToLocalEvent(
        makeSyncEvent(
          {
            type: 'sprout_watered',
            sproutId: 'sprout-1',
            content: 'Did some work',
          },
          { client_timestamp: '' },
        ),
      )
      expect(result).toBeNull()
    })
  })

  describe('payloads with wrong types', () => {
    it('rejects sprout_planted with numeric title', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'sprout_planted',
          timestamp: '2026-02-15T10:00:00Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          title: 123,
          season: '1m',
          environment: 'fertile',
          soilCost: 3,
        }),
      )
      expect(result).toBeNull()
    })

    it('rejects sprout_planted with string soilCost', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'sprout_planted',
          timestamp: '2026-02-15T10:00:00Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          title: 'Test',
          season: '1m',
          environment: 'fertile',
          soilCost: 'three',
        }),
      )
      expect(result).toBeNull()
    })

    it('rejects sprout_planted with negative soilCost', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'sprout_planted',
          timestamp: '2026-02-15T10:00:00Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          title: 'Test',
          season: '1m',
          environment: 'fertile',
          soilCost: -5,
        }),
      )
      expect(result).toBeNull()
    })

    it('rejects sprout_planted with invalid season', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'sprout_planted',
          timestamp: '2026-02-15T10:00:00Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          title: 'Test',
          season: '5y',
          environment: 'fertile',
          soilCost: 3,
        }),
      )
      expect(result).toBeNull()
    })

    it('rejects sprout_planted with invalid environment', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'sprout_planted',
          timestamp: '2026-02-15T10:00:00Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          title: 'Test',
          season: '1m',
          environment: 'swamp',
          soilCost: 3,
        }),
      )
      expect(result).toBeNull()
    })

    it('rejects sprout_harvested with result out of range (0)', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'sprout_harvested',
          timestamp: '2026-03-15T10:00:00Z',
          sproutId: 'sprout-1',
          result: 0,
          capacityGained: 0.47,
        }),
      )
      expect(result).toBeNull()
    })

    it('rejects sprout_harvested with result out of range (6)', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'sprout_harvested',
          timestamp: '2026-03-15T10:00:00Z',
          sproutId: 'sprout-1',
          result: 6,
          capacityGained: 0.47,
        }),
      )
      expect(result).toBeNull()
    })

    it('rejects sprout_harvested with negative capacityGained', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'sprout_harvested',
          timestamp: '2026-03-15T10:00:00Z',
          sproutId: 'sprout-1',
          result: 3,
          capacityGained: -1,
        }),
      )
      expect(result).toBeNull()
    })

    it('rejects unknown event type', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'sprout_deleted',
          timestamp: '2026-02-15T10:00:00Z',
          sproutId: 'sprout-1',
        }),
      )
      expect(result).toBeNull()
    })

    it('throws on null payload (spread fails on null)', () => {
      expect(() =>
        syncToLocalEvent({
          id: 'sync-1',
          user_id: 'user-123',
          type: 'sprout_planted',
          payload: null as any,
          client_id: 'client-1',
          client_timestamp: '2026-02-15T10:00:00Z',
          created_at: '2026-02-15T10:00:00Z',
        }),
      ).toThrow()
    })
  })

  describe('payloads with extra fields', () => {
    it('accepts sprout_planted with extra fields (passes through)', () => {
      const result = syncToLocalEvent(
        makeSyncEvent({
          type: 'sprout_planted',
          timestamp: '2026-02-15T10:00:00Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          title: 'Test',
          season: '1m',
          environment: 'fertile',
          soilCost: 3,
          extraField: 'ignored',
          anotherExtra: 42,
        }),
      )
      // Extra fields don't invalidate — validation checks required fields only
      expect(result).not.toBeNull()
      expect(result!.type).toBe('sprout_planted')
    })
  })

  describe('iOS format (type/timestamp in top-level columns, not in payload)', () => {
    it('merges type from sync column when missing from payload', () => {
      const result = syncToLocalEvent({
        id: 'sync-1',
        user_id: 'user-123',
        type: 'sprout_watered',
        payload: {
          sproutId: 'sprout-1',
          content: 'Did work',
        },
        client_id: 'client-1',
        client_timestamp: '2026-02-16T10:00:00Z',
        created_at: '2026-02-16T10:00:00Z',
      })

      expect(result).not.toBeNull()
      expect(result!.type).toBe('sprout_watered')
      expect(result!.timestamp).toBe('2026-02-16T10:00:00Z')
    })

    it('merges timestamp from client_timestamp when missing from payload', () => {
      const result = syncToLocalEvent({
        id: 'sync-1',
        user_id: 'user-123',
        type: 'sun_shone',
        payload: {
          twigId: 'branch-0-twig-0',
          twigLabel: 'movement',
          content: 'Reflected',
        },
        client_id: 'client-1',
        client_timestamp: '2026-02-17T10:00:00Z',
        created_at: '2026-02-17T10:00:00Z',
      })

      expect(result).not.toBeNull()
      expect(result!.type).toBe('sun_shone')
      expect(result!.timestamp).toBe('2026-02-17T10:00:00Z')
    })
  })
})

describe('localToSyncPayload', () => {
  it('converts sprout_planted to sync payload', () => {
    const event: TrunkEvent = {
      type: 'sprout_planted',
      timestamp: '2026-02-15T10:00:00Z',
      sproutId: 'sprout-1',
      twigId: 'branch-0-twig-0',
      title: 'Test',
      season: '1m',
      environment: 'fertile',
      soilCost: 3,
      client_id: 'my-client-id',
    }

    const payload = localToSyncPayload(event, 'user-123')

    expect(payload.user_id).toBe('user-123')
    expect(payload.type).toBe('sprout_planted')
    expect(payload.client_id).toBe('my-client-id')
    expect(payload.client_timestamp).toBe('2026-02-15T10:00:00Z')
    expect(payload.payload).toEqual(event)
  })

  it('converts sprout_watered to sync payload', () => {
    const event: TrunkEvent = {
      type: 'sprout_watered',
      timestamp: '2026-02-16T10:00:00Z',
      sproutId: 'sprout-1',
      content: 'Worked on it',
    }

    const payload = localToSyncPayload(event, 'user-123')

    expect(payload.type).toBe('sprout_watered')
    expect(payload.client_timestamp).toBe('2026-02-16T10:00:00Z')
    // Should generate a client_id since event doesn't have one
    expect(payload.client_id).toBeTruthy()
    expect(payload.client_id.length).toBeGreaterThan(0)
  })

  it('converts sprout_harvested to sync payload', () => {
    const event: TrunkEvent = {
      type: 'sprout_harvested',
      timestamp: '2026-03-15T10:00:00Z',
      sproutId: 'sprout-1',
      result: 5,
      capacityGained: 0.62,
      client_id: 'harvest-client',
    }

    const payload = localToSyncPayload(event, 'user-456')

    expect(payload.type).toBe('sprout_harvested')
    expect(payload.user_id).toBe('user-456')
    expect(payload.client_id).toBe('harvest-client')
  })

  it('converts sprout_uprooted to sync payload', () => {
    const event: TrunkEvent = {
      type: 'sprout_uprooted',
      timestamp: '2026-02-20T10:00:00Z',
      sproutId: 'sprout-1',
      soilReturned: 1.25,
    }

    const payload = localToSyncPayload(event, 'user-123')
    expect(payload.type).toBe('sprout_uprooted')
  })

  it('converts sun_shone to sync payload', () => {
    const event: TrunkEvent = {
      type: 'sun_shone',
      timestamp: '2026-02-17T10:00:00Z',
      twigId: 'branch-0-twig-0',
      twigLabel: 'movement',
      content: 'Reflection',
    }

    const payload = localToSyncPayload(event, 'user-123')
    expect(payload.type).toBe('sun_shone')
  })

  it('converts leaf_created to sync payload', () => {
    const event: TrunkEvent = {
      type: 'leaf_created',
      timestamp: '2026-02-14T10:00:00Z',
      leafId: 'leaf-1',
      twigId: 'branch-0-twig-0',
      name: 'Running',
    }

    const payload = localToSyncPayload(event, 'user-123')
    expect(payload.type).toBe('leaf_created')
  })

  it('does not include id or created_at in the sync payload', () => {
    const event: TrunkEvent = {
      type: 'sprout_planted',
      timestamp: '2026-02-15T10:00:00Z',
      sproutId: 'sprout-1',
      twigId: 'branch-0-twig-0',
      title: 'Test',
      season: '1m',
      environment: 'fertile',
      soilCost: 3,
    }

    const payload = localToSyncPayload(event, 'user-123')

    // These fields are server-generated
    expect('id' in payload).toBe(false)
    expect('created_at' in payload).toBe(false)
  })
})

describe('syncToLocalEvent roundtrip', () => {
  it('localToSyncPayload → syncToLocalEvent preserves event data', () => {
    const original: TrunkEvent = {
      type: 'sprout_planted',
      timestamp: '2026-02-15T10:00:00Z',
      sproutId: 'sprout-1',
      twigId: 'branch-0-twig-0',
      title: 'Roundtrip Test',
      season: '3m',
      environment: 'barren',
      soilCost: 10,
      client_id: 'roundtrip-client',
    }

    const syncPayload = localToSyncPayload(original, 'user-123')
    const syncEvent: SyncEvent = {
      ...syncPayload,
      id: 'server-generated-id',
      created_at: '2026-02-15T10:00:01Z',
    }

    const restored = syncToLocalEvent(syncEvent)

    expect(restored).not.toBeNull()
    expect(restored!.type).toBe(original.type)
    expect(restored!.timestamp).toBe(original.timestamp)
    expect(restored!.client_id).toBe(original.client_id)
    if (restored!.type === 'sprout_planted') {
      expect(restored!.sproutId).toBe('sprout-1')
      expect(restored!.title).toBe('Roundtrip Test')
      expect(restored!.season).toBe('3m')
      expect(restored!.environment).toBe('barren')
      expect(restored!.soilCost).toBe(10)
    }
  })
})

describe('generateClientId', () => {
  it('returns a non-empty string', () => {
    const id = generateClientId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('generates unique IDs', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateClientId())
    }
    expect(ids.size).toBe(100)
  })

  it('contains an ISO timestamp prefix', () => {
    const id = generateClientId()
    // Format: ISO-timestamp-UUID-prefix
    expect(id).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
