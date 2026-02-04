/**
 * Cross-platform parity tests.
 * These tests load fixtures from shared/test-fixtures/ and verify
 * that web derivation produces identical results to expected values.
 * iOS should have matching tests that verify the same expectations.
 */

import { describe, it, expect } from 'vitest'
import {
  deriveState,
  deriveWaterAvailable,
  deriveSunAvailable,
  getSproutsForTwig,
  getLeavesForTwig,
  getActiveSprouts,
  getCompletedSprouts,
} from '../events/derive'
import type { TrunkEvent } from '../events/types'
import parityFixture from '../../../shared/test-fixtures/derivation-parity.json'
import weekBoundaryFixture from '../../../shared/test-fixtures/week-boundary.json'

// Convert fixture events to TrunkEvent format
function toTrunkEvents(events: typeof parityFixture.events): TrunkEvent[] {
  return events.map((e) => e as unknown as TrunkEvent)
}

describe('Cross-Platform Parity Tests', () => {
  describe('Derivation Parity', () => {
    const events = toTrunkEvents(parityFixture.events)
    const expected = parityFixture.expectedState
    const testDate = new Date(parityFixture._testDate)

    it('derives correct soil capacity', () => {
      const state = deriveState(events)
      expect(state.soilCapacity).toBeCloseTo(expected.soilCapacity, 2)
    })

    it('derives correct soil available', () => {
      const state = deriveState(events)
      expect(state.soilAvailable).toBeCloseTo(expected.soilAvailable, 2)
    })

    it('derives correct sprout count', () => {
      const state = deriveState(events)
      expect(state.sprouts.size).toBe(expected.sproutCount)
    })

    it('derives correct active sprout count', () => {
      const state = deriveState(events)
      const active = getActiveSprouts(state)
      expect(active.length).toBe(expected.activeSproutCount)
    })

    it('derives correct completed sprout count', () => {
      const state = deriveState(events)
      const completed = getCompletedSprouts(state)
      expect(completed.length).toBe(expected.completedSproutCount)
    })

    it('derives correct leaf count', () => {
      const state = deriveState(events)
      expect(state.leaves.size).toBe(expected.leafCount)
    })

    it('derives correct sun entry count', () => {
      const state = deriveState(events)
      expect(state.sunEntries.length).toBe(expected.sunEntryCount)
    })

    it('derives correct water available', () => {
      const available = deriveWaterAvailable(events, testDate)
      expect(available).toBe(expected.waterAvailable.value)
    })

    it('derives correct sun available', () => {
      const available = deriveSunAvailable(events, testDate)
      expect(available).toBe(expected.sunAvailable.value)
    })

    it('derives correct sprout states', () => {
      const state = deriveState(events)

      for (const [id, expectedSprout] of Object.entries(expected.sproutDetails)) {
        const sprout = state.sprouts.get(id)
        expect(sprout, `sprout ${id} should exist`).toBeDefined()
        expect(sprout!.state).toBe(expectedSprout.state)
        expect(sprout!.waterEntries.length).toBe(expectedSprout.waterEntryCount)
        if ('result' in expectedSprout && expectedSprout.result !== undefined) {
          expect(sprout!.result).toBe(expectedSprout.result)
        }
      }
    })

    it('derives correct sprouts per twig', () => {
      const state = deriveState(events)

      for (const [twigId, expectedCount] of Object.entries(expected.sproutsForTwig)) {
        const sprouts = getSproutsForTwig(state, twigId)
        expect(sprouts.length).toBe(expectedCount)
      }
    })

    it('derives correct leaves per twig', () => {
      const state = deriveState(events)

      for (const [twigId, expectedCount] of Object.entries(expected.leavesForTwig)) {
        const leaves = getLeavesForTwig(state, twigId)
        expect(leaves.length).toBe(expectedCount)
      }
    })
  })

  describe('Week Boundary Tests (Monday 6am reset)', () => {
    for (const scenario of weekBoundaryFixture.scenarios) {
      it(scenario.name, () => {
        const events = toTrunkEvents(scenario.events as typeof parityFixture.events)
        const testDate = new Date(scenario.testTime)

        const available = deriveSunAvailable(events, testDate)
        expect(available).toBe(scenario.expected.sunAvailable)
      })
    }
  })

  describe('Water Boundary Tests (6am daily reset)', () => {
    for (const scenario of weekBoundaryFixture.waterBoundaryTests) {
      it(scenario.name, () => {
        const events = toTrunkEvents(scenario.events as typeof parityFixture.events)
        const testDate = new Date(scenario.testTime)

        const available = deriveWaterAvailable(events, testDate)
        expect(available).toBe(scenario.expected.waterAvailable)
      })
    }
  })
})
