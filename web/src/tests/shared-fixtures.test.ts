/**
 * Tests driven by shared cross-platform fixtures.
 * These fixtures live in shared/test-fixtures/ and are consumed by both
 * web (here) and iOS to ensure identical behavior across platforms.
 */

import { describe, it, expect } from 'vitest'
import { calculateCapacityReward } from '../utils/calculations'
import { deriveState, getActiveSprouts, getCompletedSprouts } from '../events/derive'
import type { TrunkEvent } from '../events/types'
import type { SproutSeason, SproutEnvironment } from '../types'
import capacityRewardFixture from '../../../shared/test-fixtures/capacity-reward.json'
import eventDerivationFixture from '../../../shared/test-fixtures/event-derivation.json'

// Helper to cast fixture events to TrunkEvent[]
function toTrunkEvents(events: readonly Record<string, unknown>[]): TrunkEvent[] {
  return events as unknown as TrunkEvent[]
}

describe('Shared Fixtures: Capacity Reward', () => {
  for (const testCase of capacityRewardFixture.cases) {
    it(testCase.description, () => {
      const { season, environment, result, currentCapacity } = testCase.input
      const reward = calculateCapacityReward(
        season as SproutSeason,
        environment as SproutEnvironment,
        result,
        currentCapacity,
      )
      expect(reward).toBeCloseTo(testCase.expected.reward, 2)
    })
  }
})

describe('Shared Fixtures: Event Derivation', () => {
  for (const scenario of eventDerivationFixture.scenarios) {
    describe(scenario.description, () => {
      const events = toTrunkEvents(scenario.events)
      const state = deriveState(events)

      it('derives correct soil capacity', () => {
        expect(state.soilCapacity).toBeCloseTo(scenario.expected.soilCapacity, 2)
      })

      it('derives correct soil available', () => {
        expect(state.soilAvailable).toBeCloseTo(scenario.expected.soilAvailable, 2)
      })

      if ('sproutCount' in scenario.expected) {
        it('derives correct sprout count', () => {
          expect(state.sprouts.size).toBe(scenario.expected.sproutCount)
        })
      }

      if ('activeSproutCount' in scenario.expected) {
        it('derives correct active sprout count', () => {
          const active = getActiveSprouts(state)
          expect(active.length).toBe(scenario.expected.activeSproutCount)
        })
      }

      if ('completedSproutCount' in scenario.expected) {
        it('derives correct completed sprout count', () => {
          const completed = getCompletedSprouts(state)
          expect(completed.length).toBe(scenario.expected.completedSproutCount)
        })
      }

      if ('leafCount' in scenario.expected) {
        it('derives correct leaf count', () => {
          expect(state.leaves.size).toBe(scenario.expected.leafCount)
        })
      }

      if ('sunEntryCount' in scenario.expected) {
        it('derives correct sun entry count', () => {
          expect(state.sunEntries.length).toBe(scenario.expected.sunEntryCount)
        })
      }

      if ('sproutDetails' in scenario.expected && scenario.expected.sproutDetails) {
        const details = scenario.expected.sproutDetails as Record<
          string,
          { state: string; result?: number; waterEntryCount: number; reflection?: string; leafId?: string }
        >
        for (const [sproutId, expectedSprout] of Object.entries(details)) {
          it(`derives correct state for ${sproutId}`, () => {
            const sprout = state.sprouts.get(sproutId)
            expect(sprout, `${sproutId} should exist`).toBeDefined()
            expect(sprout!.state).toBe(expectedSprout.state)
            expect(sprout!.waterEntries.length).toBe(expectedSprout.waterEntryCount)
            if (expectedSprout.result !== undefined) {
              expect(sprout!.result).toBe(expectedSprout.result)
            }
            if (expectedSprout.reflection !== undefined) {
              expect(sprout!.reflection).toBe(expectedSprout.reflection)
            }
            if (expectedSprout.leafId !== undefined) {
              expect(sprout!.leafId).toBe(expectedSprout.leafId)
            }
          })
        }
      }
    })
  }
})
