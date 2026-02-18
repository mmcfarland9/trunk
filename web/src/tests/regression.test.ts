/**
 * Regression tests - Prevent known bugs from recurring.
 *
 * When fixing a bug, add a test here that:
 * 1. Documents the bug (issue #, date, description)
 * 2. Reproduces the conditions that caused it
 * 3. Verifies the fix works
 *
 * Format:
 * it('BUG-XXX: [description of what was broken]', () => {
 *   // Setup conditions that triggered the bug
 *   // Assert the correct behavior now works
 * })
 *
 * Run: npm test
 */

import { describe, it, expect } from 'vitest'
import { deriveState, getActiveSprouts, toSprout } from '../events/derive'
import type { TrunkEvent } from '../events/types'

describe('Regression Tests', () => {
  describe('Sprout State Derivation', () => {
    it('BUG-001: sprout endDate should not be NaN for active sprouts', () => {
      // Bug: toSprout() was returning NaN for endDate because
      // DerivedSprout stores endTimestamp, not endDate directly.
      // Fixed by calculating endDate from plantedAt + season duration.

      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: '2026-01-15T10:00:00Z',
          sproutId: 'test-sprout',
          twigId: 'branch-0-twig-0',
          title: 'Test Goal',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
      ]

      const state = deriveState(events)
      const sprouts = getActiveSprouts(state)
      const sprout = toSprout(sprouts[0])

      // endDate should be a valid date, not NaN
      expect(sprout.endDate).toBeDefined()
      expect(new Date(sprout.endDate!).getTime()).not.toBeNaN()
      // Should be 2 weeks after plant date, normalized to 9am local timezone
      const expectedEnd = new Date(new Date('2026-01-15T10:00:00Z').getTime() + 14 * 24 * 60 * 60 * 1000)
      expectedEnd.setHours(9, 0, 0, 0)
      expect(new Date(sprout.endDate!).getTime()).toBe(expectedEnd.getTime())
    })

    it('BUG-002: harvested sprouts should not appear in active sprouts', () => {
      // Bug: getActiveSprouts was including harvested sprouts
      // because state filter was checking wrong property.

      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: '2026-01-01T10:00:00Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          title: 'Completed Goal',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
        {
          type: 'sprout_harvested',
          timestamp: '2026-01-15T10:00:00Z',
          sproutId: 'sprout-1',
          result: 4,
          capacityGained: 1.5,
        },
      ]

      const state = deriveState(events)
      const activeSprouts = getActiveSprouts(state)

      // Harvested sprout should not be in active list
      expect(activeSprouts.length).toBe(0)
      // But should still exist in sprouts map
      expect(state.sprouts.get('sprout-1')).toBeDefined()
      expect(state.sprouts.get('sprout-1')?.state).toBe('completed')
    })

    it('BUG-003: multiple water entries should all be preserved', () => {
      // Bug: Water entries were being overwritten instead of appended
      // when multiple sprout_watered events occurred.

      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: '2026-01-01T10:00:00Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          title: 'Goal',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
        {
          type: 'sprout_watered',
          timestamp: '2026-01-02T10:00:00Z',
          sproutId: 'sprout-1',
          content: 'First water entry',
        },
        {
          type: 'sprout_watered',
          timestamp: '2026-01-03T10:00:00Z',
          sproutId: 'sprout-1',
          content: 'Second water entry',
        },
        {
          type: 'sprout_watered',
          timestamp: '2026-01-04T10:00:00Z',
          sproutId: 'sprout-1',
          content: 'Third water entry',
        },
      ]

      const state = deriveState(events)
      const sprout = state.sprouts.get('sprout-1')!

      // All water entries should be preserved
      expect(sprout.waterEntries.length).toBe(3)
      expect(sprout.waterEntries[0].content).toBe('First water entry')
      expect(sprout.waterEntries[1].content).toBe('Second water entry')
      expect(sprout.waterEntries[2].content).toBe('Third water entry')
    })
  })

  describe('Soil Calculations', () => {
    // NOTE: BUG-004 removed - capacityGained in events already has diminishing
    // returns applied at calculation time, so capping in deriveState is not needed.
    // The 120 max is enforced by the diminishing returns formula that calculates
    // capacityGained before it's stored in the harvest event.

    it('BUG-005: soil available should never go negative', () => {
      // Fixed: deriveState now clamps soilAvailable to 0 minimum when spending.

      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: '2026-01-01T10:00:00Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          title: 'Expensive Goal',
          season: '1y',
          environment: 'barren',
          soilCost: 24, // Exceeds starting capacity of 10
        },
      ]

      const state = deriveState(events)

      // Available soil should be clamped to 0, not negative
      expect(state.soilAvailable).toBeGreaterThanOrEqual(0)
      expect(state.soilAvailable).toBe(0)
    })
  })

  describe('Event Processing', () => {
    it('BUG-006: events should be processed in timestamp order', () => {
      // Fixed: deriveState now sorts events by timestamp before processing.

      // Add events out of chronological order
      const events: TrunkEvent[] = [
        {
          type: 'sprout_harvested',
          timestamp: '2026-01-15T10:00:00Z',
          sproutId: 'sprout-1',
          result: 4,
          capacityGained: 1.0,
        },
        {
          type: 'sprout_planted',
          timestamp: '2026-01-01T10:00:00Z',
          sproutId: 'sprout-1',
          twigId: 'branch-0-twig-0',
          title: 'Goal',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
        {
          type: 'sprout_watered',
          timestamp: '2026-01-08T10:00:00Z',
          sproutId: 'sprout-1',
          content: 'Mid-way progress',
        },
      ]

      const state = deriveState(events)
      const sprout = state.sprouts.get('sprout-1')!

      // Despite out-of-order events, state should be correct
      expect(sprout.state).toBe('completed')
      expect(sprout.waterEntries.length).toBe(1)
      expect(sprout.result).toBe(4)
    })

    it('BUG-007: sun entries should preserve twig context', () => {
      // Bug: Sun entries were losing twigId and twigLabel context.
      // Fixed by properly including context in derived sun entries.

      const events: TrunkEvent[] = [
        {
          type: 'sun_shone',
          timestamp: '2026-01-07T10:00:00Z',
          twigId: 'branch-2-twig-5',
          twigLabel: 'Movement',
          content: 'Weekly reflection on exercise habits',
          prompt: 'What did you learn this week?',
        },
      ]

      const state = deriveState(events)

      expect(state.sunEntries.length).toBe(1)
      expect(state.sunEntries[0].context.twigId).toBe('branch-2-twig-5')
      expect(state.sunEntries[0].context.twigLabel).toBe('Movement')
      expect(state.sunEntries[0].content).toBe('Weekly reflection on exercise habits')
      expect(state.sunEntries[0].prompt).toBe('What did you learn this week?')
    })
  })

  describe('Edge Cases', () => {
    it('BUG-008: empty sprout title should not crash', () => {
      // Bug: Empty title caused null reference error in UI.
      // Fixed by providing default or validation.

      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: '2026-01-01T10:00:00Z',
          sproutId: 'sprout-empty',
          twigId: 'branch-0-twig-0',
          title: '', // Empty title
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
      ]

      // Should not throw
      expect(() => deriveState(events)).not.toThrow()

      const state = deriveState(events)
      const sprout = state.sprouts.get('sprout-empty')!
      expect(sprout.title).toBe('')
    })

    it('BUG-009: special characters in content should be preserved', () => {
      // Bug: HTML entities and special chars were being escaped/corrupted.
      // Fixed by proper string handling without escaping.

      const specialContent = 'Test <script>alert("xss")</script> & "quotes" \'apostrophes\''

      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: '2026-01-01T10:00:00Z',
          sproutId: 'sprout-special',
          twigId: 'branch-0-twig-0',
          title: specialContent,
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
        {
          type: 'sprout_watered',
          timestamp: '2026-01-02T10:00:00Z',
          sproutId: 'sprout-special',
          content: specialContent,
        },
      ]

      const state = deriveState(events)
      const sprout = state.sprouts.get('sprout-special')!

      // Content should be preserved exactly
      expect(sprout.title).toBe(specialContent)
      expect(sprout.waterEntries[0].content).toBe(specialContent)
    })

    it('BUG-010: duplicate sprout IDs should use latest state', () => {
      // Bug: Duplicate IDs caused unpredictable behavior.
      // Fixed by using Map and last-write-wins semantics.

      const events: TrunkEvent[] = [
        {
          type: 'sprout_planted',
          timestamp: '2026-01-01T10:00:00Z',
          sproutId: 'duplicate-id',
          twigId: 'branch-0-twig-0',
          title: 'First Version',
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        },
        {
          type: 'sprout_planted',
          timestamp: '2026-01-02T10:00:00Z',
          sproutId: 'duplicate-id', // Same ID
          twigId: 'branch-0-twig-0',
          title: 'Second Version',
          season: '1m',
          environment: 'barren',
          soilCost: 6,
        },
      ]

      const state = deriveState(events)
      const sprout = state.sprouts.get('duplicate-id')!

      // Should reflect the latest planted event
      expect(sprout.title).toBe('Second Version')
      expect(sprout.season).toBe('1m')
      expect(sprout.environment).toBe('barren')
    })
  })
})

/**
 * Template for adding new regression tests:
 *
 * it('BUG-XXX: [one-line description of the bug]', () => {
 *   // Context: [when/how was this discovered?]
 *   // Root cause: [what caused the bug?]
 *   // Fix: [how was it fixed?]
 *
 *   // Setup: reproduce the conditions
 *   const events: TrunkEvent[] = [...]
 *
 *   // Act: run the operation
 *   const state = deriveState(events)
 *
 *   // Assert: verify correct behavior
 *   expect(state.X).toBe(expected)
 * })
 */
