/**
 * Cross-platform field coverage tests.
 *
 * Verifies that every field on every event type survives:
 * 1. Sync round-trip: localToSyncPayload() → syncToLocalEvent()
 * 2. State derivation: deriveState() preserves bloom, reflection, prompt, etc.
 *
 * Uses shared/test-fixtures/field-coverage.json as the canonical fixture.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { localToSyncPayload, syncToLocalEvent } from '../services/sync-types'
import type { SyncEvent } from '../services/sync-types'
import type { TrunkEvent } from '../events/types'
import { deriveState } from '../events/derive'
import fixture from '../../../shared/test-fixtures/field-coverage.json'

const TEST_USER_ID = 'user-test-field-coverage'

// Typed fixture access
const fixtureEvents = fixture.events as unknown as TrunkEvent[]
const expected = fixture.expectedDerived

/**
 * Round-trip a TrunkEvent through the sync pipeline:
 * local → syncPayload → syncEvent (simulated server) → localEvent
 */
function syncRoundTrip(event: TrunkEvent): TrunkEvent | null {
  const syncPayload = localToSyncPayload(event, TEST_USER_ID)

  // Simulate what the server returns (add id and created_at)
  const syncEvent: SyncEvent = {
    id: `server-${crypto.randomUUID().slice(0, 8)}`,
    created_at: new Date().toISOString(),
    ...syncPayload,
  }

  return syncToLocalEvent(syncEvent)
}

