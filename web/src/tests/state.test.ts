/**
 * Functional tests for state management.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateSoilCost,
  getActiveSprouts,
  getHistorySprouts,
  generateSproutId,
  generateLeafId,
} from '../state'
import type { Sprout } from '../types'

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

describe('Sprout State Filtering', () => {
  const baseSprout: Omit<Sprout, 'id' | 'state'> = {
    title: 'Test Sprout',
    season: '1m',
    environment: 'fertile',
    soilCost: 3,
    createdAt: new Date().toISOString(),
  }

  const sprouts: Sprout[] = [
    { ...baseSprout, id: '1', state: 'active' },
    { ...baseSprout, id: '2', state: 'active' },
    { ...baseSprout, id: '3', state: 'completed', result: 4 },
    { ...baseSprout, id: '4', state: 'completed', result: 2 },
    { ...baseSprout, id: '5', state: 'completed', result: 5 },
  ]

  it('should return only active sprouts', () => {
    const active = getActiveSprouts(sprouts)
    expect(active.length).toBe(2)
    expect(active.every(s => s.state === 'active')).toBe(true)
  })

  it('should return only completed sprouts as history', () => {
    const history = getHistorySprouts(sprouts)
    expect(history.length).toBe(3)
    expect(history.every(s => s.state === 'completed')).toBe(true)
  })

  it('should correctly partition active and completed sprouts', () => {
    const active = getActiveSprouts(sprouts)
    const history = getHistorySprouts(sprouts)
    expect(active.length + history.length).toBe(sprouts.length)
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
