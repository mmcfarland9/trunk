/**
 * Performance tests for critical paths.
 * These ensure operations complete within acceptable time limits.
 *
 * Run: npm test
 */

import { describe, it, expect } from 'vitest'
import { deriveState } from '../events/derive'
import type { TrunkEvent } from '../events/types'

describe('Performance Tests', () => {
  // Helper to generate test events
  function generateEvents(count: number): TrunkEvent[] {
    const events: TrunkEvent[] = []
    const baseTime = new Date('2026-01-01T10:00:00Z').getTime()

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(baseTime + i * 60000).toISOString()

      // Mix of event types
      if (i % 10 === 0) {
        events.push({
          type: 'leaf_created',
          timestamp,
          leafId: `leaf-${i}`,
          twigId: `branch-${i % 8}-twig-${i % 8}`,
          name: `Saga ${i}`,
        })
      } else if (i % 5 === 0) {
        events.push({
          type: 'sprout_planted',
          timestamp,
          sproutId: `sprout-${i}`,
          twigId: `branch-${i % 8}-twig-${i % 8}`,
          title: `Goal ${i}`,
          season: '2w',
          environment: 'fertile',
          soilCost: 2,
        })
      } else if (i % 3 === 0) {
        events.push({
          type: 'sprout_watered',
          timestamp,
          sproutId: `sprout-${Math.floor(i / 5) * 5}`,
          content: `Progress update ${i}`,
        })
      } else {
        events.push({
          type: 'sun_shone',
          timestamp,
          twigId: `branch-${i % 8}-twig-${i % 8}`,
          twigLabel: `Twig ${i}`,
          content: `Reflection ${i}`,
        })
      }
    }

    return events
  }

  describe('State Derivation Performance', () => {
    it('derives state from 100 events in < 50ms', () => {
      const events = generateEvents(100)

      const start = performance.now()
      deriveState(events)
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(50)
    })

    it('derives state from 1000 events in < 200ms', () => {
      const events = generateEvents(1000)

      const start = performance.now()
      deriveState(events)
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(200)
    })

    it('derives state from 5000 events in < 500ms', () => {
      const events = generateEvents(5000)

      const start = performance.now()
      deriveState(events)
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(500)
    })
  })

  describe('Repeated Derivation Performance', () => {
    it('multiple derivations stay consistent', () => {
      const events = generateEvents(500)
      const times: number[] = []

      // Run 10 times
      for (let i = 0; i < 10; i++) {
        const start = performance.now()
        deriveState(events)
        times.push(performance.now() - start)
      }

      // Calculate average and max
      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const max = Math.max(...times)

      // Average should be reasonable
      expect(avg).toBeLessThan(100)
      // No single run should be drastically slower (no memory leaks)
      expect(max).toBeLessThan(avg * 3)
    })
  })

  describe('JSON Serialization Performance', () => {
    it('serializes large state in < 100ms', () => {
      const events = generateEvents(1000)
      const state = deriveState(events)

      // Convert to serializable format
      const serializable = {
        soilCapacity: state.soilCapacity,
        soilAvailable: state.soilAvailable,
        sprouts: Array.from(state.sprouts.values()),
        leaves: Array.from(state.leaves.values()),
        sunEntries: state.sunEntries,
      }

      const start = performance.now()
      JSON.stringify(serializable)
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(100)
    })

    it('parses large JSON in < 100ms', () => {
      const events = generateEvents(1000)
      const state = deriveState(events)

      const serializable = {
        soilCapacity: state.soilCapacity,
        soilAvailable: state.soilAvailable,
        sprouts: Array.from(state.sprouts.values()),
        leaves: Array.from(state.leaves.values()),
        sunEntries: state.sunEntries,
      }

      const json = JSON.stringify(serializable)

      const start = performance.now()
      JSON.parse(json)
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(100)
    })
  })

  describe('Memory Efficiency', () => {
    it('does not create excessive objects', () => {
      const events = generateEvents(1000)

      // Get baseline
      const before = process.memoryUsage?.().heapUsed ?? 0

      // Run derivation multiple times
      for (let i = 0; i < 10; i++) {
        deriveState(events)
      }

      const after = process.memoryUsage?.().heapUsed ?? 0
      const growth = after - before

      // Memory growth should be bounded (< 50MB for 10 runs)
      // This is a sanity check, not a strict limit
      if (before > 0) {
        expect(growth).toBeLessThan(50 * 1024 * 1024)
      }
    })
  })
})
