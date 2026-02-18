/**
 * Functional tests for state management and calculations.
 */

import { describe, it, expect } from 'vitest'
import { calculateSoilCost } from '../state'
import {
  generateSproutId,
  generateLeafId,
  getActiveSprouts,
  getCompletedSprouts,
  deriveState,
} from '../events'
import type { TrunkEvent } from '../events'

describe('Soil Cost Calculation', () => {
  it('should calculate correct cost for fertile environment', () => {
    expect(calculateSoilCost('2w', 'fertile')).toBe(2)
    expect(calculateSoilCost('1m', 'fertile')).toBe(3)
    expect(calculateSoilCost('3m', 'fertile')).toBe(5)
    expect(calculateSoilCost('6m', 'fertile')).toBe(8)
    expect(calculateSoilCost('1y', 'fertile')).toBe(12)
  })

  it('should calculate correct cost for firm environment', () => {
    expect(calculateSoilCost('2w', 'firm')).toBe(3)
    expect(calculateSoilCost('1m', 'firm')).toBe(5)
    expect(calculateSoilCost('3m', 'firm')).toBe(8)
    expect(calculateSoilCost('6m', 'firm')).toBe(12)
    expect(calculateSoilCost('1y', 'firm')).toBe(18)
  })

  it('should calculate correct cost for barren environment', () => {
    expect(calculateSoilCost('2w', 'barren')).toBe(4)
    expect(calculateSoilCost('1m', 'barren')).toBe(6)
    expect(calculateSoilCost('3m', 'barren')).toBe(10)
    expect(calculateSoilCost('6m', 'barren')).toBe(16)
    expect(calculateSoilCost('1y', 'barren')).toBe(24)
  })
})

describe('Sprout State Filtering (Events-based)', () => {
  const plantEvent = (id: string, title: string): TrunkEvent => ({
    type: 'sprout_planted',
    timestamp: new Date().toISOString(),
    sproutId: id,
    twigId: 'twig-1',
    title,
    season: '1m',
    environment: 'fertile',
    soilCost: 3,
  })

  const harvestEvent = (id: string): TrunkEvent => ({
    type: 'sprout_harvested',
    timestamp: new Date().toISOString(),
    sproutId: id,
    result: 4,
    capacityGained: 0.5,
  })

  it('should return only active sprouts from derived state', () => {
    const events: TrunkEvent[] = [
      plantEvent('1', 'Sprout 1'),
      plantEvent('2', 'Sprout 2'),
      plantEvent('3', 'Sprout 3'),
      harvestEvent('3'), // Harvest sprout 3
    ]

    const state = deriveState(events)
    const active = getActiveSprouts(state)

    expect(active.length).toBe(2)
    expect(active.every((s) => s.state === 'active')).toBe(true)
  })

  it('should return only completed sprouts from derived state', () => {
    const events: TrunkEvent[] = [
      plantEvent('1', 'Sprout 1'),
      plantEvent('2', 'Sprout 2'),
      plantEvent('3', 'Sprout 3'),
      harvestEvent('2'),
      harvestEvent('3'),
    ]

    const state = deriveState(events)
    const completed = getCompletedSprouts(state)

    expect(completed.length).toBe(2)
    expect(completed.every((s) => s.state === 'completed')).toBe(true)
  })

  it('should correctly partition active and completed sprouts', () => {
    const events: TrunkEvent[] = [
      plantEvent('1', 'Sprout 1'),
      plantEvent('2', 'Sprout 2'),
      plantEvent('3', 'Sprout 3'),
      harvestEvent('3'),
    ]

    const state = deriveState(events)
    const active = getActiveSprouts(state)
    const completed = getCompletedSprouts(state)

    expect(active.length + completed.length).toBe(3)
  })
})

describe('ID Generation', () => {
  it('should generate unique sprout IDs', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateSproutId())
    }
    expect(ids.size).toBe(100)
  })

  it('should generate unique leaf IDs', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateLeafId())
    }
    expect(ids.size).toBe(100)
  })

  it('should generate IDs with correct prefixes', () => {
    expect(generateSproutId()).toMatch(/^sprout-/)
    expect(generateLeafId()).toMatch(/^leaf-/)
  })
})
