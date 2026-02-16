import { describe, it, expect } from 'vitest'
import { generateSproutId, generateLeafId } from '../events'

describe('ID Generation', () => {
  describe('generateSproutId', () => {
    it('returns ID with sprout- prefix', () => {
      const id = generateSproutId()
      expect(id).toMatch(/^sprout-/)
    })

    it('matches UUID v4 pattern with prefix', () => {
      const id = generateSproutId()
      expect(id).toMatch(/^sprout-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })

    it('generates unique IDs', () => {
      const ids = [
        generateSproutId(),
        generateSproutId(),
        generateSproutId(),
        generateSproutId(),
        generateSproutId(),
      ]
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(5)
    })

    it('generates lowercase UUIDs', () => {
      const id = generateSproutId()
      expect(id).toBe(id.toLowerCase())
    })
  })

  describe('generateLeafId', () => {
    it('returns ID with leaf- prefix', () => {
      const id = generateLeafId()
      expect(id).toMatch(/^leaf-/)
    })

    it('matches UUID v4 pattern with prefix', () => {
      const id = generateLeafId()
      expect(id).toMatch(/^leaf-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })

    it('generates unique IDs', () => {
      const ids = [
        generateLeafId(),
        generateLeafId(),
        generateLeafId(),
        generateLeafId(),
        generateLeafId(),
      ]
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(5)
    })

    it('generates lowercase UUIDs', () => {
      const id = generateLeafId()
      expect(id).toBe(id.toLowerCase())
    })
  })
})