describe('field-coverage: sync round-trip', () => {
  describe('sprout_planted — all fields survive round-trip', () => {
    const planted = fixtureEvents.find(
      (e) => e.type === 'sprout_planted' && 'sproutId' in e && e.sproutId === 'sprout-abc123',
    )!

    it('round-trips without data loss', () => {
      const result = syncRoundTrip(planted)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('sprout_planted')
    })

    it('preserves required fields', () => {
      const result = syncRoundTrip(planted)!
      if (result.type !== 'sprout_planted') throw new Error('wrong type')

      expect(result.sproutId).toBe('sprout-abc123')
      expect(result.twigId).toBe('branch-2-twig-5')
      expect(result.title).toBe('Learn guitar chords')
      expect(result.season).toBe('3m')
      expect(result.environment).toBe('firm')
      expect(result.soilCost).toBe(7.5)
      expect(result.leafId).toBe('leaf-xyz789')
      expect(result.timestamp).toBe('2026-01-15T10:30:00.000Z')
    })

    it('preserves optional bloom fields', () => {
      const result = syncRoundTrip(planted)!
      if (result.type !== 'sprout_planted') throw new Error('wrong type')

      expect(result.bloomWither).toBe('Give up after first week')
      expect(result.bloomBudding).toBe('Know 5 basic chords')
      expect(result.bloomFlourish).toBe('Play 3 full songs')
    })

    it('preserves fractional soilCost (catches Int truncation)', () => {
      const result = syncRoundTrip(planted)!
      if (result.type !== 'sprout_planted') throw new Error('wrong type')

      expect(result.soilCost).toBe(7.5)
      expect(Number.isInteger(result.soilCost)).toBe(false)
    })
  })

  describe('sprout_watered — all fields survive round-trip', () => {
    const watered = fixtureEvents.find((e) => e.type === 'sprout_watered')!

    it('preserves content and prompt', () => {
      const result = syncRoundTrip(watered)!
      if (result.type !== 'sprout_watered') throw new Error('wrong type')

      expect(result.sproutId).toBe('sprout-abc123')
      expect(result.content).toBe('Practiced Am and C chords for 20 minutes')
      expect(result.prompt).toBe('What did you work on today?')
      expect(result.timestamp).toBe('2026-01-16T08:15:00.000Z')
    })
  })

  describe('sprout_harvested — all fields survive round-trip', () => {
    const harvested = fixtureEvents.find((e) => e.type === 'sprout_harvested')!

    it('preserves result, reflection, and capacityGained', () => {
      const result = syncRoundTrip(harvested)!
      if (result.type !== 'sprout_harvested') throw new Error('wrong type')

      expect(result.sproutId).toBe('sprout-abc123')
      expect(result.result).toBe(4)
      expect(result.reflection).toBe('Learned 6 chords and can play 2 songs. Close to goal.')
      expect(result.capacityGained).toBe(1.205)
      expect(result.timestamp).toBe('2026-04-15T18:00:00.000Z')
    })

    it('preserves fractional capacityGained', () => {
      const result = syncRoundTrip(harvested)!
      if (result.type !== 'sprout_harvested') throw new Error('wrong type')

      expect(result.capacityGained).toBe(1.205)
    })
  })

  describe('sprout_uprooted — all fields survive round-trip', () => {
    const uprooted = fixtureEvents.find((e) => e.type === 'sprout_uprooted')!

    it('preserves fractional soilReturned', () => {
      const result = syncRoundTrip(uprooted)!
      if (result.type !== 'sprout_uprooted') throw new Error('wrong type')

      expect(result.sproutId).toBe('sprout-def456')
      expect(result.soilReturned).toBe(0.75)
      expect(Number.isInteger(result.soilReturned)).toBe(false)
      expect(result.timestamp).toBe('2026-02-01T14:00:00.000Z')
    })
  })

  describe('sun_shone — all fields survive round-trip', () => {
    const sun = fixtureEvents.find((e) => e.type === 'sun_shone')!

    it('preserves twigId, twigLabel, content, and prompt', () => {
      const result = syncRoundTrip(sun)!
      if (result.type !== 'sun_shone') throw new Error('wrong type')

      expect(result.twigId).toBe('branch-2-twig-5')
      expect(result.twigLabel).toBe('technique')
      expect(result.content).toBe('Really enjoying the creative outlet. Want to explore more.')
      expect(result.prompt).toBe('How did this area of your life feel this week?')
      expect(result.timestamp).toBe('2026-01-20T09:00:00.000Z')
    })
  })

  describe('leaf_created — all fields survive round-trip', () => {
    const leaf = fixtureEvents.find((e) => e.type === 'leaf_created')!

    it('preserves leafId, twigId, and name', () => {
      const result = syncRoundTrip(leaf)!
      if (result.type !== 'leaf_created') throw new Error('wrong type')

      expect(result.leafId).toBe('leaf-xyz789')
      expect(result.twigId).toBe('branch-2-twig-5')
      expect(result.name).toBe('Guitar Journey')
      expect(result.timestamp).toBe('2026-01-14T10:00:00.000Z')
    })
  })

  describe('iOS-format sync events (payload without type/timestamp)', () => {
    it('merges type and timestamp from top-level columns', () => {
      // iOS stores only domain fields in payload, type/timestamp are separate columns
      const iosSyncEvent: SyncEvent = {
        id: 'server-ios-1',
        user_id: TEST_USER_ID,
        type: 'sprout_watered',
        payload: {
          sproutId: 'sprout-abc123',
          content: 'Practiced Am and C chords for 20 minutes',
          prompt: 'What did you work on today?',
        },
        client_id: 'ios-client-1',
        client_timestamp: '2026-01-16T08:15:00.000Z',
        created_at: '2026-01-16T08:15:01.000Z',
      }

      const result = syncToLocalEvent(iosSyncEvent)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('sprout_watered')
      expect(result!.timestamp).toBe('2026-01-16T08:15:00.000Z')
      if (result!.type === 'sprout_watered') {
        expect(result!.content).toBe('Practiced Am and C chords for 20 minutes')
        expect(result!.prompt).toBe('What did you work on today?')
      }
    })
  })
})

