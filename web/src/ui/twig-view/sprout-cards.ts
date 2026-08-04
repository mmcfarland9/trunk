import sharedConstants from '../../../../shared/constants.json'
import { checkSproutWateredToday, getLeafById, getState } from '../../events'
import type { Sprout } from '../../types'
import { escapeHtml } from '../../utils/escape-html'
import { getResultEmoji, getSeasonLabel } from '../../utils/sprout-labels'
import { formatDate } from './sprout-form'

/**
 * Determines if a sprout is ready to harvest.
 */
export function isReady(sprout: Sprout): boolean {
  if (!sprout.endDate) return false
  return new Date(sprout.endDate).getTime() <= Date.now()
}

/**
 * Gets the number of days remaining for a sprout.
 */
function getDaysRemaining(sprout: Sprout): number {
  if (!sprout.endDate) return 0
  const end = new Date(sprout.endDate).getTime()
  const now = Date.now()
  const diff = end - now
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

/**
 * Renders a completed sprout card.
 */
export function renderHistoryCard(s: Sprout): string {
  const hasLeaf = !!s.leafId

  const hasBloom = s.bloomWither || s.bloomBudding || s.bloomFlourish
  const bloomHtml = hasBloom
    ? `
    <p class="sprout-card-bloom">
      ${s.bloomWither ? `<span class="bloom-item">🥀 <em>${escapeHtml(s.bloomWither)}</em></span>` : ''}
      ${s.bloomBudding ? `<span class="bloom-item">🌱 <em>${escapeHtml(s.bloomBudding)}</em></span>` : ''}
      ${s.bloomFlourish ? `<span class="bloom-item">🌲 <em>${escapeHtml(s.bloomFlourish)}</em></span>` : ''}
    </p>
  `
    : ''

  return `
    <div class="sprout-card sprout-history-card is-completed ${hasLeaf ? 'is-clickable' : ''}" data-id="${escapeHtml(s.id)}" ${hasLeaf ? `data-leaf-id="${escapeHtml(s.leafId || '')}" data-action="open-leaf"` : ''} role="listitem" aria-label="${escapeHtml(s.title)} - completed">
      <div class="sprout-card-header">
        <span class="sprout-card-season">${getSeasonLabel(s.season)}</span>
      </div>
      <p class="sprout-card-title">${escapeHtml(s.title)}</p>
      ${bloomHtml}
      <div class="sprout-result-section">
        <span class="sprout-result-display">${getResultEmoji(s.result || 1)} ${s.result || 1}/5</span>
        <span class="sprout-card-date">${s.harvestedAt ? formatDate(new Date(s.harvestedAt)) : ''}</span>
      </div>
      ${s.reflection ? `<p class="sprout-card-reflection">${escapeHtml(s.reflection)}</p>` : ''}
      ${
        hasLeaf
          ? `<div class="sprout-card-actions sprout-history-actions">
        <button type="button" class="action-btn action-btn-progress action-btn-twig sprout-continue-btn" data-action="continue-leaf" data-leaf-id="${escapeHtml(s.leafId || '')}" aria-label="Continue this leaf">continue</button>
      </div>`
          : ''
      }
    </div>
  `
}

/**
 * Renders an active sprout card.
 */
export function renderActiveCard(s: Sprout): string {
  const ready = isReady(s)
  const daysLeft = getDaysRemaining(s)
  const hasLeaf = !!s.leafId
  const hasBloom = s.bloomWither || s.bloomBudding || s.bloomFlourish
  const bloomHtml = hasBloom
    ? `
    <p class="sprout-card-bloom">
      ${s.bloomWither ? `<span class="bloom-item">🥀 <em>${escapeHtml(s.bloomWither)}</em></span>` : ''}
      ${s.bloomBudding ? `<span class="bloom-item">🌱 <em>${escapeHtml(s.bloomBudding)}</em></span>` : ''}
      ${s.bloomFlourish ? `<span class="bloom-item">🌲 <em>${escapeHtml(s.bloomFlourish)}</em></span>` : ''}
    </p>
  `
    : ''

  return `
    <div class="sprout-card sprout-active-card ${ready ? 'is-ready' : 'is-growing'} ${hasLeaf ? 'is-clickable' : ''}" data-id="${escapeHtml(s.id)}" ${hasLeaf ? `data-leaf-id="${escapeHtml(s.leafId || '')}" data-action="open-leaf"` : ''} role="listitem" aria-label="${escapeHtml(s.title)} - ${ready ? 'ready to harvest' : 'growing'}">
      <div class="sprout-card-header">
        <span class="sprout-card-season">${getSeasonLabel(s.season)}</span>
        <button type="button" class="sprout-edit-btn" data-action="edit" aria-label="Edit">edit</button>
        <button type="button" class="sprout-delete-btn" data-action="delete" aria-label="Uproot">x</button>
      </div>
      <p class="sprout-card-title">${escapeHtml(s.title)}</p>
      ${bloomHtml}

      ${
        ready
          ? `
        <div class="sprout-ready-footer">
          <p class="sprout-card-status">Ready to harvest</p>
          <button type="button" class="action-btn action-btn-progress action-btn-harvest sprout-harvest-btn" data-action="harvest">Harvest</button>
        </div>
      `
          : `
        <div class="sprout-growing-footer">
          <p class="sprout-days-remaining">${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining</p>
          ${
            checkSproutWateredToday(s.id)
              ? `<span class="is-watered-badge">watered</span>`
              : `<button type="button" class="action-btn action-btn-progress action-btn-water sprout-water-btn" data-action="water">Water <span class="btn-soil-gain">(+${sharedConstants.soil.recoveryRates.waterUse.toFixed(2)})</span></button>`
          }
        </div>
      `
      }
    </div>
  `
}

/**
 * Renders the ordered node timeline for a leaf: one node per sprout, oldest
 * first, so a sprout reads as a segment of an ongoing saga rather than a
 * standalone card. Nodes are inert — the surrounding leaf group carries the
 * click that opens the leaf's history.
 */
function renderLeafTimeline(sprouts: Sprout[], currentId?: string): string {
  const ordered = [...sprouts].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  const nodes = ordered
    .map((s, i) => {
      const position = `${i + 1}/${ordered.length}`
      const when = s.harvestedAt ? formatDate(new Date(s.harvestedAt)) : ''

      let cls = 'leaf-node'
      let glyph = '◦'
      let detail = ''

      if (s.state === 'completed') {
        cls += ' is-completed'
        glyph = '●'
        detail = `${getResultEmoji(s.result || 1)} ${s.result || 1}/5${when ? ` · ${when}` : ''}`
      } else if (s.state === 'uprooted') {
        cls += ' is-uprooted'
        glyph = '×'
        detail = 'uprooted'
      } else {
        cls += ' is-active'
        glyph = '◉'
        detail = 'growing now'
      }

      if (s.id === currentId) cls += ' is-current'

      const label = `${position} · ${s.title}${detail ? ` · ${detail}` : ''}`
      return `<span class="${cls}" role="listitem" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${glyph}</span>`
    })
    .join('')

  return `<div class="leaf-timeline" role="list">${nodes}</div>`
}

/** Short summary of a leaf's progress, e.g. "3 done · 1 growing". */
function leafProgressLabel(sprouts: Sprout[]): string {
  const done = sprouts.filter((s) => s.state === 'completed').length
  const growing = sprouts.filter((s) => s.state === 'active').length
  const parts: string[] = []
  if (done > 0) parts.push(`${done} done`)
  if (growing > 0) parts.push(`${growing} growing`)
  return parts.join(' · ') || 'just planted'
}

/**
 * Renders a leaf card (saga view).
 *
 * Every leaf — even one holding a single sprout — renders with its name and
 * timeline, so it's always clear which saga a sprout belongs to and where in
 * the sequence it sits.
 */
export function renderLeafCard(leafId: string, sprouts: Sprout[], isGrowing: boolean): string {
  const state = getState()
  const leaf = getLeafById(state, leafId)
  const leafName = leaf?.name || 'Unnamed Saga'

  const shown = isGrowing
    ? sprouts
        .filter((s) => s.state === 'active')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : sprouts
        .filter((s) => s.state === 'completed')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 1)

  if (shown.length === 0) return ''

  const cards = isGrowing
    ? shown.map((s) => renderActiveCard(s)).join('')
    : shown.map((s) => renderHistoryCard(s)).join('')

  return `
      <div class="leaf-card-group is-clickable" data-leaf-id="${escapeHtml(leafId)}" data-action="open-leaf">
        <div class="leaf-card-group-header">
          <span class="leaf-group-name">${escapeHtml(leafName)}</span>
          <span class="leaf-group-progress">${escapeHtml(leafProgressLabel(sprouts))}</span>
        </div>
        ${renderLeafTimeline(sprouts, shown[0]?.id)}
        <div class="leaf-card-group-sprouts">
          ${cards}
        </div>
      </div>
    `
}
