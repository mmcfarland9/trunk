import { describe, it, expect, beforeEach } from 'vitest'
import { buildSproutForm, type SproutFormElements } from '../ui/twig-view/sprout-form'

describe('buildSproutForm', () => {
  let container: HTMLElement
  let elements: SproutFormElements

  beforeEach(() => {
    container = document.createElement('div')
    elements = buildSproutForm(container)
  })

  it('creates title input', () => {
    expect(elements.titleInput).toBeInstanceOf(HTMLInputElement)
    expect(elements.titleInput.placeholder).toContain('sprout')
  })

  it('creates season buttons for all 5 seasons', () => {
    expect(elements.seasonButtons).toHaveLength(5)
    expect(elements.seasonButtons[0].dataset.season).toBe('2w')
    expect(elements.seasonButtons[1].dataset.season).toBe('1m')
    expect(elements.seasonButtons[2].dataset.season).toBe('3m')
    expect(elements.seasonButtons[3].dataset.season).toBe('6m')
    expect(elements.seasonButtons[4].dataset.season).toBe('1y')
  })

  it('creates environment buttons for all 3 environments', () => {
    expect(elements.envButtons).toHaveLength(3)
    expect(elements.envButtons[0].dataset.env).toBe('fertile')
    expect(elements.envButtons[1].dataset.env).toBe('firm')
    expect(elements.envButtons[2].dataset.env).toBe('barren')
  })

  it('creates bloom inputs (wither, budding, flourish)', () => {
    expect(elements.witherInput).toBeInstanceOf(HTMLInputElement)
    expect(elements.buddingInput).toBeInstanceOf(HTMLInputElement)
    expect(elements.flourishInput).toBeInstanceOf(HTMLInputElement)
  })

  it('creates plant button that starts disabled', () => {
    expect(elements.plantButton).toBeInstanceOf(HTMLButtonElement)
    expect(elements.plantButton.disabled).toBe(true)
  })

  it('creates leaf select dropdown', () => {
    expect(elements.leafSelect).toBeInstanceOf(HTMLSelectElement)
  })

  it('creates new leaf name input (hidden by default)', () => {
    expect(elements.newLeafNameInput).toBeInstanceOf(HTMLInputElement)
    expect(elements.newLeafNameInput.classList.contains('hidden')).toBe(true)
  })

  it('creates soil cost display area', () => {
    expect(elements.soilCostDisplay).toBeInstanceOf(HTMLDivElement)
  })

  it('creates end date display area', () => {
    expect(elements.endDateDisplay).toBeInstanceOf(HTMLDivElement)
  })

  it('creates environment hints for all environments', () => {
    expect(elements.envHints).toHaveLength(3)
    expect(elements.envHints[0].dataset.for).toBe('fertile')
    expect(elements.envHints[1].dataset.for).toBe('firm')
    expect(elements.envHints[2].dataset.for).toBe('barren')
  })

  it('appends form to container', () => {
    expect(container.querySelector('.sprout-draft-form')).not.toBeNull()
  })

  it('title input has correct max length', () => {
    expect(elements.titleInput.maxLength).toBe(60)
  })

  it('new leaf name input has correct max length', () => {
    expect(elements.newLeafNameInput.maxLength).toBe(40)
  })

  it('bloom inputs have correct max length', () => {
    expect(elements.witherInput.maxLength).toBe(60)
    expect(elements.buddingInput.maxLength).toBe(60)
    expect(elements.flourishInput.maxLength).toBe(60)
  })

  it('leaf select has placeholder and new leaf options', () => {
    const options = elements.leafSelect.options
    expect(options.length).toBeGreaterThanOrEqual(2)
    expect(options[0].disabled).toBe(true) // placeholder
    expect(options[1].value).toBe('__new__')
  })
})
