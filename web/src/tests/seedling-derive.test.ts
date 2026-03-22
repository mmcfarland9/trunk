import { describe, expect, it } from 'vitest'
import { validateEvent } from '../events/types'

describe('Seedling event validation', () => {
  it('validates seedling_created with required fields', () => {
    expect(
      validateEvent({
        type: 'seedling_created',
        timestamp: '2026-03-22T10:00:00Z',
        seedlingId: 'seedling-abc',
        twigId: 'branch-0-twig-branch-0-twig-0',
        title: 'Learn piano',
      }),
    ).toBe(true)
  })

  it('validates seedling_created with optional notes', () => {
    expect(
      validateEvent({
        type: 'seedling_created',
        timestamp: '2026-03-22T10:00:00Z',
        seedlingId: 'seedling-abc',
        twigId: 'branch-0-twig-branch-0-twig-0',
        title: 'Learn piano',
        notes: 'Start with scales',
      }),
    ).toBe(true)
  })

  it('rejects seedling_created without title', () => {
    expect(
      validateEvent({
        type: 'seedling_created',
        timestamp: '2026-03-22T10:00:00Z',
        seedlingId: 'seedling-abc',
        twigId: 'branch-0-twig-branch-0-twig-0',
      }),
    ).toBe(false)
  })

  it('validates seedling_edited with seedlingId only', () => {
    expect(
      validateEvent({
        type: 'seedling_edited',
        timestamp: '2026-03-22T10:00:00Z',
        seedlingId: 'seedling-abc',
      }),
    ).toBe(true)
  })

  it('validates seedling_deleted with seedlingId', () => {
    expect(
      validateEvent({
        type: 'seedling_deleted',
        timestamp: '2026-03-22T10:00:00Z',
        seedlingId: 'seedling-abc',
      }),
    ).toBe(true)
  })

  it('rejects seedling_deleted without seedlingId', () => {
    expect(
      validateEvent({
        type: 'seedling_deleted',
        timestamp: '2026-03-22T10:00:00Z',
      }),
    ).toBe(false)
  })
})
