/**
 * Tests for leaf group rendering in ui/twig-view/sprout-cards.ts.
 *
 * Every leaf renders with its name and carries a data-layers depth cue, so a
 * saga with history reads as a stack of sheets without extra chrome.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../events', async () => {
  // countLeafProgress stays REAL: these tests assert the done/growing rule
  // itself, so stubbing it would test nothing.
  const actual = await vi.importActual<typeof import('../events')>('../events')
  return {
    countLeafProgress: actual.countLeafProgress,
    getState: vi.fn(() => ({})),
    getLeafById: vi.fn(() => ({ id: 'leaf-1', twigId: 'branch-0-twig-0', name: 'Step Count' })),
    checkSproutWateredToday: vi.fn(() => false),
  }
})

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

/** 2 completed + 1 uprooted + 1 active. */
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

function layersOf(html: string): string | null {
  return html.match(/data-layers="(\d+)"/)?.[1] ?? null
}

describe('leaf group rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getLeafById).mockReturnValue({
      id: 'leaf-1',
      twigId: 'branch-0-twig-0',
      name: 'Step Count',
      createdAt: new Date().toISOString(),
    })
  })

  it('shows the leaf name even when the leaf holds a single sprout', () => {
    const html = renderLeafCard('leaf-1', [makeSprout({ id: 'only', title: 'solo' })], true)
    expect(html).toContain('Step Count')
  })

  it('renders nothing in either column for a leaf that is only uprooted', () => {
    // Growing shows actives and Cultivated shows completeds, so a leaf whose
    // every sprout was uprooted has nothing to show anywhere — it should not
    // render an empty shell.
    const onlyUprooted = [makeSprout({ id: 'u', state: 'uprooted' })]
    expect(renderLeafCard('leaf-1', onlyUprooted, true)).toBe('')
    expect(renderLeafCard('leaf-1', onlyUprooted, false)).toBe('')
  })

  it('renders no extra depth for a single-sprout leaf', () => {
    const html = renderLeafCard('leaf-1', [makeSprout({ id: 'only' })], true)
    expect(layersOf(html)).toBe('1')
  })

  it('deepens the stack with the whole saga, not just the shown sprout', () => {
    // Cultivated shows one card, but depth reflects the leaf's full history.
    const done = saga().filter((s) => s.state !== 'active')
    const html = renderLeafCard('leaf-1', done, false)
    expect(layersOf(html)).toBe('3')
    expect((html.match(/class="sprout-card /g) || []).length).toBe(1)
  })

  it('caps depth at 3 sheets however long the saga gets', () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      makeSprout({ id: `s${i}`, state: 'completed', result: 3 }),
    )
    expect(layersOf(renderLeafCard('leaf-1', many, false))).toBe('3')
  })

  it('renders an empty string when the column has nothing to show', () => {
    const html = renderLeafCard('leaf-1', [makeSprout({ id: 'u', state: 'uprooted' })], false)
    expect(html).toBe('')
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
