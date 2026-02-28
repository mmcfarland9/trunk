import type { Sprout } from '../../types'
import { escapeHtml } from '../../utils/escape-html'
import { getSeasonLabel, getResultEmoji } from '../../utils/sprout-labels'
import { formatDate } from './sprout-form'
import { getState, getLeafById, checkSproutWateredToday } from '../../events'
import sharedConstants from '../../../../shared/constants.json'

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
export function getDaysRemaining(sprout: Sprout): number {
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
 * Renders a leaf card (saga view).
 */
export function renderLeafCard(leafId: string, sprouts: Sprout[], isGrowing: boolean): string {
  const state = getState()
  const leaf = getLeafById(state, leafId)
  const leafName = leaf?.name || 'Unnamed Saga'

  if (isGrowing) {
    // Get all active sprouts for this leaf
    const activeSprouts = sprouts
      .filter((s) => s.state === 'active')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    if (activeSprouts.length === 0) return ''

    // If only one active sprout, render normally in a leaf wrapper
    if (activeSprouts.length === 1) {
      return `
        <div class="leaf-card" data-leaf-id="${escapeHtml(leafId)}" data-action="open-leaf">
          ${renderActiveCard(activeSprouts[0])}
        </div>
      `
    }

    // Multiple active sprouts - render each as full card, grouped with border and name
    return `
      <div class="leaf-card-group is-clickable" data-leaf-id="${escapeHtml(leafId)}" data-action="open-leaf">
        <div class="leaf-card-group-header">${escapeHtml(leafName)}</div>
        <div class="leaf-card-group-sprouts">
          ${activeSprouts.map((s) => renderActiveCard(s)).join('')}
        </div>
      </div>
    `
  }
  // Cultivated - show most recent completed sprout
  const completedSprouts = sprouts.filter((s) => s.state === 'completed')
  const topSprout = completedSprouts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0]

  if (!topSprout) return ''

  const layerCount = Math.min(completedSprouts.length, 3)
  return `
      <div class="leaf-card" data-leaf-id="${escapeHtml(leafId)}" data-layers="${layerCount}" data-action="open-leaf">
        ${renderHistoryCard(topSprout)}
      </div>
    `
}
