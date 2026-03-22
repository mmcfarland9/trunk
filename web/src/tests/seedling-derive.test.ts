import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { deriveState, generateSeedlingId, getSeedlingsForTwig } from '../events/derive'
import { appendEvent, clearEvents, getState, initEventStore } from '../events/store'
import type { TrunkEvent } from '../events/types'
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

describe('Seedling derivation', () => {
  const baseSeedlingCreated: TrunkEvent = {
    type: 'seedling_created',
    timestamp: '2026-03-22T10:00:00Z',
    seedlingId: 'seedling-1',
    twigId: 'branch-0-twig-branch-0-twig-0',
    title: 'Learn piano',
  }

  it('creates seedling from seedling_created event', () => {
    const state = deriveState([baseSeedlingCreated])
    expect(state.seedlings.size).toBe(1)
    const seedling = state.seedlings.get('seedling-1')
    expect(seedling).toBeDefined()
    expect(seedling!.title).toBe('Learn piano')
    expect(seedling!.twigId).toBe('branch-0-twig-branch-0-twig-0')
    expect(seedling!.notes).toBeUndefined()
  })

  it('creates seedling with notes', () => {
    const event: TrunkEvent = {
      ...baseSeedlingCreated,
      notes: 'Start with scales',
    }
    const state = deriveState([event])
    const seedling = state.seedlings.get('seedling-1')
    expect(seedling!.notes).toBe('Start with scales')
  })

  it('indexes seedlings by twig', () => {
    const state = deriveState([baseSeedlingCreated])
    const twigSeedlings = state.seedlingsByTwig.get('branch-0-twig-branch-0-twig-0')
    expect(twigSeedlings).toHaveLength(1)
    expect(twigSeedlings![0].id).toBe('seedling-1')
  })

  it('edits seedling title via seedling_edited', () => {
    const events: TrunkEvent[] = [
      baseSeedlingCreated,
      {
        type: 'seedling_edited',
        timestamp: '2026-03-22T11:00:00Z',
        seedlingId: 'seedling-1',
        title: 'Learn guitar',
      },
    ]
    const state = deriveState(events)
    expect(state.seedlings.get('seedling-1')!.title).toBe('Learn guitar')
  })

  it('edits seedling notes via seedling_edited (sparse merge)', () => {
    const events: TrunkEvent[] = [
      baseSeedlingCreated,
      {
        type: 'seedling_edited',
        timestamp: '2026-03-22T11:00:00Z',
        seedlingId: 'seedling-1',
        notes: 'Added notes',
      },
    ]
    const state = deriveState(events)
    expect(state.seedlings.get('seedling-1')!.title).toBe('Learn piano')
    expect(state.seedlings.get('seedling-1')!.notes).toBe('Added notes')
  })

  it('removes seedling via seedling_deleted', () => {
    const events: TrunkEvent[] = [
      baseSeedlingCreated,
      {
        type: 'seedling_deleted',
        timestamp: '2026-03-22T12:00:00Z',
        seedlingId: 'seedling-1',
      },
    ]
    const state = deriveState(events)
    expect(state.seedlings.size).toBe(0)
    expect(state.seedlingsByTwig.get('branch-0-twig-branch-0-twig-0')).toBeUndefined()
  })

  it('skips seedling_edited for nonexistent seedling', () => {
    const events: TrunkEvent[] = [
      {
        type: 'seedling_edited',
        timestamp: '2026-03-22T11:00:00Z',
        seedlingId: 'seedling-missing',
        title: 'Nope',
      },
    ]
    const state = deriveState(events)
    expect(state.seedlings.size).toBe(0)
  })

  it('skips seedling_deleted for nonexistent seedling', () => {
    const events: TrunkEvent[] = [
      {
        type: 'seedling_deleted',
        timestamp: '2026-03-22T12:00:00Z',
        seedlingId: 'seedling-missing',
      },
    ]
    const state = deriveState(events)
    expect(state.seedlings.size).toBe(0)
  })

  it('does not affect soil when creating seedlings', () => {
    const state = deriveState([baseSeedlingCreated])
    expect(state.soilAvailable).toBe(10)
    expect(state.soilCapacity).toBe(10)
  })

  it('getSeedlingsForTwig returns correct seedlings', () => {
    const events: TrunkEvent[] = [
      baseSeedlingCreated,
      {
        type: 'seedling_created',
        timestamp: '2026-03-22T10:01:00Z',
        seedlingId: 'seedling-2',
        twigId: 'branch-1-twig-branch-1-twig-0',
        title: 'Read more',
      },
    ]
    const state = deriveState(events)
    expect(getSeedlingsForTwig(state, 'branch-0-twig-branch-0-twig-0')).toHaveLength(1)
    expect(getSeedlingsForTwig(state, 'branch-1-twig-branch-1-twig-0')).toHaveLength(1)
    expect(getSeedlingsForTwig(state, 'branch-2-twig-branch-2-twig-0')).toHaveLength(0)
  })

  it('generateSeedlingId produces correct format', () => {
    const id = generateSeedlingId()
    expect(id).toMatch(/^seedling-[0-9a-f-]{36}$/)
  })
})

