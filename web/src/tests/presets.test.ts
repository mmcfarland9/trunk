/**
 * Tests for preset labels and notes utility
 */

import { describe, it, expect } from 'vitest'
import { getPresetLabel, getPresetNote } from '../utils/presets'

describe('getPresetLabel', () => {
  describe('trunk node', () => {
    it('returns "TRUNK" for trunk node id', () => {
      expect(getPresetLabel('trunk')).toBe('TRUNK')
    })
  })

  describe('branch nodes', () => {
    it('returns branch name for branch-0', () => {
      expect(getPresetLabel('branch-0')).toBe('CORE')
    })

    it('returns branch name for branch-1', () => {
      expect(getPresetLabel('branch-1')).toBe('BRAIN')
    })

    it('returns branch name for branch-7', () => {
      expect(getPresetLabel('branch-7')).toBe('FEET')
    })

    it('returns empty string for invalid branch index', () => {
      expect(getPresetLabel('branch-99')).toBe('')
    })

    it('returns empty string for negative branch index', () => {
      expect(getPresetLabel('branch--1')).toBe('')
    })
  })

  describe('twig nodes', () => {
    it('returns twig name for branch-0-twig-0', () => {
      expect(getPresetLabel('branch-0-twig-0')).toBe('movement')
    })

    it('returns twig name for branch-0-twig-7', () => {
      expect(getPresetLabel('branch-0-twig-7')).toBe('appearance')
    })

    it('returns twig name for branch-1-twig-0', () => {
      expect(getPresetLabel('branch-1-twig-0')).toBe('reading')
    })

    it('returns twig name for branch-7-twig-7', () => {
      expect(getPresetLabel('branch-7-twig-7')).toBe('administration')
    })

    it('returns empty string for invalid twig index', () => {
      expect(getPresetLabel('branch-0-twig-99')).toBe('')
    })

    it('returns empty string for invalid branch in twig id', () => {
      expect(getPresetLabel('branch-99-twig-0')).toBe('')
    })
  })

  describe('invalid node ids', () => {
    it('returns empty string for empty string', () => {
      expect(getPresetLabel('')).toBe('')
    })

    it('returns empty string for random string', () => {
      expect(getPresetLabel('random')).toBe('')
    })

    it('returns empty string for malformed branch id', () => {
      expect(getPresetLabel('branch-abc')).toBe('')
    })

    it('returns empty string for partial twig id', () => {
      expect(getPresetLabel('branch-0-twig')).toBe('')
    })
  })
})

describe('getPresetNote', () => {
  describe('trunk node', () => {
    it('returns "Your life map" for trunk', () => {
      expect(getPresetNote('trunk')).toBe('Your life map')
    })
  })

  describe('branch nodes', () => {
    it('returns branch description for branch-0', () => {
      expect(getPresetNote('branch-0')).toBe('fitness & vitality')
    })

    it('returns branch description for branch-1', () => {
      expect(getPresetNote('branch-1')).toBe('knowledge & curiosity')
    })

    it('returns branch description for branch-7', () => {
      expect(getPresetNote('branch-7')).toBe('stability & direction')
    })

    it('returns empty string for invalid branch index', () => {
      expect(getPresetNote('branch-99')).toBe('')
    })
  })

  describe('twig and invalid nodes', () => {
    it('returns empty string for twig nodes', () => {
      expect(getPresetNote('branch-0-twig-0')).toBe('')
    })

    it('returns empty string for empty string', () => {
      expect(getPresetNote('')).toBe('')
    })

    it('returns empty string for random string', () => {
      expect(getPresetNote('invalid')).toBe('')
    })
  })
})
