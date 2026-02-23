/**
 * Tests for utils/twig-id.ts
 * Tests parseTwigId with valid IDs, malformed IDs, and edge cases.
 */

import { describe, it, expect } from 'vitest'
import { parseTwigId } from '../utils/twig-id'

describe('parseTwigId', () => {
  describe('valid IDs', () => {
    it('parses branch-0-twig-0', () => {
      expect(parseTwigId('branch-0-twig-0')).toEqual({ branchIndex: 0, twigIndex: 0 })
    })

    it('parses branch-7-twig-7', () => {
      expect(parseTwigId('branch-7-twig-7')).toEqual({ branchIndex: 7, twigIndex: 7 })
    })

    it('parses branch-3-twig-5', () => {
      expect(parseTwigId('branch-3-twig-5')).toEqual({ branchIndex: 3, twigIndex: 5 })
    })

    it('parses all 64 valid twig IDs', () => {
      for (let b = 0; b < 8; b++) {
        for (let t = 0; t < 8; t++) {
          const result = parseTwigId(`branch-${b}-twig-${t}`)
          expect(result).toEqual({ branchIndex: b, twigIndex: t })
        }
      }
    })

    it('parses indices beyond 7 (no upper-bound enforcement)', () => {
      // The parser only validates format, not domain range
      expect(parseTwigId('branch-10-twig-99')).toEqual({ branchIndex: 10, twigIndex: 99 })
    })
  })

  describe('malformed IDs', () => {
    it('returns null for empty string', () => {
      expect(parseTwigId('')).toBeNull()
    })

    it('returns null for missing parts', () => {
      expect(parseTwigId('branch-0')).toBeNull()
    })

    it('returns null for extra parts', () => {
      expect(parseTwigId('branch-0-twig-0-extra')).toBeNull()
    })

    it('returns null for non-numeric branch index', () => {
      expect(parseTwigId('branch-abc-twig-0')).toBeNull()
    })

    it('returns null for non-numeric twig index', () => {
      expect(parseTwigId('branch-0-twig-xyz')).toBeNull()
    })

    it('returns null for negative branch index', () => {
      expect(parseTwigId('branch--1-twig-0')).toBeNull()
    })

    it('returns null for negative twig index', () => {
      expect(parseTwigId('branch-0-twig--1')).toBeNull()
    })

    it('returns null for wrong prefix', () => {
      expect(parseTwigId('trunk-0-twig-0')).toBeNull()
    })

    it('returns null for wrong middle segment', () => {
      expect(parseTwigId('branch-0-leaf-0')).toBeNull()
    })

    it('returns null for uppercase', () => {
      expect(parseTwigId('BRANCH-0-TWIG-0')).toBeNull()
    })

    it('returns null for mixed case', () => {
      expect(parseTwigId('Branch-0-Twig-0')).toBeNull()
    })

    it('returns null for whitespace', () => {
      expect(parseTwigId(' branch-0-twig-0')).toBeNull()
      expect(parseTwigId('branch-0-twig-0 ')).toBeNull()
    })

    it('returns null for decimal indices', () => {
      expect(parseTwigId('branch-0.5-twig-0')).toBeNull()
    })

    it('returns null for just a number', () => {
      expect(parseTwigId('42')).toBeNull()
    })

    it('returns null for random string', () => {
      expect(parseTwigId('hello-world')).toBeNull()
    })
  })
})
