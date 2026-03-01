/**
 * Edge case tests for twig-view/form-validation.ts
 * Tests exact boundary lengths, whitespace-only inputs, and combined validation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock state module
vi.mock('../state', () => ({
  calculateSoilCost: vi.fn(() => 3),
  getSoilAvailable: vi.fn(() => 10),
  canAffordSoil: vi.fn(() => true),
}))

import { updateFormState } from '../ui/twig-view/form-validation'
import type { FormState } from '../ui/twig-view/sprout-form'
import { calculateSoilCost, getSoilAvailable, canAffordSoil } from '../state'

function createMockElements() {
  const leafSelect = document.createElement('select')
  const emptyOpt = document.createElement('option')
  emptyOpt.value = ''
  emptyOpt.textContent = 'Select leaf...'
  leafSelect.append(emptyOpt)

  const existingOpt = document.createElement('option')
  existingOpt.value = 'leaf-1'
  existingOpt.textContent = 'Existing Leaf'
  leafSelect.append(existingOpt)

  const newOpt = document.createElement('option')
  newOpt.value = '__new__'
  newOpt.textContent = 'New leaf...'
  leafSelect.append(newOpt)

  return {
    sproutTitleInput: Object.assign(document.createElement('input'), { value: '' }),
    leafSelect,
    newLeafNameInput: Object.assign(document.createElement('input'), { value: '' }),
    witherInput: Object.assign(document.createElement('input'), { value: '' }),
    buddingInput: Object.assign(document.createElement('input'), { value: '' }),
    flourishInput: Object.assign(document.createElement('input'), { value: '' }),
    soilCostDisplay: document.createElement('div'),
    setBtn: Object.assign(document.createElement('button'), { disabled: true }),
  }
}

function validFormState(overrides?: Partial<FormState>): FormState {
  return {
    selectedSeason: '1m',
    selectedEnvironment: 'fertile',
    currentTwigNode: null,
    confirmResolve: null,
    ...overrides,
  }
}

describe('Form Validation Edge Cases', () => {
  beforeEach(() => {
    vi.mocked(calculateSoilCost).mockReturnValue(3)
    vi.mocked(getSoilAvailable).mockReturnValue(10)
    vi.mocked(canAffordSoil).mockReturnValue(true)
  })

  describe('Title length boundaries', () => {
    it('accepts title at exact max length (60 chars)', () => {
      const elements = createMockElements()
      const state = validFormState()
      elements.sproutTitleInput.value = 'A'.repeat(60)
      elements.leafSelect.value = 'leaf-1'

      updateFormState(state, elements)

      expect(elements.setBtn.disabled).toBe(false)
    })

    it('rejects title at 61 chars', () => {
      const elements = createMockElements()
      const state = validFormState()
      elements.sproutTitleInput.value = 'A'.repeat(61)
      elements.leafSelect.value = 'leaf-1'

      updateFormState(state, elements)

      expect(elements.setBtn.disabled).toBe(true)
    })

    it('rejects empty title', () => {
      const elements = createMockElements()
      const state = validFormState()
      elements.sproutTitleInput.value = ''
      elements.leafSelect.value = 'leaf-1'

      updateFormState(state, elements)

      expect(elements.setBtn.disabled).toBe(true)
    })

    it('rejects whitespace-only title', () => {
      const elements = createMockElements()
      const state = validFormState()
      elements.sproutTitleInput.value = '     '
      elements.leafSelect.value = 'leaf-1'

      updateFormState(state, elements)

      expect(elements.setBtn.disabled).toBe(true)
    })

    it('accepts single character title', () => {
      const elements = createMockElements()
      const state = validFormState()
      elements.sproutTitleInput.value = 'X'
      elements.leafSelect.value = 'leaf-1'

      updateFormState(state, elements)

      expect(elements.setBtn.disabled).toBe(false)
    })

    it('trims whitespace before measuring title length', () => {
      const elements = createMockElements()
      const state = validFormState()
      // 58 chars + 2 spaces of padding = within limit after trim
      elements.sproutTitleInput.value = ` ${'A'.repeat(58)} `
      elements.leafSelect.value = 'leaf-1'

      updateFormState(state, elements)

      expect(elements.setBtn.disabled).toBe(false)
    })
  })

  describe('All fields valid', () => {
    it('enables button when all required fields are complete', () => {
      const elements = createMockElements()
      const state = validFormState()
      elements.sproutTitleInput.value = 'My test goal'
      elements.leafSelect.value = 'leaf-1'
      elements.witherInput.value = 'Bad outcome'
      elements.buddingInput.value = 'OK outcome'
      elements.flourishInput.value = 'Great outcome'

      updateFormState(state, elements)

      expect(elements.setBtn.disabled).toBe(false)
    })
  })

  describe('Missing season', () => {
    it('disables button when season is null', () => {
      const elements = createMockElements()
      const state = validFormState({ selectedSeason: null })
      elements.sproutTitleInput.value = 'My goal'
      elements.leafSelect.value = 'leaf-1'

      updateFormState(state, elements)

      expect(elements.setBtn.disabled).toBe(true)
    })
  })

  describe('Missing environment', () => {
    it('disables button when environment is null', () => {
      const elements = createMockElements()
      const state = validFormState({ selectedEnvironment: null })
      elements.sproutTitleInput.value = 'My goal'
      elements.leafSelect.value = 'leaf-1'

      updateFormState(state, elements)

      expect(elements.setBtn.disabled).toBe(true)
    })
  })

  describe('Leaf validation edge cases', () => {
    it('disables button when new leaf name is selected but empty', () => {
      const elements = createMockElements()
      const state = validFormState()
      elements.sproutTitleInput.value = 'My goal'
      elements.leafSelect.value = '__new__'
      elements.newLeafNameInput.value = ''

      updateFormState(state, elements)

      expect(elements.setBtn.disabled).toBe(true)
    })

    it('disables button when new leaf name is whitespace only', () => {
      const elements = createMockElements()
      const state = validFormState()
      elements.sproutTitleInput.value = 'My goal'
      elements.leafSelect.value = '__new__'
      elements.newLeafNameInput.value = '    '

      updateFormState(state, elements)

      expect(elements.setBtn.disabled).toBe(true)
    })

    it('accepts new leaf name at exact max length (40 chars)', () => {
      const elements = createMockElements()
      const state = validFormState()
      elements.sproutTitleInput.value = 'My goal'
      elements.leafSelect.value = '__new__'
      elements.newLeafNameInput.value = 'B'.repeat(40)

      updateFormState(state, elements)

      expect(elements.setBtn.disabled).toBe(false)
    })

    it('rejects new leaf name at 41 chars', () => {
      const elements = createMockElements()
      const state = validFormState()
      elements.sproutTitleInput.value = 'My goal'
      elements.leafSelect.value = '__new__'
      elements.newLeafNameInput.value = 'B'.repeat(41)

      updateFormState(state, elements)

      expect(elements.setBtn.disabled).toBe(true)
    })
  })

  describe('Bloom length boundaries', () => {
    it('accepts bloom at exact max length (60 chars)', () => {
      const elements = createMockElements()
      const state = validFormState()
      elements.sproutTitleInput.value = 'My goal'
      elements.leafSelect.value = 'leaf-1'
      elements.witherInput.value = 'C'.repeat(60)
      elements.buddingInput.value = 'D'.repeat(60)
      elements.flourishInput.value = 'E'.repeat(60)

      updateFormState(state, elements)

      expect(elements.setBtn.disabled).toBe(false)
    })

    it('rejects when any single bloom exceeds max length', () => {
      const elements = createMockElements()
      const state = validFormState()
      elements.sproutTitleInput.value = 'My goal'
      elements.leafSelect.value = 'leaf-1'
      elements.witherInput.value = 'Valid'
      elements.buddingInput.value = 'C'.repeat(61)
      elements.flourishInput.value = 'Valid'

      updateFormState(state, elements)

      expect(elements.setBtn.disabled).toBe(true)
    })

    it('rejects when all bloom fields exceed max length', () => {
      const elements = createMockElements()
      const state = validFormState()
      elements.sproutTitleInput.value = 'My goal'
      elements.leafSelect.value = 'leaf-1'
      elements.witherInput.value = 'C'.repeat(61)
      elements.buddingInput.value = 'D'.repeat(61)
      elements.flourishInput.value = 'E'.repeat(61)

      updateFormState(state, elements)

      expect(elements.setBtn.disabled).toBe(true)
    })
  })

  describe('Soil cost display', () => {
    it('shows cost with available when both season and environment set', () => {
      vi.mocked(calculateSoilCost).mockReturnValue(5)
      vi.mocked(getSoilAvailable).mockReturnValue(20)
      const elements = createMockElements()
      const state = validFormState({ selectedSeason: '3m', selectedEnvironment: 'firm' })
      elements.sproutTitleInput.value = 'My goal'
      elements.leafSelect.value = 'leaf-1'

      updateFormState(state, elements)

      expect(elements.soilCostDisplay.textContent).toBe('Cost: 5 soil (20 available)')
    })

    it('clears cost display when only season set', () => {
      const elements = createMockElements()
      const state = validFormState({ selectedEnvironment: null })

      updateFormState(state, elements)

      expect(elements.soilCostDisplay.textContent).toBe('')
    })

    it('clears cost display when only environment set', () => {
      const elements = createMockElements()
      const state = validFormState({ selectedSeason: null })

      updateFormState(state, elements)

      expect(elements.soilCostDisplay.textContent).toBe('')
    })

    it('adds role=alert when insufficient soil', () => {
      vi.mocked(canAffordSoil).mockReturnValue(false)
      const elements = createMockElements()
      const state = validFormState()
      elements.sproutTitleInput.value = 'My goal'
      elements.leafSelect.value = 'leaf-1'

      updateFormState(state, elements)

      expect(elements.soilCostDisplay.getAttribute('role')).toBe('alert')
    })

    it('removes role=alert when soil is sufficient', () => {
      const elements = createMockElements()
      elements.soilCostDisplay.setAttribute('role', 'alert')
      const state = validFormState()
      elements.sproutTitleInput.value = 'My goal'
      elements.leafSelect.value = 'leaf-1'

      updateFormState(state, elements)

      expect(elements.soilCostDisplay.getAttribute('role')).toBeNull()
    })
  })
})