describe('field-coverage: derivation preserves all fields', () => {
  let state: ReturnType<typeof deriveState>

  beforeEach(() => {
    state = deriveState(fixtureEvents)
  })

  describe('soil resources', () => {
    it('derives correct soilCapacity', () => {
      expect(state.soilCapacity).toBe(expected.soilCapacity)
    })

    it('derives correct soilAvailable', () => {
      expect(state.soilAvailable).toBe(expected.soilAvailable)
    })
  })

  describe('entity counts', () => {
    it('derives correct sprout count', () => {
      expect(state.sprouts.size).toBe(expected.sproutCount)
    })

    it('derives correct leaf count', () => {
      expect(state.leaves.size).toBe(expected.leafCount)
    })

    it('derives correct sun entry count', () => {
      expect(state.sunEntries).toHaveLength(expected.sunEntryCount)
    })
  })

  describe('sprout-abc123 (completed) — all fields preserved in derived state', () => {
    const exp = expected.sproutDetails['sprout-abc123']

    it('has correct state', () => {
      const sprout = state.sprouts.get('sprout-abc123')!
      expect(sprout.state).toBe(exp.state)
    })

    it('preserves title, season, environment, soilCost', () => {
      const sprout = state.sprouts.get('sprout-abc123')!
      expect(sprout.title).toBe(exp.title)
      expect(sprout.season).toBe(exp.season)
      expect(sprout.environment).toBe(exp.environment)
      expect(sprout.soilCost).toBe(exp.soilCost)
    })

    it('preserves leafId', () => {
      const sprout = state.sprouts.get('sprout-abc123')!
      expect(sprout.leafId).toBe(exp.leafId)
    })

    it('preserves bloom fields', () => {
      const sprout = state.sprouts.get('sprout-abc123')!
      expect(sprout.bloomWither).toBe(exp.bloomWither)
      expect(sprout.bloomBudding).toBe(exp.bloomBudding)
      expect(sprout.bloomFlourish).toBe(exp.bloomFlourish)
    })

    it('preserves harvest result and reflection', () => {
      const sprout = state.sprouts.get('sprout-abc123')!
      expect(sprout.result).toBe(exp.result)
      expect(sprout.reflection).toBe(exp.reflection)
    })

    it('preserves water entries with content and prompt', () => {
      const sprout = state.sprouts.get('sprout-abc123')!
      expect(sprout.waterEntries).toHaveLength(exp.waterEntryCount)

      const entry = sprout.waterEntries[0]
      expect(entry.content).toBe(exp.waterEntries[0].content)
      expect(entry.prompt).toBe(exp.waterEntries[0].prompt)
    })
  })

  describe('sprout-def456 (uprooted) — all fields preserved in derived state', () => {
    const exp = expected.sproutDetails['sprout-def456']

    it('has correct state', () => {
      const sprout = state.sprouts.get('sprout-def456')!
      expect(sprout.state).toBe(exp.state)
    })

    it('preserves bloom fields on uprooted sprout', () => {
      const sprout = state.sprouts.get('sprout-def456')!
      expect(sprout.bloomWither).toBe(exp.bloomWither)
      expect(sprout.bloomBudding).toBe(exp.bloomBudding)
      expect(sprout.bloomFlourish).toBe(exp.bloomFlourish)
    })

    it('has no water entries', () => {
      const sprout = state.sprouts.get('sprout-def456')!
      expect(sprout.waterEntries).toHaveLength(exp.waterEntryCount)
    })
  })

  describe('leaf-xyz789 — all fields preserved in derived state', () => {
    const exp = expected.leafDetails['leaf-xyz789']

    it('preserves name and twigId', () => {
      const leaf = state.leaves.get('leaf-xyz789')!
      expect(leaf.name).toBe(exp.name)
      expect(leaf.twigId).toBe(exp.twigId)
    })
  })

  describe('sun entry — all fields preserved in derived state', () => {
    const exp = expected.sunEntryDetails[0]

    it('preserves content and prompt', () => {
      const entry = state.sunEntries[0]
      expect(entry.content).toBe(exp.content)
      expect(entry.prompt).toBe(exp.prompt)
    })

    it('preserves context (twigId and twigLabel)', () => {
      const entry = state.sunEntries[0]
      expect(entry.context.twigId).toBe(exp.twigId)
      expect(entry.context.twigLabel).toBe(exp.twigLabel)
    })
  })

  describe('indexes — built correctly from fixture data', () => {
    it('builds sproutsByTwig index', () => {
      expect(state.sproutsByTwig.get('branch-2-twig-5')).toHaveLength(1)
      expect(state.sproutsByTwig.get('branch-0-twig-3')).toHaveLength(1)
    })

    it('builds activeSproutsByTwig index (no active sprouts in fixture)', () => {
      // Both sprouts are completed/uprooted
      expect(state.activeSproutsByTwig.size).toBe(0)
    })

    it('builds sproutsByLeaf index', () => {
      const leafSprouts = state.sproutsByLeaf.get('leaf-xyz789')!
      expect(leafSprouts).toHaveLength(2)
    })

    it('builds leavesByTwig index', () => {
      expect(state.leavesByTwig.get('branch-2-twig-5')).toHaveLength(1)
    })
  })
})
