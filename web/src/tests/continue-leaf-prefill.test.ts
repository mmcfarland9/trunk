/**
 * Tests for "continue a leaf" prefill — ui/twig-view/index.ts prefillPlantFromLeaf().
 *
 * Continuing a leaf plants a NEW sprout into an EXISTING leaf, with the draft
 * form seeded from that leaf's most recent sprout. Everything stays editable.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Fixtures shared with the mocks (declared before vi.mock hoisting runs)
// ---------------------------------------------------------------------------

type FakeSprout = {
  id: string
  twigId: string
  title: string
  season: string
  environment: string
  soilCost: number
  leafId: string
  plantedAt: string
  state: string
  bloomWither?: string
  bloomBudding?: string
  bloomFlourish?: string
  waterEntries: unknown[]
}

type FakeLeaf = { id: string; twigId: string; name: string; createdAt: string }

const fixtures = vi.hoisted(() => ({
  leaves: [] as { id: string; twigId: string; name: string; createdAt: string }[],
  sproutsByLeaf: new Map<string, unknown[]>(),
}))

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../events', () => ({
  getState: vi.fn(() => ({})),
  getSproutsForTwig: vi.fn(() => []),
  getSeedlingsForTwig: vi.fn(() => []),
  getLeavesForTwig: vi.fn((_state: unknown, twigId: string) =>
    fixtures.leaves.filter((l) => l.twigId === twigId),
  ),
  getLeafById: vi.fn((_state: unknown, leafId: string) =>
    fixtures.leaves.find((l) => l.id === leafId),
  ),
  getSproutsByLeaf: vi.fn(
    (_state: unknown, leafId: string) => fixtures.sproutsByLeaf.get(leafId) ?? [],
  ),
  checkSproutWateredToday: vi.fn(() => false),
  toSprout: vi.fn((s: unknown) => s),
  appendEvent: vi.fn(),
  generateLeafId: vi.fn(() => 'leaf-generated'),
  generateSproutId: vi.fn(() => 'sprout-generated'),
  generateSeedlingId: vi.fn(() => 'seedling-generated'),
}))

vi.mock('../state', () => ({
  calculateSoilCost: vi.fn(() => 2),
  canAffordSoil: vi.fn(() => true),
  getSoilAvailable: vi.fn(() => 10),
  getPresetLabel: vi.fn(() => 'Craft'),
  getPresetNote: vi.fn(() => ''),
}))

vi.mock('../ui/dom-builder/build-dialogs', () => ({
  trapFocus: vi.fn(() => vi.fn()),
}))

vi.mock('../utils/debounce', () => ({
  preventDoubleClick: (fn: (...args: unknown[]) => unknown) => fn,
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { getLeavesForTwig } from '../events'
import { buildLeafView } from '../ui/leaf-view'
import { buildTwigView } from '../ui/twig-view'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TWIG_ID = 'branch-2-twig-branch-2-twig-4'
const LEAF_ID = 'leaf-running'

function makeSprout(overrides: Partial<FakeSprout> = {}): FakeSprout {
  return {
    id: 'sprout-1',
    twigId: TWIG_ID,
    title: 'Run a 5k',
    season: '3m',
    environment: 'firm',
    soilCost: 2,
    leafId: LEAF_ID,
    plantedAt: '2026-01-01T09:00:00.000Z',
    state: 'completed',
    waterEntries: [],
    ...overrides,
  }
}

function makeLeaf(overrides: Partial<FakeLeaf> = {}): FakeLeaf {
  return {
    id: LEAF_ID,
    twigId: TWIG_ID,
    name: 'Running',
    createdAt: '2026-01-01T09:00:00.000Z',
    ...overrides,
  }
}

function makeTwigNode(): HTMLButtonElement {
  const node = document.createElement('button')
  node.dataset.nodeId = TWIG_ID
  node.dataset.branchIndex = '2'
  node.dataset.defaultLabel = 'Craft'
  return node
}

function setup() {
  const mapPanel = document.createElement('div')
  document.body.append(mapPanel)
  const api = buildTwigView(mapPanel, { onClose: vi.fn(), onSave: vi.fn() })
  const container = api.container

  return {
    api,
    container,
    open: () => api.open(makeTwigNode()),
    els: {
      draftForm: container.querySelector<HTMLDivElement>('.sprout-draft-form')!,
      title: container.querySelector<HTMLInputElement>('.sprout-title-input')!,
      leafSelect: container.querySelector<HTMLSelectElement>('.sprout-leaf-select')!,
      newLeafName: container.querySelector<HTMLInputElement>('.sprout-new-leaf-name')!,
      wither: container.querySelector<HTMLInputElement>('.sprout-wither-input')!,
      budding: container.querySelector<HTMLInputElement>('.sprout-budding-input')!,
      flourish: container.querySelector<HTMLInputElement>('.sprout-flourish-input')!,
      seasonBtns: container.querySelectorAll<HTMLButtonElement>('.sprout-season-btn'),
      envBtns: container.querySelectorAll<HTMLButtonElement>('.sprout-env-btn'),
      setBtn: container.querySelector<HTMLButtonElement>('.sprout-set-btn')!,
    },
  }
}

function activeSeason(els: ReturnType<typeof setup>['els']): string | undefined {
  return Array.from(els.seasonBtns).find((b) => b.classList.contains('is-active'))?.dataset.season
}

function activeEnv(els: ReturnType<typeof setup>['els']): string | undefined {
  return Array.from(els.envBtns).find((b) => b.classList.contains('is-active'))?.dataset.env
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('prefillPlantFromLeaf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    fixtures.leaves = [makeLeaf()]
    fixtures.sproutsByLeaf = new Map()
  })

  it('preselects the leaf in the leaf select', () => {
    fixtures.sproutsByLeaf.set(LEAF_ID, [makeSprout()])
    const { api, els, open } = setup()
    open()

    api.prefillPlantFromLeaf(LEAF_ID)

    expect(els.leafSelect.value).toBe(LEAF_ID)
  })

  it('expands the collapsed draft form', () => {
    fixtures.sproutsByLeaf.set(LEAF_ID, [makeSprout()])
    const { api, els, open } = setup()
    open()

    expect(els.draftForm.classList.contains('is-collapsed')).toBe(true)

    api.prefillPlantFromLeaf(LEAF_ID)

    expect(els.draftForm.classList.contains('is-collapsed')).toBe(false)
  })

  it('copies title, season, environment and bloom from the source sprout', () => {
    fixtures.sproutsByLeaf.set(LEAF_ID, [
      makeSprout({
        title: 'Run a 10k',
        season: '6m',
        environment: 'barren',
        bloomWither: 'stopped running',
        bloomBudding: 'ran twice a week',
        bloomFlourish: 'finished the race',
      }),
    ])
    const { api, els, open } = setup()
    open()

    api.prefillPlantFromLeaf(LEAF_ID)

    expect(els.title.value).toBe('Run a 10k')
    expect(els.wither.value).toBe('stopped running')
    expect(els.budding.value).toBe('ran twice a week')
    expect(els.flourish.value).toBe('finished the race')
    expect(activeSeason(els)).toBe('6m')
    expect(activeEnv(els)).toBe('barren')
  })

  it('marks the copied season/environment buttons as pressed for a11y', () => {
    fixtures.sproutsByLeaf.set(LEAF_ID, [makeSprout({ season: '2w', environment: 'fertile' })])
    const { api, els, open } = setup()
    open()

    api.prefillPlantFromLeaf(LEAF_ID)

    const season = Array.from(els.seasonBtns).find((b) => b.dataset.season === '2w')!
    const env = Array.from(els.envBtns).find((b) => b.dataset.env === 'fertile')!
    expect(season.getAttribute('aria-pressed')).toBe('true')
    expect(env.getAttribute('aria-pressed')).toBe('true')
  })

  it('uses the most recently planted sprout regardless of array order', () => {
    fixtures.sproutsByLeaf.set(LEAF_ID, [
      makeSprout({ id: 's-old', title: 'Oldest', plantedAt: '2026-01-01T09:00:00.000Z' }),
      makeSprout({ id: 's-new', title: 'Newest', plantedAt: '2026-05-01T09:00:00.000Z' }),
      makeSprout({ id: 's-mid', title: 'Middle', plantedAt: '2026-03-01T09:00:00.000Z' }),
    ])
    const { api, els, open } = setup()
    open()

    api.prefillPlantFromLeaf(LEAF_ID)

    expect(els.title.value).toBe('Newest')
  })

  it('uses the most recent sprout even when it was uprooted or is still active', () => {
    fixtures.sproutsByLeaf.set(LEAF_ID, [
      makeSprout({
        id: 's-done',
        title: 'Completed one',
        state: 'completed',
        plantedAt: '2026-01-01T09:00:00.000Z',
      }),
      makeSprout({
        id: 's-uprooted',
        title: 'Uprooted one',
        state: 'uprooted',
        plantedAt: '2026-04-01T09:00:00.000Z',
      }),
    ])
    const { api, els, open } = setup()
    open()

    api.prefillPlantFromLeaf(LEAF_ID)

    expect(els.title.value).toBe('Uprooted one')
  })

  it('clears bloom fields the source sprout did not define', () => {
    fixtures.sproutsByLeaf.set(LEAF_ID, [makeSprout({ bloomBudding: 'kept going' })])
    const { api, els, open } = setup()
    open()

    els.wither.value = 'stale text'
    els.flourish.value = 'stale text'

    api.prefillPlantFromLeaf(LEAF_ID)

    expect(els.wither.value).toBe('')
    expect(els.budding.value).toBe('kept going')
    expect(els.flourish.value).toBe('')
  })

  it('still preselects the leaf when it has no sprouts yet', () => {
    fixtures.sproutsByLeaf.set(LEAF_ID, [])
    const { api, els, open } = setup()
    open()

    api.prefillPlantFromLeaf(LEAF_ID)

    expect(els.leafSelect.value).toBe(LEAF_ID)
    expect(els.draftForm.classList.contains('is-collapsed')).toBe(false)
    expect(els.title.value).toBe('')
    expect(activeSeason(els)).toBeUndefined()
    expect(activeEnv(els)).toBeUndefined()
  })

  it('does nothing when the leaf does not exist', () => {
    const { api, els, open } = setup()
    open()

    api.prefillPlantFromLeaf('leaf-missing')

    expect(els.leafSelect.value).toBe('')
    expect(els.draftForm.classList.contains('is-collapsed')).toBe(true)
  })

  it('hides and clears the "new leaf name" input', () => {
    fixtures.sproutsByLeaf.set(LEAF_ID, [makeSprout()])
    const { api, els, open } = setup()
    open()

    // Simulate the user having started to create a new leaf
    els.leafSelect.value = '__new__'
    els.leafSelect.dispatchEvent(new Event('change'))
    els.newLeafName.value = 'Half-typed name'
    expect(els.newLeafName.classList.contains('hidden')).toBe(false)

    api.prefillPlantFromLeaf(LEAF_ID)

    expect(els.newLeafName.value).toBe('')
    expect(els.newLeafName.classList.contains('hidden')).toBe(true)
  })

  it('repopulates the leaf select when the option is missing', () => {
    fixtures.sproutsByLeaf.set(LEAF_ID, [makeSprout()])
    const { api, els, open } = setup()
    open()

    // A leaf created after open() — its <option> does not exist yet.
    fixtures.leaves = [...fixtures.leaves, makeLeaf({ id: 'leaf-late', name: 'Late leaf' })]
    fixtures.sproutsByLeaf.set('leaf-late', [
      makeSprout({ id: 's-late', title: 'Late sprout', leafId: 'leaf-late' }),
    ])
    vi.mocked(getLeavesForTwig).mockClear()

    api.prefillPlantFromLeaf('leaf-late')

    expect(getLeavesForTwig).toHaveBeenCalled()
    expect(els.leafSelect.value).toBe('leaf-late')
    expect(els.title.value).toBe('Late sprout')
  })

  it('enables the plant button once the form is fully prefilled', () => {
    fixtures.sproutsByLeaf.set(LEAF_ID, [makeSprout()])
    const { api, els, open } = setup()
    open()

    expect(els.setBtn.disabled).toBe(true)

    api.prefillPlantFromLeaf(LEAF_ID)

    expect(els.setBtn.disabled).toBe(false)
  })
})

describe('leaf view continue button', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    fixtures.leaves = [makeLeaf()]
    fixtures.sproutsByLeaf = new Map([[LEAF_ID, [makeSprout()]]])
  })

  function setupLeafView(onContinueLeaf = vi.fn()) {
    const mapPanel = document.createElement('div')
    document.body.append(mapPanel)
    const api = buildLeafView(mapPanel, {
      onClose: vi.fn(),
      onSave: vi.fn(),
      onContinueLeaf,
    })
    const continueBtn = api.container.querySelector<HTMLButtonElement>('.leaf-continue-btn')!
    return { api, continueBtn, onContinueLeaf }
  }

  it('renders a "+ continue leaf" button next to close', () => {
    const { api, continueBtn } = setupLeafView()

    expect(continueBtn.textContent).toBe('+ continue leaf')
    expect(api.container.querySelector('.leaf-close-btn')).not.toBeNull()
  })

  it('invokes onContinueLeaf with the open leaf and its twig', () => {
    const { api, continueBtn, onContinueLeaf } = setupLeafView()
    api.open(LEAF_ID, TWIG_ID, 2)

    continueBtn.click()

    expect(onContinueLeaf).toHaveBeenCalledWith(LEAF_ID, TWIG_ID)
  })

  it('does nothing when no leaf is open', () => {
    const { continueBtn, onContinueLeaf } = setupLeafView()

    continueBtn.click()

    expect(onContinueLeaf).not.toHaveBeenCalled()
  })

  it('stops invoking after the leaf view is closed', () => {
    const { api, continueBtn, onContinueLeaf } = setupLeafView()
    api.open(LEAF_ID, TWIG_ID, 2)
    api.close()

    continueBtn.click()

    expect(onContinueLeaf).not.toHaveBeenCalled()
  })
})
