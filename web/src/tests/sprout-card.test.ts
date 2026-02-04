import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildSproutCard, type SproutCardOptions } from '../ui/twig-view/sprout-card'

// Mock getDebugNow to return consistent time
vi.mock('../state', () => ({
  getDebugNow: vi.fn(() => Date.now()),
  getSoilRecoveryRate: vi.fn(() => 0.05),
}))

vi.mock('../events', () => ({
  checkSproutWateredThisWeek: vi.fn(() => false),
}))

describe('buildSproutCard', () => {
  const baseOptions: SproutCardOptions = {
    sprout: {
      id: 'sprout-123',
      title: 'Learn TypeScript',
      season: '3m',
      environment: 'firm',
      state: 'active',
      soilCost: 8,
      createdAt: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    },
    showActions: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a card element', () => {
    const card = buildSproutCard(baseOptions)
    expect(card).toBeInstanceOf(HTMLElement)
    expect(card.classList.contains('sprout-card')).toBe(true)
  })

  it('displays sprout title', () => {
    const card = buildSproutCard(baseOptions)
    expect(card.textContent).toContain('Learn TypeScript')
  })

  it('displays season label', () => {
    const card = buildSproutCard(baseOptions)
    // Season '3m' should display as '3 months' based on shared constants
    expect(card.textContent).toContain('3 months')
  })

  it('shows water button for active sprouts when showActions is true', () => {
    const card = buildSproutCard(baseOptions)
    const waterBtn = card.querySelector('.sprout-water-btn')
    expect(waterBtn).not.toBeNull()
  })

  it('hides actions when showActions is false', () => {
    const card = buildSproutCard({ ...baseOptions, showActions: false })
    const waterBtn = card.querySelector('.sprout-water-btn')
    const harvestBtn = card.querySelector('.sprout-harvest-btn')
    expect(waterBtn).toBeNull()
    expect(harvestBtn).toBeNull()
  })

  it('shows harvest button when sprout is ready', () => {
    const readySprout = {
      ...baseOptions.sprout,
      endDate: new Date(Date.now() - 1000).toISOString(), // in the past
    }
    const card = buildSproutCard({ ...baseOptions, sprout: readySprout })
    const harvestBtn = card.querySelector('.sprout-harvest-btn')
    expect(harvestBtn).not.toBeNull()
  })

  it('shows days remaining for growing sprouts', () => {
    const card = buildSproutCard(baseOptions)
    // Should show something like "7 days remaining"
    expect(card.textContent).toMatch(/\d+ days? remaining/)
  })

  it('displays result for completed sprouts', () => {
    const completedSprout = {
      ...baseOptions.sprout,
      state: 'completed' as const,
      result: 4,
      completedAt: new Date().toISOString(),
    }
    const card = buildSproutCard({ ...baseOptions, sprout: completedSprout, showActions: false })
    // Should show "4/5" result
    expect(card.textContent).toContain('4/5')
  })

  it('includes delete button with aria-label', () => {
    const card = buildSproutCard(baseOptions)
    const deleteBtn = card.querySelector('.sprout-delete-btn')
    expect(deleteBtn).not.toBeNull()
    expect(deleteBtn?.getAttribute('aria-label')).toBe('Uproot')
  })

  it('marks card as is-ready when sprout is ready to harvest', () => {
    const readySprout = {
      ...baseOptions.sprout,
      endDate: new Date(Date.now() - 1000).toISOString(),
    }
    const card = buildSproutCard({ ...baseOptions, sprout: readySprout })
    expect(card.classList.contains('is-ready')).toBe(true)
  })

  it('marks card as is-growing when sprout is not ready', () => {
    const card = buildSproutCard(baseOptions)
    expect(card.classList.contains('is-growing')).toBe(true)
  })

  it('marks card as is-completed for completed sprouts', () => {
    const completedSprout = {
      ...baseOptions.sprout,
      state: 'completed' as const,
      result: 4,
    }
    const card = buildSproutCard({ ...baseOptions, sprout: completedSprout })
    expect(card.classList.contains('is-completed')).toBe(true)
  })

  it('renders bloom descriptions when provided', () => {
    const sproutWithBloom = {
      ...baseOptions.sprout,
      bloomWither: 'Gave up early',
      bloomBudding: 'Made progress',
      bloomFlourish: 'Mastered it',
    }
    const card = buildSproutCard({ ...baseOptions, sprout: sproutWithBloom })
    expect(card.textContent).toContain('Gave up early')
    expect(card.textContent).toContain('Made progress')
    expect(card.textContent).toContain('Mastered it')
  })

  it('adds is-clickable class when sprout has leafId', () => {
    const sproutWithLeaf = {
      ...baseOptions.sprout,
      leafId: 'leaf-abc',
    }
    const card = buildSproutCard({ ...baseOptions, sprout: sproutWithLeaf })
    expect(card.classList.contains('is-clickable')).toBe(true)
  })

  it('does not add is-clickable class when sprout has no leafId', () => {
    const card = buildSproutCard(baseOptions)
    expect(card.classList.contains('is-clickable')).toBe(false)
  })

  it('stores sprout id as data attribute', () => {
    const card = buildSproutCard(baseOptions)
    expect(card.dataset.id).toBe('sprout-123')
  })

  it('stores leaf id as data attribute when present', () => {
    const sproutWithLeaf = {
      ...baseOptions.sprout,
      leafId: 'leaf-abc',
    }
    const card = buildSproutCard({ ...baseOptions, sprout: sproutWithLeaf })
    expect(card.dataset.leafId).toBe('leaf-abc')
  })

  it('shows disabled watered button when already watered this week', async () => {
    const { checkSproutWateredThisWeek } = await import('../events')
    vi.mocked(checkSproutWateredThisWeek).mockReturnValue(true)

    const card = buildSproutCard(baseOptions)
    const waterBtn = card.querySelector('.sprout-water-btn') as HTMLButtonElement
    expect(waterBtn.disabled).toBe(true)
    expect(waterBtn.textContent).toContain('Watered')
  })

  it('displays reflection for completed sprouts when present', () => {
    const completedSprout = {
      ...baseOptions.sprout,
      state: 'completed' as const,
      result: 3,
      reflection: 'This was a great learning experience',
      completedAt: new Date().toISOString(),
    }
    const card = buildSproutCard({ ...baseOptions, sprout: completedSprout })
    expect(card.textContent).toContain('This was a great learning experience')
  })
})
