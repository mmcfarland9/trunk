/**
 * Tests for features/progress.ts
 * Tests sidebar sprout grouping, progress display, and pure logic functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DerivedState, DerivedSprout } from '../events/derive'
import type { AppContext, BranchGroup } from '../types'

// Mock events module
vi.mock('../events', () => ({
  getState: vi.fn(),
  toSprout: vi.fn(),
  getActiveSprouts: vi.fn(() => []),
  getCompletedSprouts: vi.fn(() => []),
  getLeafById: vi.fn(() => null),
  checkSproutWateredToday: vi.fn(() => false),
}))

// Mock state module
vi.mock('../state', () => ({
  getHoveredBranchIndex: vi.fn(() => null),
  getHoveredTwigId: vi.fn(() => null),
  getActiveBranchIndex: vi.fn(() => null),
  getActiveTwigId: vi.fn(() => null),
  getViewMode: vi.fn(() => 'overview'),
  getPresetLabel: vi.fn((id: string) => {
    // Return twig labels based on ID
    const labels: Record<string, string> = {
      'branch-0-twig-0': 'movement',
      'branch-0-twig-1': 'strength',
      'branch-1-twig-0': 'reading',
    }
    return labels[id] ?? null
  }),
}))

// Mock constants
vi.mock('../constants', () => ({
  TWIG_COUNT: 8,
}))

import {
  updateStats,
  updateScopedProgress,
  initSidebarSprouts,
  updateSidebarSprouts,
} from '../features/progress'

import {
  getState,
  toSprout,
  getActiveSprouts,
  getCompletedSprouts,
  getLeafById,
  checkSproutWateredToday,
} from '../events'
import {
  getViewMode,
  getActiveBranchIndex,
  getHoveredBranchIndex,
  getHoveredTwigId,
  getActiveTwigId,
} from '../state'

// Helper to create a DerivedSprout
function makeDerivedSprout(overrides?: Partial<DerivedSprout>): DerivedSprout {
  return {
    id: 'sprout-1',
    twigId: 'branch-0-twig-0',
    title: 'Test Sprout',
    season: '1m',
    environment: 'fertile',
    soilCost: 3,
    leafId: 'leaf-default',
    state: 'active',
    plantedAt: '2026-02-01T10:00:00Z',
    waterEntries: [],
    ...overrides,
  }
}

// Helper to create a mock Sprout (output of toSprout)
function makeSprout(_twigId: string, overrides?: Record<string, unknown>) {
  return {
    id: overrides?.id ?? 'sprout-1',
    title: overrides?.title ?? 'Test Sprout',
    season: '1m',
    environment: 'fertile',
    state: 'active',
    soilCost: 3,
    createdAt: '2026-02-01T10:00:00Z',
    endDate: overrides?.endDate ?? '2026-03-01T15:00:00Z',
    leafId: overrides?.leafId ?? 'leaf-default',
    ...overrides,
  }
}

function makeDerivedState(overrides?: Partial<DerivedState>): DerivedState {
  return {
    soilCapacity: 10,
    soilAvailable: 10,
    sprouts: new Map(),
    leaves: new Map(),
    sunEntries: [],
    activeSproutsByTwig: new Map(),
    sproutsByTwig: new Map(),
    sproutsByLeaf: new Map(),
    leavesByTwig: new Map(),
    ...overrides,
  }
}

// Create a mock AppContext with real DOM elements
function createMockAppContext(): AppContext {
  const branchGroups: BranchGroup[] = Array.from({ length: 8 }, (_, i) => {
    const group = document.createElement('div')
    const branch = document.createElement('button')
    branch.dataset.nodeId = `branch-${i}`
    branch.dataset.filled = i < 3 ? 'true' : 'false'

    const twigs = Array.from({ length: 8 }, (_, j) => {
      const twig = document.createElement('button')
      twig.dataset.nodeId = `branch-${i}-twig-${j}`
      twig.dataset.filled = j < 4 ? 'true' : 'false'
      return twig
    })

    return { group, branch, twigs }
  })

  const elements = {
    progressCount: document.createElement('p'),
    progressFill: document.createElement('span'),
    backToTrunkButton: document.createElement('button'),
    backToBranchButton: document.createElement('button'),
    activeSproutsToggle: document.createElement('button'),
    activeSproutsList: document.createElement('div'),
    cultivatedSproutsToggle: document.createElement('button'),
    cultivatedSproutsList: document.createElement('div'),
    // Minimal mock of other elements (not used by progress.ts)
    shell: document.createElement('div'),
    header: document.createElement('header'),
    canvas: document.createElement('div'),
    trunk: document.createElement('button'),
    guideLayer: document.createElement('canvas'),
    sidePanel: document.createElement('aside'),
    focusMeta: document.createElement('p'),
    focusTitle: document.createElement('p'),
    focusNote: document.createElement('p'),
    focusGoal: document.createElement('p'),
    profileBadge: document.createElement('div'),
    profileEmail: document.createElement('span'),
    syncButton: document.createElement('button'),
    syncTimestamp: document.createElement('span'),
    syncState: document.createElement('span'),
    sproutsDialog: document.createElement('div'),
    sproutsDialogContent: document.createElement('div'),
    sproutsDialogClose: document.createElement('button'),
    waterDialog: document.createElement('div'),
    waterDialogClose: document.createElement('button'),
    waterDialogBody: document.createElement('div'),
    harvestDialog: document.createElement('div'),
    harvestDialogTitle: document.createElement('p'),
    harvestDialogMeta: document.createElement('p'),
    harvestDialogSlider: document.createElement('input'),
    harvestDialogResultEmoji: document.createElement('span'),
    harvestDialogBloomHints: document.querySelectorAll('.bloom-hint'),
    harvestDialogReflection: document.createElement('textarea'),
    harvestDialogClose: document.createElement('button'),
    harvestDialogCancel: document.createElement('button'),
    harvestDialogSave: document.createElement('button'),
    soilMeterFill: document.createElement('div'),
    soilMeterValue: document.createElement('span'),
    waterCircles: [] as HTMLSpanElement[],
    sunCircle: document.createElement('span'),
    waterCanDialog: document.createElement('div'),
    waterCanDialogClose: document.createElement('button'),
    waterCanStatusText: document.createElement('p'),
    waterCanStatusReset: document.createElement('p'),
    waterCanEmptyLog: document.createElement('p'),
    waterCanLogEntries: document.createElement('div'),
    waterMeter: document.createElement('div'),
    sunLogDialog: document.createElement('div'),
    sunLogDialogClose: document.createElement('button'),
    sunLogShineSection: document.createElement('div'),
    sunLogShineTitle: document.createElement('p'),
    sunLogShineMeta: document.createElement('p'),
    sunLogShineJournal: document.createElement('textarea'),
    sunLogShineBtn: document.createElement('button'),
    sunLogShineShone: document.createElement('div'),
    sunLogShineShoneReset: document.createElement('p'),
    sunLogDialogEmpty: document.createElement('p'),
    sunLogDialogEntries: document.createElement('div'),
    sunMeter: document.createElement('div'),
    soilBagDialog: document.createElement('div'),
    soilBagDialogClose: document.createElement('button'),
    soilBagDialogEmpty: document.createElement('p'),
    soilBagDialogEntries: document.createElement('div'),
    soilMeter: document.createElement('div'),
    accountDialog: document.createElement('div'),
    accountDialogClose: document.createElement('button'),
    accountDialogEmail: document.createElement('p'),
    accountDialogNameInput: document.createElement('input'),
    accountDialogPhoneInput: document.createElement('input'),
    accountDialogTimezoneSelect: document.createElement('select'),
    accountDialogChannelInputs: document.querySelectorAll('.channel-input'),
    accountDialogFrequencyInputs: document.querySelectorAll('.frequency-input'),
    accountDialogTimeInputs: document.querySelectorAll('.time-input'),
    accountDialogHarvestCheckbox: document.createElement('input'),
    accountDialogShineCheckbox: document.createElement('input'),
    accountDialogSignOut: document.createElement('button'),
    accountDialogSave: document.createElement('button'),
    accountDialogResetData: document.createElement('button'),
  }

  // Add count span to toggles
  const activeCount = document.createElement('span')
  activeCount.className = 'sprouts-toggle-count'
  elements.activeSproutsToggle.append(activeCount)

  const cultivatedCount = document.createElement('span')
  cultivatedCount.className = 'sprouts-toggle-count'
  elements.cultivatedSproutsToggle.append(cultivatedCount)

  return {
    elements: elements as any,
    branchGroups,
    allNodes: [],
    nodeLookup: new Map(),
  }
}

describe('updateScopedProgress', () => {
  beforeEach(() => {
    vi.mocked(getViewMode).mockReturnValue('overview')
    vi.mocked(getActiveBranchIndex).mockReturnValue(null)
    vi.mocked(getHoveredBranchIndex).mockReturnValue(null)
    vi.mocked(getState).mockReturnValue(makeDerivedState())
  })

  it('shows overview stats when in overview mode', () => {
    const ctx = createMockAppContext()

    updateScopedProgress(ctx)

    expect(ctx.elements.progressCount.innerHTML).toContain('branches filled')
    expect(ctx.elements.progressCount.innerHTML).toContain('twigs filled')
    expect(ctx.elements.progressCount.innerHTML).toContain('growing sprouts')
    expect(ctx.elements.backToTrunkButton.style.display).toBe('none')
    expect(ctx.elements.backToBranchButton.style.display).toBe('none')
  })

  it('shows branch stats when in branch view', () => {
    vi.mocked(getViewMode).mockReturnValue('branch')
    vi.mocked(getActiveBranchIndex).mockReturnValue(0)

    const ctx = createMockAppContext()

    updateScopedProgress(ctx)

    expect(ctx.elements.progressCount.innerHTML).toContain('of 8 twigs filled')
    expect(ctx.elements.backToTrunkButton.style.display).toBe('')
    expect(ctx.elements.backToBranchButton.style.display).toBe('none')
  })

  it('shows branch stats when hovering a branch in overview', () => {
    vi.mocked(getViewMode).mockReturnValue('overview')
    vi.mocked(getHoveredBranchIndex).mockReturnValue(1)

    const ctx = createMockAppContext()

    updateScopedProgress(ctx)

    expect(ctx.elements.progressCount.innerHTML).toContain('of 8 twigs filled')
  })

  it('shows back to branch button in twig view', () => {
    vi.mocked(getViewMode).mockReturnValue('twig')

    const ctx = createMockAppContext()

    updateScopedProgress(ctx)

    expect(ctx.elements.backToBranchButton.style.display).toBe('')
    expect(ctx.elements.backToTrunkButton.style.display).toBe('none')
  })

  it('counts active sprouts for branch', () => {
    vi.mocked(getViewMode).mockReturnValue('branch')
    vi.mocked(getActiveBranchIndex).mockReturnValue(0)

    const activeSprouts = [makeDerivedSprout()]
    const state = makeDerivedState({
      activeSproutsByTwig: new Map([['branch-0-twig-0', activeSprouts]]),
    })
    vi.mocked(getState).mockReturnValue(state)

    const ctx = createMockAppContext()

    updateScopedProgress(ctx)

    expect(ctx.elements.progressCount.innerHTML).toContain('1 growing sprouts')
  })

  it('calculates correct progress percentage', () => {
    const ctx = createMockAppContext()

    updateScopedProgress(ctx)

    // 32 filled twigs out of 64 = 50%
    expect(ctx.elements.progressFill.style.width).toBe('50%')
  })

  it('handles zero total twigs gracefully', () => {
    const ctx = createMockAppContext()
    ctx.branchGroups = [] // No branches = no twigs

    updateScopedProgress(ctx)

    expect(ctx.elements.progressFill.style.width).toBe('0%')
  })
})

describe('updateSidebarSprouts', () => {
  beforeEach(() => {
    vi.mocked(getViewMode).mockReturnValue('overview')
    vi.mocked(getActiveBranchIndex).mockReturnValue(null)
    vi.mocked(getHoveredBranchIndex).mockReturnValue(null)
    vi.mocked(getHoveredTwigId).mockReturnValue(null)
    vi.mocked(getActiveTwigId).mockReturnValue(null)

    vi.mocked(getActiveSprouts).mockReturnValue([])
    vi.mocked(getCompletedSprouts).mockReturnValue([])
    vi.mocked(getState).mockReturnValue(makeDerivedState())

    vi.mocked(toSprout).mockImplementation((derived) =>
      makeSprout(derived.twigId, {
        id: derived.id,
        title: derived.title,
        leafId: derived.leafId,
      }),
    )
  })

  it('shows empty sidebar when no sprouts exist', () => {
    const ctx = createMockAppContext()
    initSidebarSprouts(ctx)

    expect(ctx.elements.activeSproutsList.children.length).toBe(0)
    expect(ctx.elements.cultivatedSproutsList.children.length).toBe(0)
  })

  it('shows active sprouts grouped by branch in overview', () => {
    const sprout1 = makeDerivedSprout({ id: 's1', twigId: 'branch-0-twig-0' })
    const sprout2 = makeDerivedSprout({ id: 's2', twigId: 'branch-1-twig-0' })

    vi.mocked(getActiveSprouts).mockReturnValue([sprout1, sprout2])

    const ctx = createMockAppContext()
    initSidebarSprouts(ctx)

    // Should have branch folders
    const branchFolders = ctx.elements.activeSproutsList.querySelectorAll('.branch-folder')
    expect(branchFolders.length).toBe(2)
  })

  it('shows sprouts grouped by twig in branch view', () => {
    vi.mocked(getViewMode).mockReturnValue('branch')
    vi.mocked(getActiveBranchIndex).mockReturnValue(0)

    const sprout1 = makeDerivedSprout({ id: 's1', twigId: 'branch-0-twig-0' })
    const sprout2 = makeDerivedSprout({ id: 's2', twigId: 'branch-0-twig-1' })

    vi.mocked(getActiveSprouts).mockReturnValue([sprout1, sprout2])

    const ctx = createMockAppContext()
    initSidebarSprouts(ctx)

    const twigFolders = ctx.elements.activeSproutsList.querySelectorAll('.twig-folder')
    expect(twigFolders.length).toBe(2)
  })

  it('shows flat sprout list in twig view', () => {
    vi.mocked(getViewMode).mockReturnValue('twig')
    vi.mocked(getActiveTwigId).mockReturnValue('branch-0-twig-0')

    const sprout = makeDerivedSprout({ id: 's1', twigId: 'branch-0-twig-0' })

    vi.mocked(getActiveSprouts).mockReturnValue([sprout])

    const ctx = createMockAppContext()
    initSidebarSprouts(ctx)

    const stackedCards = ctx.elements.activeSproutsList.querySelectorAll('.sidebar-stacked-card')
    expect(stackedCards.length).toBe(1)
  })

  it('groups sprouts by leaf within twig view', () => {
    vi.mocked(getViewMode).mockReturnValue('twig')
    vi.mocked(getActiveTwigId).mockReturnValue('branch-0-twig-0')

    const sprout1 = makeDerivedSprout({ id: 's1', twigId: 'branch-0-twig-0', leafId: 'leaf-1' })
    const sprout2 = makeDerivedSprout({ id: 's2', twigId: 'branch-0-twig-0', leafId: 'leaf-1' })

    vi.mocked(getActiveSprouts).mockReturnValue([sprout1, sprout2])
    vi.mocked(getLeafById).mockReturnValue({
      id: 'leaf-1',
      twigId: 'branch-0-twig-0',
      name: 'Piano Journey',
      createdAt: '2026-01-01T00:00:00Z',
    })

    const ctx = createMockAppContext()
    initSidebarSprouts(ctx)

    // Both sprouts should be in one leaf card
    const cards = ctx.elements.activeSproutsList.querySelectorAll('.sidebar-stacked-card')
    expect(cards.length).toBe(1)

    const header = cards[0].querySelector('.sidebar-stacked-header')
    expect(header?.textContent).toBe('Piano Journey')
  })

  it('updates count badges', () => {
    const sprout = makeDerivedSprout()
    vi.mocked(getActiveSprouts).mockReturnValue([sprout])

    const ctx = createMockAppContext()
    initSidebarSprouts(ctx)

    const activeCount = ctx.elements.activeSproutsToggle.querySelector('.sprouts-toggle-count')
    expect(activeCount?.textContent).toBe('(1)')
  })

  it('filters sprouts when hovering a branch in overview', () => {
    vi.mocked(getViewMode).mockReturnValue('overview')
    vi.mocked(getHoveredBranchIndex).mockReturnValue(0)

    const sprout0 = makeDerivedSprout({ id: 's1', twigId: 'branch-0-twig-0' })
    const sprout1 = makeDerivedSprout({ id: 's2', twigId: 'branch-1-twig-0' })

    vi.mocked(getActiveSprouts).mockReturnValue([sprout0, sprout1])

    const ctx = createMockAppContext()
    initSidebarSprouts(ctx)

    // Only branch-0 sprouts should show (twig grouping)
    const twigFolders = ctx.elements.activeSproutsList.querySelectorAll('.twig-folder')
    expect(twigFolders.length).toBe(1)
  })

  it('filters sprouts when hovering a twig in branch view', () => {
    vi.mocked(getViewMode).mockReturnValue('branch')
    vi.mocked(getActiveBranchIndex).mockReturnValue(0)
    vi.mocked(getHoveredTwigId).mockReturnValue('branch-0-twig-0')

    const sprout0 = makeDerivedSprout({ id: 's1', twigId: 'branch-0-twig-0' })
    const sprout1 = makeDerivedSprout({ id: 's2', twigId: 'branch-0-twig-1' })

    vi.mocked(getActiveSprouts).mockReturnValue([sprout0, sprout1])

    const ctx = createMockAppContext()
    initSidebarSprouts(ctx)

    // Only twig-0 sprouts should show (flat list)
    const stackedCards = ctx.elements.activeSproutsList.querySelectorAll('.sidebar-stacked-card')
    expect(stackedCards.length).toBe(1)
  })

  it('handles completed sprouts', () => {
    const completedSprout = makeDerivedSprout({
      id: 's-completed',
      state: 'completed',
      result: 4,
      harvestedAt: '2026-02-14T10:00:00Z',
    })

    vi.mocked(getCompletedSprouts).mockReturnValue([completedSprout])
    vi.mocked(toSprout).mockImplementation((derived) =>
      makeSprout(derived.twigId, {
        id: derived.id,
        title: derived.title,
        leafId: derived.leafId,
        state: 'completed',
        result: 4,
      }),
    )

    const ctx = createMockAppContext()
    initSidebarSprouts(ctx)

    const cultivatedCount =
      ctx.elements.cultivatedSproutsToggle.querySelector('.sprouts-toggle-count')
    expect(cultivatedCount?.textContent).toBe('(1)')
  })

  it('passes water click callback', () => {
    vi.mocked(getViewMode).mockReturnValue('twig')
    vi.mocked(getActiveTwigId).mockReturnValue('branch-0-twig-0')

    const sprout = makeDerivedSprout({ id: 's1', twigId: 'branch-0-twig-0' })
    vi.mocked(getActiveSprouts).mockReturnValue([sprout])

    const onWaterClick = vi.fn()
    const ctx = createMockAppContext()
    initSidebarSprouts(ctx, onWaterClick)

    // Find the water button
    const waterBtn = ctx.elements.activeSproutsList.querySelector('.action-btn-water')
    expect(waterBtn).not.toBe(null)
  })

  it('shows watered badge when sprout was watered today', () => {
    vi.mocked(getViewMode).mockReturnValue('twig')
    vi.mocked(getActiveTwigId).mockReturnValue('branch-0-twig-0')
    vi.mocked(checkSproutWateredToday).mockReturnValue(true)

    const sprout = makeDerivedSprout({ id: 's1', twigId: 'branch-0-twig-0' })
    vi.mocked(getActiveSprouts).mockReturnValue([sprout])

    const onWaterClick = vi.fn()
    const ctx = createMockAppContext()
    initSidebarSprouts(ctx, onWaterClick)

    const badge = ctx.elements.activeSproutsList.querySelector('.is-watered-badge')
    expect(badge).not.toBe(null)
    expect(badge?.textContent).toBe('watered')
  })

  it('shows harvest button when sprout end date is past', () => {
    vi.mocked(getViewMode).mockReturnValue('twig')
    vi.mocked(getActiveTwigId).mockReturnValue('branch-0-twig-0')

    const sprout = makeDerivedSprout({ id: 's1', twigId: 'branch-0-twig-0' })
    vi.mocked(getActiveSprouts).mockReturnValue([sprout])
    vi.mocked(toSprout).mockReturnValue(
      makeSprout('branch-0-twig-0', {
        id: 's1',
        leafId: 'leaf-default',
        endDate: '2020-01-01T00:00:00Z', // Past date
      }) as any,
    )

    const onWaterClick = vi.fn()
    const onHarvestClick = vi.fn()
    const ctx = createMockAppContext()
    initSidebarSprouts(ctx, onWaterClick, undefined, undefined, undefined, onHarvestClick)

    const harvestBtn = ctx.elements.activeSproutsList.querySelector('.action-btn-harvest')
    expect(harvestBtn).not.toBe(null)
    expect(harvestBtn?.textContent).toBe('harvest')
  })

  it('shows READY for past end dates', () => {
    vi.mocked(getViewMode).mockReturnValue('twig')
    vi.mocked(getActiveTwigId).mockReturnValue('branch-0-twig-0')

    const sprout = makeDerivedSprout({ id: 's1', twigId: 'branch-0-twig-0' })
    vi.mocked(getActiveSprouts).mockReturnValue([sprout])
    vi.mocked(toSprout).mockReturnValue(
      makeSprout('branch-0-twig-0', {
        id: 's1',
        leafId: 'leaf-default',
        endDate: '2020-01-01T00:00:00Z',
      }) as any,
    )

    const ctx = createMockAppContext()
    initSidebarSprouts(ctx)

    const meta = ctx.elements.activeSproutsList.querySelector('.sidebar-stacked-meta')
    expect(meta?.textContent).toBe('READY')
  })

  it('formats future end dates as MM/DD/YY', () => {
    vi.mocked(getViewMode).mockReturnValue('twig')
    vi.mocked(getActiveTwigId).mockReturnValue('branch-0-twig-0')

    const sprout = makeDerivedSprout({ id: 's1', twigId: 'branch-0-twig-0' })
    vi.mocked(getActiveSprouts).mockReturnValue([sprout])
    vi.mocked(toSprout).mockReturnValue(
      makeSprout('branch-0-twig-0', {
        id: 's1',
        leafId: 'leaf-default',
        endDate: '2030-06-15T15:00:00Z',
      }) as any,
    )

    const ctx = createMockAppContext()
    initSidebarSprouts(ctx)

    const meta = ctx.elements.activeSproutsList.querySelector('.sidebar-stacked-meta')
    expect(meta?.textContent).toBe('06/15/30')
  })

  it('shows season when no end date', () => {
    vi.mocked(getViewMode).mockReturnValue('twig')
    vi.mocked(getActiveTwigId).mockReturnValue('branch-0-twig-0')

    const sprout = makeDerivedSprout({ id: 's1', twigId: 'branch-0-twig-0' })
    vi.mocked(getActiveSprouts).mockReturnValue([sprout])
    vi.mocked(toSprout).mockReturnValue(
      makeSprout('branch-0-twig-0', {
        id: 's1',
        leafId: 'leaf-default',
        endDate: undefined,
      }) as any,
    )

    const ctx = createMockAppContext()
    initSidebarSprouts(ctx)

    const meta = ctx.elements.activeSproutsList.querySelector('.sidebar-stacked-meta')
    expect(meta?.textContent).toBe('1m')
  })

  it('all sprouts have leafId and render in leaf groups', () => {
    vi.mocked(getViewMode).mockReturnValue('twig')
    vi.mocked(getActiveTwigId).mockReturnValue('branch-0-twig-0')

    const sprout = makeDerivedSprout({ id: 's1', twigId: 'branch-0-twig-0', leafId: 'leaf-1' })
    vi.mocked(getActiveSprouts).mockReturnValue([sprout])

    const ctx = createMockAppContext()
    initSidebarSprouts(ctx)

    const cards = ctx.elements.activeSproutsList.querySelectorAll('.sidebar-stacked-card')
    expect(cards.length).toBe(1)
  })

  it('skips sprouts with invalid twig IDs in groupByBranch', () => {
    const sprout = makeDerivedSprout({ id: 's1', twigId: 'invalid-id' })
    vi.mocked(getActiveSprouts).mockReturnValue([sprout])

    const ctx = createMockAppContext()
    initSidebarSprouts(ctx)

    // Invalid branch index (-1) should be skipped in groupByBranch
    const branchFolders = ctx.elements.activeSproutsList.querySelectorAll('.branch-folder')
    expect(branchFolders.length).toBe(0)
  })
})

describe('initSidebarSprouts', () => {
  beforeEach(() => {
    vi.mocked(getViewMode).mockReturnValue('overview')
    vi.mocked(getActiveBranchIndex).mockReturnValue(null)
    vi.mocked(getHoveredBranchIndex).mockReturnValue(null)
    vi.mocked(getHoveredTwigId).mockReturnValue(null)
    vi.mocked(getActiveTwigId).mockReturnValue(null)
    vi.mocked(getActiveSprouts).mockReturnValue([])
    vi.mocked(getCompletedSprouts).mockReturnValue([])
    vi.mocked(getState).mockReturnValue(makeDerivedState())
  })

  it('sets up collapsible toggles', () => {
    const ctx = createMockAppContext()
    initSidebarSprouts(ctx)

    expect(ctx.elements.activeSproutsToggle.classList.contains('is-expanded')).toBe(true)
    expect(ctx.elements.cultivatedSproutsToggle.classList.contains('is-expanded')).toBe(true)
  })

  it('toggles active section on click', () => {
    const ctx = createMockAppContext()
    initSidebarSprouts(ctx)

    // Click to collapse
    ctx.elements.activeSproutsToggle.click()
    expect(ctx.elements.activeSproutsToggle.classList.contains('is-expanded')).toBe(false)
    expect(ctx.elements.activeSproutsList.classList.contains('is-collapsed')).toBe(true)

    // Click to expand
    ctx.elements.activeSproutsToggle.click()
    expect(ctx.elements.activeSproutsToggle.classList.contains('is-expanded')).toBe(true)
    expect(ctx.elements.activeSproutsList.classList.contains('is-collapsed')).toBe(false)
  })

  it('toggles cultivated section on click', () => {
    const ctx = createMockAppContext()
    initSidebarSprouts(ctx)

    ctx.elements.cultivatedSproutsToggle.click()
    expect(ctx.elements.cultivatedSproutsToggle.classList.contains('is-expanded')).toBe(false)
    expect(ctx.elements.cultivatedSproutsList.classList.contains('is-collapsed')).toBe(true)
  })

  it('stores callbacks for subsequent updateSidebarSprouts calls', () => {
    const onWaterClick = vi.fn()
    const branchCallbacks = { onClick: vi.fn() }
    const onTwigClick = vi.fn()
    const onLeafClick = vi.fn()
    const onHarvestClick = vi.fn()

    const ctx = createMockAppContext()
    initSidebarSprouts(ctx, onWaterClick, branchCallbacks, onTwigClick, onLeafClick, onHarvestClick)

    // Calling updateSidebarSprouts again should use stored callbacks
    updateSidebarSprouts(ctx)
  })
})

describe('updateStats', () => {
  it('calls both updateScopedProgress and updateSidebarSprouts', () => {
    vi.mocked(getViewMode).mockReturnValue('overview')
    vi.mocked(getActiveBranchIndex).mockReturnValue(null)
    vi.mocked(getHoveredBranchIndex).mockReturnValue(null)
    vi.mocked(getHoveredTwigId).mockReturnValue(null)
    vi.mocked(getActiveTwigId).mockReturnValue(null)
    vi.mocked(getActiveSprouts).mockReturnValue([])
    vi.mocked(getCompletedSprouts).mockReturnValue([])
    vi.mocked(getState).mockReturnValue(makeDerivedState())

    const ctx = createMockAppContext()
    initSidebarSprouts(ctx) // Initialize callbacks first

    updateStats(ctx)

    // Should update progress and sidebar without throwing
    expect(ctx.elements.progressCount.innerHTML).toContain('branches filled')
  })
})
