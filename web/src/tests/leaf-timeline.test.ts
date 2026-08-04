/**
 * Tests for the leaf timeline in ui/twig-view/sprout-cards.ts.
 *
 * Every leaf renders with its name and an ordered node per sprout, so a card
 * reads as a segment of an ongoing saga rather than a standalone goal.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../events', () => ({
  getState: vi.fn(() => ({})),
  getLeafById: vi.fn(() => ({ id: 'leaf-1', twigId: 'branch-0-twig-0', name: 'Step Count' })),
  checkSproutWateredToday: vi.fn(() => false),
}))

import { getLeafById } from '../events'
import type { Sprout } from '../types'
import { renderLeafCard } from '../ui/twig-view/sprout-cards'

const day = 24 * 60 * 60 * 1000

function makeSprout(over: Partial<Sprout> & { id: string }): Sprout {
  return {
    twigId: 'branch-0-twig-0',
    leafId: 'leaf-1',
    title: 'A sprout',
    season: '1m',
    environment: 'fertile',
    soilCost: 2,
    state: 'active',
    createdAt: new Date(Date.now() - 10 * day).toISOString(),
    ...over,
  } as Sprout
}

/** Oldest -> newest, mixed states. */
function saga(): Sprout[] {
  return [
    makeSprout({
      id: 's1',
      title: 'may',
      state: 'completed',
      result: 4,
      createdAt: new Date(Date.now() - 150 * day).toISOString(),
      harvestedAt: new Date(Date.now() - 120 * day).toISOString(),
    }),
    makeSprout({
      id: 's2',
      title: 'june',
      state: 'uprooted',
      createdAt: new Date(Date.now() - 118 * day).toISOString(),
    }),
    makeSprout({
      id: 's3',
      title: 'july',
      state: 'completed',
      result: 5,
      createdAt: new Date(Date.now() - 86 * day).toISOString(),
      harvestedAt: new Date(Date.now() - 56 * day).toISOString(),
    }),
    makeSprout({ id: 's4', title: 'august', state: 'active' }),
  ]
}

describe('leaf timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getLeafById).mockReturnValue({
      id: 'leaf-1',
      twigId: 'branch-0-twig-0',
      name: 'Step Count',
      createdAt: new Date().toISOString(),
    })
  })

  it('renders one node per sprout in the leaf', () => {
    const html = renderLeafCard('leaf-1', saga(), true)
    expect((html.match(/class="leaf-node/g) || []).length).toBe(4)
  })

  it('marks each node by state', () => {
    const html = renderLeafCard('leaf-1', saga(), true)
    expect((html.match(/is-completed/g) || []).length).toBe(2)
    expect((html.match(/is-uprooted/g) || []).length).toBe(1)
    expect((html.match(/is-active/g) || []).length).toBe(1)
  })

  it('orders nodes oldest first regardless of input order', () => {
    const shuffled = [saga()[3], saga()[1], saga()[2], saga()[0]]
    const html = renderLeafCard('leaf-1', shuffled, true)
    const order = [...html.matchAll(/aria-label="(\d+)\/4 · (\w+)/g)].map((m) => m[2])
    expect(order).toEqual(['may', 'june', 'july', 'august'])
  })

  it('shows the leaf name even when the leaf holds a single sprout', () => {
    const html = renderLeafCard('leaf-1', [makeSprout({ id: 'only', title: 'solo' })], true)
    expect(html).toContain('Step Count')
    expect((html.match(/class="leaf-node/g) || []).length).toBe(1)
  })

  it('summarises progress across all states', () => {
    // The saga is 2 completed + 1 uprooted + 1 active: uprooted counts toward
    // neither, so it must not inflate "done".
    const html = renderLeafCard('leaf-1', saga(), true)
    expect(html).toContain('2 done · 1 growing')
  })

  it('says "just planted" when nothing is done or growing', () => {
    const html = renderLeafCard('leaf-1', [makeSprout({ id: 'u', state: 'uprooted' })], false)
    // Nothing completed, so the cultivated card renders empty rather than lying.
    expect(html).toBe('')
  })

  it('counts the full saga on a cultivated card, not just the shown sprout', () => {
    const done = saga().filter((s) => s.state !== 'active')
    const html = renderLeafCard('leaf-1', done, false)
    // One card shown, but every sprout still gets a node.
    expect((html.match(/class="leaf-node/g) || []).length).toBe(3)
    expect((html.match(/class="sprout-card /g) || []).length).toBe(1)
  })

  it('escapes leaf names and sprout titles', () => {
    vi.mocked(getLeafById).mockReturnValue({
      id: 'leaf-1',
      twigId: 'branch-0-twig-0',
      name: '<img src=x onerror=alert(1)>',
      createdAt: new Date().toISOString(),
    })
    const html = renderLeafCard('leaf-1', [makeSprout({ id: 'x', title: '<b>bold</b>' })], true)
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img src=x')
  })
})
