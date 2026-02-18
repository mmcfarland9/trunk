/**
 * Contract tests for cross-platform data compatibility.
 * These ensure iOS and Web exports conform to the same schema.
 *
 * The "contract" is defined in shared/schemas/ and both platforms must honor it.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Load shared fixtures
const fixturesDir = join(__dirname, '../../../shared/test-fixtures')

function loadFixture(name: string) {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf-8'))
}

describe('Contract Tests - Export Schema', () => {
  describe('v4 Export Format', () => {
    it('requires _version field', () => {
      const minimal = loadFixture('minimal-state.json')
      expect(minimal._version).toBeDefined()
      expect(typeof minimal._version).toBe('number')
      expect(minimal._version).toBe(4)
    })

    it('requires _exportedAt field', () => {
      const minimal = loadFixture('minimal-state.json')
      expect(minimal._exportedAt).toBeDefined()
      expect(typeof minimal._exportedAt).toBe('string')
      // Should be ISO 8601 format
      expect(() => new Date(minimal._exportedAt)).not.toThrow()
    })

    it('requires events array', () => {
      const minimal = loadFixture('minimal-state.json')
      expect(minimal.events).toBeDefined()
      expect(Array.isArray(minimal.events)).toBe(true)
    })
  })

  describe('Event Types Contract', () => {
    const fullState = loadFixture('full-state.json')

    it('leaf_created has required fields', () => {
      const leafEvent = fullState.events.find((e: any) => e.type === 'leaf_created')
      expect(leafEvent).toBeDefined()
      expect(leafEvent.timestamp).toBeDefined()
      expect(leafEvent.leafId).toBeDefined()
      expect(leafEvent.twigId).toBeDefined()
      expect(leafEvent.name).toBeDefined()
    })

    it('sprout_planted has required fields', () => {
      const plantEvent = fullState.events.find((e: any) => e.type === 'sprout_planted')
      expect(plantEvent).toBeDefined()
      expect(plantEvent.timestamp).toBeDefined()
      expect(plantEvent.sproutId).toBeDefined()
      expect(plantEvent.twigId).toBeDefined()
      expect(plantEvent.title).toBeDefined()
      expect(plantEvent.season).toBeDefined()
      expect(plantEvent.environment).toBeDefined()
      expect(plantEvent.soilCost).toBeDefined()
    })

    it('sprout_planted season is valid enum', () => {
      const plantEvent = fullState.events.find((e: any) => e.type === 'sprout_planted')
      const validSeasons = ['2w', '1m', '3m', '6m', '1y']
      expect(validSeasons).toContain(plantEvent.season)
    })

    it('sprout_planted environment is valid enum', () => {
      const plantEvent = fullState.events.find((e: any) => e.type === 'sprout_planted')
      const validEnvironments = ['fertile', 'firm', 'barren']
      expect(validEnvironments).toContain(plantEvent.environment)
    })

    it('sprout_watered has required fields', () => {
      const waterEvent = fullState.events.find((e: any) => e.type === 'sprout_watered')
      expect(waterEvent).toBeDefined()
      expect(waterEvent.timestamp).toBeDefined()
      expect(waterEvent.sproutId).toBeDefined()
      expect(waterEvent.content).toBeDefined()
    })

    it('sprout_harvested has required fields', () => {
      const harvestEvent = fullState.events.find((e: any) => e.type === 'sprout_harvested')
      expect(harvestEvent).toBeDefined()
      expect(harvestEvent.timestamp).toBeDefined()
      expect(harvestEvent.sproutId).toBeDefined()
      expect(harvestEvent.result).toBeDefined()
      expect(harvestEvent.capacityGained).toBeDefined()
    })

    it('sprout_harvested result is 1-5', () => {
      const harvestEvent = fullState.events.find((e: any) => e.type === 'sprout_harvested')
      expect(harvestEvent.result).toBeGreaterThanOrEqual(1)
      expect(harvestEvent.result).toBeLessThanOrEqual(5)
    })

    it('sun_shone has required fields', () => {
      const sunEvent = fullState.events.find((e: any) => e.type === 'sun_shone')
      expect(sunEvent).toBeDefined()
      expect(sunEvent.timestamp).toBeDefined()
      expect(sunEvent.twigId).toBeDefined()
      expect(sunEvent.twigLabel).toBeDefined()
      expect(sunEvent.content).toBeDefined()
    })
  })

  describe('Timestamp Contract', () => {
    it('all timestamps are ISO 8601 format', () => {
      const fullState = loadFixture('full-state.json')

      for (const event of fullState.events) {
        expect(typeof event.timestamp).toBe('string')
        const date = new Date(event.timestamp)
        expect(date.toISOString()).toBeTruthy()
        // Should end with Z (UTC)
        expect(event.timestamp).toMatch(/Z$/)
      }
    })
  })

  describe('ID Format Contract', () => {
    it('twigId follows branch-N-twig-N pattern', () => {
      const fullState = loadFixture('full-state.json')
      const eventsWithTwig = fullState.events.filter((e: any) => e.twigId)

      for (const event of eventsWithTwig) {
        expect(event.twigId).toMatch(/^branch-\d+-twig-\d+$/)
      }
    })

    it('sproutId and leafId are non-empty strings', () => {
      const fullState = loadFixture('full-state.json')

      for (const event of fullState.events) {
        if (event.sproutId) {
          expect(typeof event.sproutId).toBe('string')
          expect(event.sproutId.length).toBeGreaterThan(0)
        }
        if (event.leafId) {
          expect(typeof event.leafId).toBe('string')
          expect(event.leafId.length).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('Optional Fields Contract', () => {
    it('bloomWither/bloomBudding/bloomFlourish are optional', () => {
      const fullState = loadFixture('full-state.json')
      const plantEvent = fullState.events.find((e: any) => e.type === 'sprout_planted')

      // These can be present or absent
      if (plantEvent.bloomWither !== undefined) {
        expect(typeof plantEvent.bloomWither).toBe('string')
      }
      if (plantEvent.bloomBudding !== undefined) {
        expect(typeof plantEvent.bloomBudding).toBe('string')
      }
      if (plantEvent.bloomFlourish !== undefined) {
        expect(typeof plantEvent.bloomFlourish).toBe('string')
      }
    })

    it('prompt is optional on water/sun events', () => {
      const fullState = loadFixture('full-state.json')
      const waterEvent = fullState.events.find((e: any) => e.type === 'sprout_watered')
      const sunEvent = fullState.events.find((e: any) => e.type === 'sun_shone')

      // prompt can be present or absent
      if (waterEvent.prompt !== undefined) {
        expect(typeof waterEvent.prompt).toBe('string')
      }
      if (sunEvent.prompt !== undefined) {
        expect(typeof sunEvent.prompt).toBe('string')
      }
    })

    it('leafId is optional on sprout_planted', () => {
      const fullState = loadFixture('full-state.json')
      const plantEvents = fullState.events.filter((e: any) => e.type === 'sprout_planted')

      // At least one should have leafId, but it's optional
      for (const event of plantEvents) {
        if (event.leafId !== undefined) {
          expect(typeof event.leafId).toBe('string')
        }
      }
    })
  })

  describe('Edge Cases Contract', () => {
    it('handles edge case timestamps correctly', () => {
      const edgeCases = loadFixture('edge-cases.json')

      // All timestamps should still be valid
      for (const event of edgeCases.events) {
        const date = new Date(event.timestamp)
        expect(date.getTime()).not.toBeNaN()
      }
    })

    it('handles special characters in content', () => {
      const edgeCases = loadFixture('edge-cases.json')
      const leafEvent = edgeCases.events.find((e: any) => e.type === 'leaf_created')

      // Special characters should be preserved
      expect(leafEvent.name).toContain('<')
      expect(leafEvent.name).toContain('>')
      expect(leafEvent.name).toContain('&')
    })
  })
})

describe('Contract Tests - Legacy Migration', () => {
  it('v1 format can be identified', () => {
    const legacy = loadFixture('legacy-v1.json')
    expect(legacy._version).toBe(1)
  })

  it('v1 format has nodes structure', () => {
    const legacy = loadFixture('legacy-v1.json')
    expect(legacy.nodes).toBeDefined()
    expect(typeof legacy.nodes).toBe('object')
  })

  it('v1 sprouts have required fields', () => {
    const legacy = loadFixture('legacy-v1.json')
    const twig = legacy.nodes['branch-0-twig-0']
    expect(twig.sprouts).toBeDefined()

    const sprout = twig.sprouts[0]
    expect(sprout.id).toBeDefined()
    expect(sprout.title).toBeDefined()
    expect(sprout.season).toBeDefined()
    expect(sprout.environment).toBeDefined()
    expect(sprout.state).toBeDefined()
  })

  it('v1 season 1w should migrate to 2w', () => {
    const legacy = loadFixture('legacy-v1.json')
    const sprout = legacy.nodes['branch-0-twig-0'].sprouts[0]

    // Old format had 1w which should be migrated to 2w
    expect(sprout.season).toBe('1w')
    // (Actual migration happens at import time)
  })
})
