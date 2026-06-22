import { describe, expect, it } from 'vitest'
import type { DerivedSeedling } from '../events'
import { renderSeedlingCard } from '../ui/twig-view/seedlings'

const seedling: DerivedSeedling = {
  id: 'seedling-abc',
  twigId: 'branch-2-twig-3',
  title: 'Learn kerning',
  notes: 'start with type crimes',
  createdAt: '2026-06-01T12:00:00.000Z',
}

describe('renderSeedlingCard', () => {
  it('renders title, notes, id and the three actions', () => {
    const html = renderSeedlingCard(seedling)
    expect(html).toContain('data-seedling-id="seedling-abc"')
    expect(html).toContain('Learn kerning')
    expect(html).toContain('start with type crimes')
    expect(html).toContain('data-seedling-action="plant"')
    expect(html).toContain('data-seedling-action="edit"')
    expect(html).toContain('data-seedling-action="delete"')
  })

  it('omits the location span unless a label is given', () => {
    expect(renderSeedlingCard(seedling)).not.toContain('seedling-location')
    expect(renderSeedlingCard(seedling, { locationLabel: 'BRAIN / Reading' })).toContain(
      '<span class="seedling-location">BRAIN / Reading</span>',
    )
  })

  it('escapes HTML in title', () => {
    const html = renderSeedlingCard({ ...seedling, title: '<img>' })
    expect(html).not.toContain('<img>')
    expect(html).toContain('&lt;img&gt;')
  })

  it('escapes HTML in locationLabel', () => {
    const html = renderSeedlingCard(seedling, { locationLabel: '<b>bold</b>' })
    expect(html).not.toContain('<b>')
    expect(html).toContain('&lt;b&gt;')
  })

  it('escapes HTML in notes', () => {
    const html = renderSeedlingCard({ ...seedling, notes: '<b>x</b>' })
    expect(html).not.toContain('<b>')
    expect(html).toContain('&lt;b&gt;')
  })
})
