/**
 * Tests for sprout label and emoji utilities
 */

import { describe, expect, it } from 'vitest'
import {
  getEnvironmentFormHint,
  getEnvironmentLabel,
  getResultEmoji,
  getSeasonLabel,
} from '../utils/sprout-labels'

describe('getSeasonLabel', () => {
  it('returns "2 weeks" for 2w', () => {
    expect(getSeasonLabel('2w')).toBe('2 weeks')
  })

  it('returns "1 month" for 1m', () => {
    expect(getSeasonLabel('1m')).toBe('1 month')
  })

  it('returns "3 months" for 3m', () => {
    expect(getSeasonLabel('3m')).toBe('3 months')
  })

  it('returns "6 months" for 6m', () => {
    expect(getSeasonLabel('6m')).toBe('6 months')
  })

  it('returns "1 year" for 1y', () => {
    expect(getSeasonLabel('1y')).toBe('1 year')
  })
})

describe('getEnvironmentLabel', () => {
  it('returns "Fertile" for fertile', () => {
    expect(getEnvironmentLabel('fertile')).toBe('Fertile')
  })

  it('returns "Firm" for firm', () => {
    expect(getEnvironmentLabel('firm')).toBe('Firm')
  })

  it('returns "Barren" for barren', () => {
    expect(getEnvironmentLabel('barren')).toBe('Barren')
  })
})

describe('getEnvironmentFormHint', () => {
  it('returns comfort hint for fertile', () => {
    expect(getEnvironmentFormHint('fertile')).toBe('[Comfortable terrain · no soil bonus]')
  })

  it('returns obstacle hint for firm', () => {
    expect(getEnvironmentFormHint('firm')).toBe('[New obstacles · +1 soil capacity]')
  })

  it('returns hostile hint for barren', () => {
    expect(getEnvironmentFormHint('barren')).toBe('[Hostile conditions · +2 soil capacity]')
  })
})

describe('getResultEmoji', () => {
  it('returns 🥀 for result 1', () => {
    expect(getResultEmoji(1)).toBe('🥀')
  })

  it('returns 🌱 for result 2', () => {
    expect(getResultEmoji(2)).toBe('🌱')
  })

  it('returns 🌿 for result 3', () => {
    expect(getResultEmoji(3)).toBe('🌿')
  })

  it('returns 🌳 for result 4', () => {
    expect(getResultEmoji(4)).toBe('🌳')
  })

  it('returns 🌲 for result 5', () => {
    expect(getResultEmoji(5)).toBe('🌲')
  })

  it('returns fallback 🌱 for 0', () => {
    expect(getResultEmoji(0)).toBe('🌱')
  })

  it('returns fallback 🌱 for 6', () => {
    expect(getResultEmoji(6)).toBe('🌱')
  })

  it('returns fallback 🌱 for -1', () => {
    expect(getResultEmoji(-1)).toBe('🌱')
  })
})
