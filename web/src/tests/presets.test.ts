/**
 * Tests for preset labels and notes utility
 */

import { describe, expect, it } from 'vitest'
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

    it('returns nodeId for negative branch index (no regex match)', () => {
      expect(getPresetLabel('branch--1')).toBe('branch--1')
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
    it('returns "Untitled" for empty string', () => {
      expect(getPresetLabel('')).toBe('Untitled')
    })

    it('returns nodeId for random string', () => {
      expect(getPresetLabel('random')).toBe('random')
    })

    it('returns nodeId for malformed branch id', () => {
      expect(getPresetLabel('branch-abc')).toBe('branch-abc')
    })

    it('returns nodeId for partial twig id', () => {
      expect(getPresetLabel('branch-0-twig')).toBe('branch-0-twig')
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
    it('returns branch description + motto for branch-0', () => {
      expect(getPresetNote('branch-0')).toBe("fitness & vitality\nthat which energizes one's body")
    })

    it('returns branch description + motto for branch-1', () => {
      expect(getPresetNote('branch-1')).toBe(
        'knowledge & curiosity\nthat by which one draws understanding',
      )
    })

    it('returns branch description + motto for branch-7', () => {
      expect(getPresetNote('branch-7')).toBe(
        'stability & direction\nthat by which one advances through time',
      )
    })

    it('returns empty string for invalid branch index', () => {
      expect(getPresetNote('branch-99')).toBe('')
    })
  })

  describe('twig and invalid nodes', () => {
    it('returns twig description for twig nodes', () => {
      expect(getPresetNote('branch-0-twig-0')).toBe('locomotion; ambulation; cardio')
    })

    it('returns empty string for empty string', () => {
      expect(getPresetNote('')).toBe('')
    })

    it('returns empty string for random string', () => {
      expect(getPresetNote('invalid')).toBe('')
    })
  })
})
