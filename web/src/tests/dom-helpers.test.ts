import { describe, it, expect, beforeEach } from 'vitest'
import { requireElement } from '../utils/dom-helpers'

describe('requireElement', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
  })

  it('returns element when found', () => {
    const button = document.createElement('button')
    button.className = 'test-button'
    container.append(button)

    const result = requireElement<HTMLButtonElement>(
      container,
      '.test-button',
      'test button'
    )

    expect(result).toBe(button)
    expect(result.tagName).toBe('BUTTON')
  })

  it('returns correct element type when found', () => {
    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'test-input'
    container.append(input)

    const result = requireElement<HTMLInputElement>(
      container,
      '.test-input',
      'test input'
    )

    expect(result).toBe(input)
    expect(result.type).toBe('text')
  })

  it('works with Document as parent', () => {
    const div = document.createElement('div')
    div.id = 'unique-test-id'
    document.body.append(div)

    const result = requireElement<HTMLDivElement>(
      document,
      '#unique-test-id',
      'unique test div'
    )

    expect(result).toBe(div)
    div.remove()
  })

  it('throws descriptive error when element not found', () => {
    expect(() => {
      requireElement<HTMLButtonElement>(
        container,
        '.missing-button',
        'missing button'
      )
    }).toThrow('Required element not found: missing button (selector: ".missing-button")')
  })

  it('throws error with correct selector in message', () => {
    expect(() => {
      requireElement<HTMLInputElement>(
        container,
        'input[type="checkbox"]',
        'checkbox input'
      )
    }).toThrow('Required element not found: checkbox input (selector: "input[type="checkbox"]")')
  })

  it('works with complex selectors', () => {
    const section = document.createElement('section')
    const button = document.createElement('button')
    button.className = 'action-btn primary'
    button.dataset.action = 'submit'
    section.append(button)
    container.append(section)

    const result = requireElement<HTMLButtonElement>(
      container,
      'section button.action-btn[data-action="submit"]',
      'submit action button'
    )

    expect(result).toBe(button)
  })

  it('works with typed elements - HTMLButtonElement', () => {
    const button = document.createElement('button')
    button.type = 'submit'
    button.className = 'submit-btn'
    container.append(button)

    const result = requireElement<HTMLButtonElement>(
      container,
      '.submit-btn',
      'submit button'
    )

    expect(result.type).toBe('submit')
    expect(result.click).toBeDefined()
  })

  it('works with typed elements - HTMLTextAreaElement', () => {
    const textarea = document.createElement('textarea')
    textarea.className = 'comment-box'
    textarea.placeholder = 'Enter comment'
    container.append(textarea)

    const result = requireElement<HTMLTextAreaElement>(
      container,
      '.comment-box',
      'comment textarea'
    )

    expect(result.placeholder).toBe('Enter comment')
    expect(result.value).toBe('')
  })

  it('works with typed elements - HTMLSelectElement', () => {
    const select = document.createElement('select')
    select.className = 'timezone-select'
    const option = document.createElement('option')
    option.value = 'UTC'
    select.append(option)
    container.append(select)

    const result = requireElement<HTMLSelectElement>(
      container,
      '.timezone-select',
      'timezone select'
    )

    expect(result.options.length).toBe(1)
    expect(result.options[0].value).toBe('UTC')
  })

  it('returns first matching element when multiple exist', () => {
    const button1 = document.createElement('button')
    const button2 = document.createElement('button')
    button1.className = 'btn'
    button2.className = 'btn'
    button1.textContent = 'First'
    button2.textContent = 'Second'
    container.append(button1, button2)

    const result = requireElement<HTMLButtonElement>(
      container,
      '.btn',
      'button'
    )

    expect(result).toBe(button1)
    expect(result.textContent).toBe('First')
  })
})
