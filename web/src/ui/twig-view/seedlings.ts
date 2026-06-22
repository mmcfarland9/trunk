import type { DerivedSeedling } from '../../events'
import { appendEvent, generateSeedlingId, getSeedlingsForTwig, getState } from '../../events'
import { escapeHtml } from '../../utils/escape-html'

/**
 * Render a single seedling card. `locationLabel` (used by the sidebar tray) adds
 * a twig-location line; the twig view omits it.
 */
export function renderSeedlingCard(s: DerivedSeedling, opts?: { locationLabel?: string }): string {
  return `
    <div class="seedling-card" data-seedling-id="${escapeHtml(s.id)}">
      <span class="seedling-title">${escapeHtml(s.title)}</span>
      ${s.notes ? `<span class="seedling-notes">${escapeHtml(s.notes)}</span>` : ''}
      ${opts?.locationLabel ? `<span class="seedling-location">${escapeHtml(opts.locationLabel)}</span>` : ''}
      <div class="seedling-actions">
        <button type="button" class="seedling-action" data-seedling-action="plant" title="Plant as sprout">Set</button>
        <button type="button" class="seedling-action" data-seedling-action="edit" title="Edit">Edit</button>
        <button type="button" class="seedling-action seedling-action-delete" data-seedling-action="delete" title="Delete">&times;</button>
      </div>
    </div>`
}

/**
 * Render seedling cards for a twig.
 */
export function renderSeedlings(twigId: string): string {
  const state = getState()
  const seedlings = getSeedlingsForTwig(state, twigId)

  if (seedlings.length === 0) {
    return '<p class="seedling-empty">Jot down ideas for this twig</p>'
  }

  return seedlings.map((s) => renderSeedlingCard(s)).join('')
}

/**
 * Create a new seedling for a twig.
 */
export function createSeedling(twigId: string, title: string, notes?: string): void {
  const seedlingId = generateSeedlingId()
  appendEvent({
    type: 'seedling_created',
    timestamp: new Date().toISOString(),
    seedlingId,
    twigId,
    title,
    notes,
  })
}

/**
 * Delete a seedling.
 */
export function deleteSeedling(seedlingId: string): void {
  appendEvent({
    type: 'seedling_deleted',
    timestamp: new Date().toISOString(),
    seedlingId,
  })
}

/**
 * Edit a seedling's title and/or notes.
 */
export function editSeedling(seedlingId: string, title?: string, notes?: string): void {
  appendEvent({
    type: 'seedling_edited',
    timestamp: new Date().toISOString(),
    seedlingId,
    ...(title !== undefined && { title }),
    ...(notes !== undefined && { notes }),
  })
}

/**
 * Get a seedling by ID from current state.
 */
export function getSeedlingById(seedlingId: string): DerivedSeedling | undefined {
  return getState().seedlings.get(seedlingId)
}
