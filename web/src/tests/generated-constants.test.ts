import { describe, it, expect } from 'vitest'
import * as generated from '../generated/constants'
import sharedConstants from '../../../shared/constants.json'

describe('generated constants', () => {
  it('matches shared constants soil values', () => {
    expect(generated.SOIL_STARTING_CAPACITY).toBe(sharedConstants.soil.startingCapacity)
    expect(generated.SOIL_MAX_CAPACITY).toBe(sharedConstants.soil.maxCapacity)
  })

  it('matches shared constants water values', () => {
    expect(generated.WATER_DAILY_CAPACITY).toBe(sharedConstants.water.dailyCapacity)
    expect(generated.WATER_RESET_HOUR).toBe(sharedConstants.water.resetHour)
  })

  it('matches shared constants sun values', () => {
    expect(generated.SUN_WEEKLY_CAPACITY).toBe(sharedConstants.sun.weeklyCapacity)
    expect(generated.SUN_RESET_HOUR).toBe(sharedConstants.sun.resetHour)
  })

  it('exports planting costs', () => {
    expect(generated.PLANTING_COSTS['2w'].fertile).toBe(2)
    expect(generated.PLANTING_COSTS['1y'].barren).toBe(24)
  })

  it('exports season data', () => {
    expect(generated.SEASONS['3m'].baseReward).toBe(1.95)
    expect(generated.SEASONS['1y'].label).toBe('1 year')
  })

  it('exports environment multipliers', () => {
    expect(generated.ENVIRONMENT_MULTIPLIERS.fertile).toBe(1.1)
    expect(generated.ENVIRONMENT_MULTIPLIERS.firm).toBe(1.75)
    expect(generated.ENVIRONMENT_MULTIPLIERS.barren).toBe(2.4)
  })

  it('exports result multipliers', () => {
    expect(generated.RESULT_MULTIPLIERS[1]).toBe(0.4)
    expect(generated.RESULT_MULTIPLIERS[5]).toBe(1.0)
  })

  it('exports recovery rates', () => {
    expect(generated.SOIL_WATER_RECOVERY).toBe(0.05)
    expect(generated.SOIL_SUN_RECOVERY).toBe(0.35)
  })

  it('exports environments data', () => {
    expect(generated.ENVIRONMENTS.fertile.label).toBe('Fertile')
    expect(generated.ENVIRONMENTS.barren.description).toBe('Very difficult')
  })

  it('exports results data', () => {
    expect(generated.RESULTS[1].label).toBe('Minimal')
    expect(generated.RESULTS[5].description).toBe('Fully achieved and then some')
  })

  it('exports tree structure', () => {
    expect(generated.BRANCH_COUNT).toBe(8)
    expect(generated.TWIG_COUNT).toBe(8)
    expect(generated.BRANCHES).toHaveLength(8)
    expect(generated.BRANCHES[0].name).toBe('CORE')
  })

  it('exports storage keys', () => {
    expect(generated.STORAGE_KEYS.nodeData).toBe('trunk-notes-v1')
    expect(generated.STORAGE_KEYS.events).toBe('trunk-events-v1')
  })

  it('exports export reminder days', () => {
    expect(generated.EXPORT_REMINDER_DAYS).toBe(7)
  })
})
