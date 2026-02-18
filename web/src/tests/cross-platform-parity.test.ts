/**
 * Cross-platform parity tests
 *
 * Validates that web implementation matches shared constants and formulas.
 * These tests ensure web and iOS produce identical results for the same inputs.
 */

import { describe, it, expect } from 'vitest'
import { calculateSoilCost, calculateCapacityReward } from '../utils/calculations'
import { deriveState, deriveWaterAvailable, deriveSunAvailable } from '../events/derive'
import type { TrunkEvent } from '../events/types'
import fixture from '../../../shared/test-fixtures/cross-platform-validation.json'

describe('Cross-platform parity: soil costs', () => {
  const { cases } = fixture.soilCostTests

  cases.forEach((testCase) => {
    it(`${testCase.season} ${testCase.environment} should cost ${testCase.expected}`, () => {
      const actual = calculateSoilCost(testCase.season, testCase.environment)
      expect(actual).toBe(testCase.expected)
    })
  })
})

describe('Cross-platform parity: capacity rewards', () => {
  const { cases } = fixture.capacityRewardTests

  cases.forEach((testCase) => {
    it(testCase.description, () => {
      const actual = calculateCapacityReward(
        testCase.season,
        testCase.environment,
        testCase.result,
        testCase.currentCapacity,
      )
      // Use toBeCloseTo for floating point comparisons (2 decimal places)
      expect(actual).toBeCloseTo(testCase.expected, 2)
    })
  })
})

// Reset time tests omitted - timezone-dependent, covered by week-boundary.json

describe('Cross-platform parity: water availability', () => {
  const { waterCases } = fixture.resourceAvailabilityTests

  waterCases.forEach((testCase) => {
    it(testCase.description, () => {
      const now = new Date(testCase.now)
      const events = testCase.events as TrunkEvent[]
      const actual = deriveWaterAvailable(events, now)
      expect(actual).toBe(testCase.expectedAvailable)
    })
  })
})

describe('Cross-platform parity: sun availability', () => {
  const { sunCases } = fixture.resourceAvailabilityTests

  sunCases.forEach((testCase) => {
    it(testCase.description, () => {
      const now = new Date(testCase.now)
      const events = testCase.events as TrunkEvent[]
      const actual = deriveSunAvailable(events, now)
      expect(actual).toBe(testCase.expectedAvailable)
    })
  })
})

describe('Cross-platform parity: event derivation', () => {
  const { scenarios } = fixture.eventDerivationTests

  scenarios.forEach((scenario) => {
    describe(scenario.name, () => {
      const events = scenario.events as TrunkEvent[]
      const expected = scenario.expectedState

      it(`${scenario.description}: soil capacity and available`, () => {
        const state = deriveState(events)
        expect(state.soilCapacity).toBeCloseTo(expected.soilCapacity, 4)
        expect(state.soilAvailable).toBeCloseTo(expected.soilAvailable, 4)
      })

      it(`${scenario.description}: sprout counts`, () => {
        const state = deriveState(events)
        expect(state.sprouts.size).toBe(expected.sproutCount)

        const activeSprouts = Array.from(state.sprouts.values()).filter((s) => s.state === 'active')
        expect(activeSprouts.length).toBe(expected.activeSproutCount)

        const completedSprouts = Array.from(state.sprouts.values()).filter(
          (s) => s.state === 'completed',
        )
        expect(completedSprouts.length).toBe(expected.completedSproutCount)

        if (expected.uprootedSproutCount !== undefined) {
          const uprootedSprouts = Array.from(state.sprouts.values()).filter(
            (s) => s.state === 'uprooted',
          )
          expect(uprootedSprouts.length).toBe(expected.uprootedSproutCount)
        }
      })

      it(`${scenario.description}: entity counts`, () => {
        const state = deriveState(events)

        if (expected.leafCount !== undefined) {
          expect(state.leaves.size).toBe(expected.leafCount)
        }

        if (expected.sunEntryCount !== undefined) {
          expect(state.sunEntries.length).toBe(expected.sunEntryCount)
        }
      })

      it(`${scenario.description}: sprout details`, () => {
        const state = deriveState(events)

        Object.entries(expected.sprouts).forEach(([sproutId, expectedSprout]) => {
          const actualSprout = state.sprouts.get(sproutId)
          expect(actualSprout).toBeDefined()

          if (actualSprout) {
            expect(actualSprout.state).toBe(expectedSprout.state)

            if (expectedSprout.result !== undefined) {
              expect(actualSprout.result).toBe(expectedSprout.result)
            }

            if (expectedSprout.waterEntryCount !== undefined) {
              expect(actualSprout.waterEntries.length).toBe(expectedSprout.waterEntryCount)
            }

            if (expectedSprout.reflection !== undefined) {
              expect(actualSprout.reflection).toBe(expectedSprout.reflection)
            }

            if ('leafId' in expectedSprout) {
              expect(actualSprout.leafId).toBe(expectedSprout.leafId)
            }

            if (expectedSprout.uprootedAt !== undefined) {
              expect(actualSprout.uprootedAt).toBe(expectedSprout.uprootedAt)
            }
          }
        })
      })

      if (expected.sproutsForTwig) {
        it(`${scenario.description}: sprouts grouped by twig`, () => {
          const state = deriveState(events)

          Object.entries(expected.sproutsForTwig).forEach(([twigId, expectedCount]) => {
            const sproutsInTwig = Array.from(state.sprouts.values()).filter(
              (s) => s.twigId === twigId,
            )
            expect(sproutsInTwig.length).toBe(expectedCount)
          })
        })
      }

      if (expected.leavesForTwig) {
        it(`${scenario.description}: leaves grouped by twig`, () => {
          const state = deriveState(events)

          Object.entries(expected.leavesForTwig).forEach(([twigId, expectedCount]) => {
            const leavesInTwig = Array.from(state.leaves.values()).filter(
              (l) => l.twigId === twigId,
            )
            expect(leavesInTwig.length).toBe(expectedCount)
          })
        })
      }
    })
  })
})