describe('Seedling store integration', () => {
  beforeEach(() => {
    clearEvents()
    initEventStore()
  })

  afterEach(() => {
    clearEvents()
  })

  it('round-trips seedling through store', () => {
    appendEvent({
      type: 'seedling_created',
      timestamp: new Date().toISOString(),
      seedlingId: 'seedling-store-1',
      twigId: 'branch-0-twig-branch-0-twig-0',
      title: 'Test idea',
    })

    const state = getState()
    expect(state.seedlings.size).toBe(1)
    expect(state.seedlings.get('seedling-store-1')!.title).toBe('Test idea')
  })

  it('seedling creation does not affect soil', () => {
    const beforeSoil = getState().soilAvailable

    appendEvent({
      type: 'seedling_created',
      timestamp: new Date().toISOString(),
      seedlingId: 'seedling-store-2',
      twigId: 'branch-0-twig-branch-0-twig-0',
      title: 'Free idea',
    })

    expect(getState().soilAvailable).toBe(beforeSoil)
  })

  it('seedling lifecycle: create → edit → delete', () => {
    appendEvent({
      type: 'seedling_created',
      timestamp: '2026-03-22T10:00:00Z',
      seedlingId: 'seedling-lifecycle',
      twigId: 'branch-0-twig-branch-0-twig-0',
      title: 'Original',
    })
    expect(getState().seedlings.get('seedling-lifecycle')!.title).toBe('Original')

    appendEvent({
      type: 'seedling_edited',
      timestamp: '2026-03-22T11:00:00Z',
      seedlingId: 'seedling-lifecycle',
      title: 'Edited',
    })
    expect(getState().seedlings.get('seedling-lifecycle')!.title).toBe('Edited')

    appendEvent({
      type: 'seedling_deleted',
      timestamp: '2026-03-22T12:00:00Z',
      seedlingId: 'seedling-lifecycle',
    })
    expect(getState().seedlings.size).toBe(0)
  })

  it('coexists with sprouts without interference', () => {
    appendEvent({
      type: 'seedling_created',
      timestamp: '2026-03-22T10:00:00Z',
      seedlingId: 'seedling-coexist',
      twigId: 'branch-0-twig-branch-0-twig-0',
      title: 'Idea',
    })
    appendEvent({
      type: 'sprout_planted',
      timestamp: '2026-03-22T10:01:00Z',
      sproutId: 'sprout-coexist',
      twigId: 'branch-0-twig-branch-0-twig-0',
      title: 'Real sprout',
      season: '2w',
      environment: 'fertile',
      soilCost: 2,
      leafId: 'leaf-1',
    })

    const state = getState()
    expect(state.seedlings.size).toBe(1)
    expect(state.sprouts.size).toBe(1)
    expect(state.soilAvailable).toBe(8) // Only sprout costs soil
  })
})
