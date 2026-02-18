/**
 * Tests for twig-view/form-validation.ts
 * Tests the updateFormState function which validates the sprout planting form.
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
  // Add options so value assignment works in jsdom
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

function createFormState(overrides?: Partial<FormState>): FormState {
  return {
    selectedSeason: null,
    selectedEnvironment: null,
    currentTwigNode: null,
    confirmResolve: null,
    ...overrides,
  }
}

describe('updateFormState', () => {
  beforeEach(() => {
    vi.mocked(calculateSoilCost).mockReturnValue(3)
    vi.mocked(getSoilAvailable).mockReturnValue(10)
    vi.mocked(canAffordSoil).mockReturnValue(true)
  })

  it('disables button when title is empty', () => {
    const elements = createMockElements()
    const state = createFormState({ selectedSeason: '1m', selectedEnvironment: 'fertile' })
    elements.leafSelect.value = 'leaf-1'

    updateFormState(state, elements)

    expect(elements.setBtn.disabled).toBe(true)
  })

  it('disables button when season is not selected', () => {
    const elements = createMockElements()
    const state = createFormState({ selectedEnvironment: 'fertile' })
    elements.sproutTitleInput.value = 'Test goal'
    elements.leafSelect.value = 'leaf-1'

    updateFormState(state, elements)

    expect(elements.setBtn.disabled).toBe(true)
  })

  it('disables button when environment is not selected', () => {
    const elements = createMockElements()
    const state = createFormState({ selectedSeason: '1m' })
    elements.sproutTitleInput.value = 'Test goal'
    elements.leafSelect.value = 'leaf-1'

    updateFormState(state, elements)

    expect(elements.setBtn.disabled).toBe(true)
  })

  it('disables button when no leaf is selected', () => {
    const elements = createMockElements()
    const state = createFormState({ selectedSeason: '1m', selectedEnvironment: 'fertile' })
    elements.sproutTitleInput.value = 'Test goal'
    elements.leafSelect.value = '' // No leaf

    updateFormState(state, elements)

    expect(elements.setBtn.disabled).toBe(true)
  })

  it('enables button when all required fields are filled and affordable', () => {
    const elements = createMockElements()
    const state = createFormState({ selectedSeason: '1m', selectedEnvironment: 'fertile' })
    elements.sproutTitleInput.value = 'Test goal'
    elements.leafSelect.value = 'leaf-1'

    updateFormState(state, elements)

    expect(elements.setBtn.disabled).toBe(false)
  })

  it('shows soil cost when season and environment are selected', () => {
    const elements = createMockElements()
    const state = createFormState({ selectedSeason: '1m', selectedEnvironment: 'fertile' })
    elements.sproutTitleInput.value = 'Test goal'
    elements.leafSelect.value = 'leaf-1'

    updateFormState(state, elements)

    expect(elements.soilCostDisplay.textContent).toBe('Cost: 3 soil (10 available)')
    expect(elements.soilCostDisplay.classList.contains('insufficient')).toBe(false)
  })

  it('shows insufficient class when cannot afford', () => {
    vi.mocked(canAffordSoil).mockReturnValue(false)
    const elements = createMockElements()
    const state = createFormState({ selectedSeason: '1m', selectedEnvironment: 'fertile' })
    elements.sproutTitleInput.value = 'Test goal'
    elements.leafSelect.value = 'leaf-1'

    updateFormState(state, elements)

    expect(elements.soilCostDisplay.classList.contains('insufficient')).toBe(true)
    expect(elements.setBtn.disabled).toBe(true)
  })

  it('clears soil cost display when season or environment not set', () => {
    const elements = createMockElements()
    const state = createFormState() // no season or env

    updateFormState(state, elements)

    expect(elements.soilCostDisplay.textContent).toBe('')
    expect(elements.soilCostDisplay.classList.contains('insufficient')).toBe(false)
  })

  it('validates new leaf name when __new__ is selected', () => {
    const elements = createMockElements()
    const state = createFormState({ selectedSeason: '1m', selectedEnvironment: 'fertile' })
    elements.sproutTitleInput.value = 'Test goal'
    elements.leafSelect.value = '__new__'
    elements.newLeafNameInput.value = 'My new leaf'

    updateFormState(state, elements)

    expect(elements.setBtn.disabled).toBe(false)
  })

  it('disables button when new leaf name is empty', () => {
    const elements = createMockElements()
    const state = createFormState({ selectedSeason: '1m', selectedEnvironment: 'fertile' })
    elements.sproutTitleInput.value = 'Test goal'
    elements.leafSelect.value = '__new__'
    elements.newLeafNameInput.value = ''

    updateFormState(state, elements)

    expect(elements.setBtn.disabled).toBe(true)
  })

  it('disables button when new leaf name exceeds max length', () => {
    const elements = createMockElements()
    const state = createFormState({ selectedSeason: '1m', selectedEnvironment: 'fertile' })
    elements.sproutTitleInput.value = 'Test goal'
    elements.leafSelect.value = '__new__'
    elements.newLeafNameInput.value = 'A'.repeat(41) // MAX_LEAF_NAME_LENGTH = 40

    updateFormState(state, elements)

    expect(elements.setBtn.disabled).toBe(true)
  })

  it('disables button when title exceeds max length', () => {
    const elements = createMockElements()
    const state = createFormState({ selectedSeason: '1m', selectedEnvironment: 'fertile' })
    elements.sproutTitleInput.value = 'A'.repeat(61) // MAX_TITLE_LENGTH = 60
    elements.leafSelect.value = 'leaf-1'

    updateFormState(state, elements)

    expect(elements.setBtn.disabled).toBe(true)
  })

  it('disables button when bloom wither exceeds max length', () => {
    const elements = createMockElements()
    const state = createFormState({ selectedSeason: '1m', selectedEnvironment: 'fertile' })
    elements.sproutTitleInput.value = 'Test goal'
    elements.leafSelect.value = 'leaf-1'
    elements.witherInput.value = 'A'.repeat(61) // MAX_BLOOM_LENGTH = 60

    updateFormState(state, elements)

    expect(elements.setBtn.disabled).toBe(true)
  })

  it('disables button when bloom budding exceeds max length', () => {
    const elements = createMockElements()
    const state = createFormState({ selectedSeason: '1m', selectedEnvironment: 'fertile' })
    elements.sproutTitleInput.value = 'Test goal'
    elements.leafSelect.value = 'leaf-1'
    elements.buddingInput.value = 'A'.repeat(61)

    updateFormState(state, elements)

    expect(elements.setBtn.disabled).toBe(true)
  })

  it('disables button when bloom flourish exceeds max length', () => {
    const elements = createMockElements()
    const state = createFormState({ selectedSeason: '1m', selectedEnvironment: 'fertile' })
    elements.sproutTitleInput.value = 'Test goal'
    elements.leafSelect.value = 'leaf-1'
    elements.flourishInput.value = 'A'.repeat(61)

    updateFormState(state, elements)

    expect(elements.setBtn.disabled).toBe(true)
  })

  it('allows empty bloom fields', () => {
    const elements = createMockElements()
    const state = createFormState({ selectedSeason: '1m', selectedEnvironment: 'fertile' })
    elements.sproutTitleInput.value = 'Test goal'
    elements.leafSelect.value = 'leaf-1'
    // All bloom fields empty (default)

    updateFormState(state, elements)

    expect(elements.setBtn.disabled).toBe(false)
  })

  it('shows cost on button when cost > 0', () => {
    vi.mocked(calculateSoilCost).mockReturnValue(5)
    const elements = createMockElements()
    const state = createFormState({ selectedSeason: '3m', selectedEnvironment: 'fertile' })
    elements.sproutTitleInput.value = 'Test goal'
    elements.leafSelect.value = 'leaf-1'

    updateFormState(state, elements)

    expect(elements.setBtn.innerHTML).toContain('-5.00')
    expect(elements.setBtn.innerHTML).toContain('Plant')
  })

  it('shows plain Plant text when cost is 0', () => {
    const elements = createMockElements()
    const state = createFormState() // no season/env = cost 0

    updateFormState(state, elements)

    expect(elements.setBtn.textContent).toBe('Plant')
  })

  it('trims whitespace from title for validation', () => {
    const elements = createMockElements()
    const state = createFormState({ selectedSeason: '1m', selectedEnvironment: 'fertile' })
    elements.sproutTitleInput.value = '   ' // whitespace only
    elements.leafSelect.value = 'leaf-1'

    updateFormState(state, elements)

    expect(elements.setBtn.disabled).toBe(true)
  })

  it('trims whitespace from new leaf name for validation', () => {
    const elements = createMockElements()
    const state = createFormState({ selectedSeason: '1m', selectedEnvironment: 'fertile' })
    elements.sproutTitleInput.value = 'Test goal'
    elements.leafSelect.value = '__new__'
    elements.newLeafNameInput.value = '   ' // whitespace only

    updateFormState(state, elements)

    expect(elements.setBtn.disabled).toBe(true)
  })
})
