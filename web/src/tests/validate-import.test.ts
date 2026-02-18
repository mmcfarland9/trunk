/**
 * Tests for import validation and sanitization utilities.
 */

import { describe, it, expect } from 'vitest'
import {
  validateSprout,
  validateLeaf,
  sanitizeSprout,
  sanitizeLeaf,
} from '../utils/validate-import'

describe('Sprout Validation', () => {
  it('should validate a complete sprout', () => {
    const sprout = {
      id: 'sprout-123',
      title: 'Test Sprout',
      season: '1m',
      environment: 'fertile',
      state: 'active',
      soilCost: 3,
      createdAt: '2024-01-01T00:00:00Z',
    }
    const result = validateSprout(sprout, 0)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject sprout without id', () => {
    const sprout = {
      title: 'Test Sprout',
      season: '1m',
      environment: 'fertile',
      state: 'active',
    }
    const result = validateSprout(sprout, 0)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('id'))).toBe(true)
  })

  it('should reject invalid season', () => {
    const sprout = {
      id: 'sprout-123',
      title: 'Test',
      season: 'invalid',
      environment: 'fertile',
      state: 'active',
    }
    const result = validateSprout(sprout, 0)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('season'))).toBe(true)
  })

  it('should reject invalid environment', () => {
    const sprout = {
      id: 'sprout-123',
      title: 'Test',
      season: '1m',
      environment: 'unknown',
      state: 'active',
    }
    const result = validateSprout(sprout, 0)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('environment'))).toBe(true)
  })

  it('should reject invalid state', () => {
    const sprout = {
      id: 'sprout-123',
      title: 'Test',
      season: '1m',
      environment: 'fertile',
      state: 'unknown',
    }
    const result = validateSprout(sprout, 0)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('state'))).toBe(true)
  })

  it('should warn about invalid result range', () => {
    const sprout = {
      id: 'sprout-123',
      title: 'Test',
      season: '1m',
      environment: 'fertile',
      state: 'completed',
      result: 10,
    }
    const result = validateSprout(sprout, 0)
    expect(result.valid).toBe(true) // Still valid, just warnings
    expect(result.warnings.some((w) => w.includes('result'))).toBe(true)
  })
})

describe('Leaf Validation', () => {
  it('should validate a complete leaf', () => {
    const leaf = {
      id: 'leaf-123',
      name: 'Test Leaf',
      createdAt: '2024-01-01T00:00:00Z',
    }
    const result = validateLeaf(leaf, 0)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject leaf without id', () => {
    const leaf = {
      name: 'Test Leaf',
    }
    const result = validateLeaf(leaf, 0)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('id'))).toBe(true)
  })

  it('should warn about missing name', () => {
    const leaf = {
      id: 'leaf-123',
    }
    const result = validateLeaf(leaf, 0)
    expect(result.valid).toBe(true) // Still valid, just warning
    expect(result.warnings.some((w) => w.includes('name'))).toBe(true)
  })
})

describe('Sprout Sanitization', () => {
  it('should sanitize valid sprout', () => {
    const raw = {
      id: 'sprout-123',
      title: 'Test Sprout',
      season: '1m',
      environment: 'fertile',
      state: 'active',
      soilCost: 3,
    }
    const result = sanitizeSprout(raw)
    expect(result).not.toBeNull()
    expect(result?.id).toBe('sprout-123')
    expect(result?.title).toBe('Test Sprout')
  })

  it('should return null for invalid sprout', () => {
    const result = sanitizeSprout({ title: 'No ID' })
    expect(result).toBeNull()
  })

  it('should fix invalid season to 2w', () => {
    const raw = {
      id: 'sprout-123',
      title: 'Test',
      season: 'invalid',
      environment: 'fertile',
      state: 'active',
    }
    const result = sanitizeSprout(raw)
    expect(result?.season).toBe('2w')
  })

  it('should fix invalid environment to fertile', () => {
    const raw = {
      id: 'sprout-123',
      title: 'Test',
      season: '1m',
      environment: 'unknown',
      state: 'active',
    }
    const result = sanitizeSprout(raw)
    expect(result?.environment).toBe('fertile')
  })

  it('should preserve optional bloom fields', () => {
    const raw = {
      id: 'sprout-123',
      title: 'Test',
      season: '1m',
      environment: 'fertile',
      state: 'active',
      bloomWither: 'Failed outcome',
      bloomBudding: 'Medium outcome',
      bloomFlourish: 'Great outcome',
    }
    const result = sanitizeSprout(raw)
    expect(result?.bloomWither).toBe('Failed outcome')
    expect(result?.bloomBudding).toBe('Medium outcome')
    expect(result?.bloomFlourish).toBe('Great outcome')
  })

  it('should sanitize water entries', () => {
    const raw = {
      id: 'sprout-123',
      title: 'Test',
      season: '1m',
      environment: 'fertile',
      state: 'active',
      waterEntries: [
        { timestamp: '2024-01-01', content: 'Entry 1' },
        { invalid: true },
        { timestamp: '2024-01-02', content: 'Entry 2', prompt: 'Question?' },
      ],
    }
    const result = sanitizeSprout(raw)
    expect(result?.waterEntries).toHaveLength(2)
    expect(result?.waterEntries?.[0].content).toBe('Entry 1')
    expect(result?.waterEntries?.[1].prompt).toBe('Question?')
  })
})

describe('Leaf Sanitization', () => {
  it('should sanitize valid leaf', () => {
    const raw = {
      id: 'leaf-123',
      name: 'Test Leaf',
      createdAt: '2024-01-01T00:00:00Z',
    }
    const result = sanitizeLeaf(raw)
    expect(result).not.toBeNull()
    expect(result?.id).toBe('leaf-123')
    expect(result?.name).toBe('Test Leaf')
  })

  it('should return null for leaf without id', () => {
    const result = sanitizeLeaf({ name: 'No ID' })
    expect(result).toBeNull()
  })

  it('should provide default name if missing', () => {
    const raw = { id: 'leaf-123' }
    const result = sanitizeLeaf(raw)
    expect(result?.name).toBe('Unnamed Saga')
  })
})
