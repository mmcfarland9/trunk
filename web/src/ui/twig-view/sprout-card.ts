/**
 * Builds individual sprout cards for the twig view.
 * Handles active, ready-to-harvest, and completed sprout states.
 */

import type { Sprout } from '../../types'
import { escapeHtml } from '../../utils/escape-html'
import { getSeasonLabel, getResultEmoji } from '../../utils/sprout-labels'
import { getDebugNow, wasWateredThisWeek, getSoilRecoveryRate } from '../../state'

export type SproutCardOptions = {
  sprout: Sprout
  showActions: boolean
}

/**
 * Determines if a sprout is ready to harvest (end date has passed).
 */
function isReady(sprout: Sprout): boolean {
  if (!sprout.endDate) return false
  return new Date(sprout.endDate).getTime() <= getDebugNow()
}

/**
 * Calculates days remaining until sprout end date.
 */
function getDaysRemaining(sprout: Sprout): number {
  if (!sprout.endDate) return 0
  const end = new Date(sprout.endDate).getTime()
  const now = getDebugNow()
  const diff = end - now
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

/**
 * Formats a date for display.
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Builds the bloom description HTML if any bloom fields are set.
 */
function buildBloomHtml(sprout: Sprout): string {
  const hasBloom = sprout.bloomWither || sprout.bloomBudding || sprout.bloomFlourish
  if (!hasBloom) return ''

  return `
    <p class="sprout-card-bloom">
      ${sprout.bloomWither ? `<span class="bloom-item">🥀 <em>${escapeHtml(sprout.bloomWither)}</em></span>` : ''}
      ${sprout.bloomBudding ? `<span class="bloom-item">🌱 <em>${escapeHtml(sprout.bloomBudding)}</em></span>` : ''}
      ${sprout.bloomFlourish ? `<span class="bloom-item">🌲 <em>${escapeHtml(sprout.bloomFlourish)}</em></span>` : ''}
    </p>
  `
}

/**
 * Builds the footer for an active sprout that is ready to harvest.
 */
function buildReadyFooter(): string {
  return `
    <div class="sprout-ready-footer">
      <p class="sprout-card-status">Ready to harvest</p>
      <button type="button" class="action-btn action-btn-progress action-btn-harvest sprout-harvest-btn">Harvest</button>
    </div>
  `
}

/**
 * Builds the footer for an active sprout that is still growing.
 */
function buildGrowingFooter(sprout: Sprout, showActions: boolean): string {
  const daysLeft = getDaysRemaining(sprout)
  const watered = wasWateredThisWeek(sprout)

  if (!showActions) {
    return `
      <div class="sprout-growing-footer">
        <p class="sprout-days-remaining">${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining</p>
      </div>
    `
  }

  const recoveryRate = getSoilRecoveryRate()
  return `
    <div class="sprout-growing-footer">
      <p class="sprout-days-remaining">${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining</p>
      <button type="button" class="action-btn ${watered ? 'action-btn-passive' : 'action-btn-progress'} action-btn-water sprout-water-btn" ${watered ? 'disabled' : ''}>${watered ? 'Watered' : `Water <span class="btn-soil-gain">(+${recoveryRate.toFixed(2)})</span>`}</button>
    </div>
  `
}

/**
 * Builds the result section for completed sprouts.
 */
function buildResultSection(sprout: Sprout): string {
  return `
    <div class="sprout-result-section">
      <span class="sprout-result-display">${getResultEmoji(sprout.result || 1)} ${sprout.result || 1}/5</span>
      <span class="sprout-card-date">${sprout.completedAt ? formatDate(new Date(sprout.completedAt)) : ''}</span>
    </div>
  `
}

/**
 * Builds a card for an active sprout (growing or ready to harvest).
 */
function buildActiveCard(sprout: Sprout, showActions: boolean): HTMLDivElement {
  const ready = isReady(sprout)
  const hasLeaf = !!sprout.leafId
  const bloomHtml = buildBloomHtml(sprout)

  const card = document.createElement('div')
  card.className = `sprout-card sprout-active-card ${ready ? 'is-ready' : 'is-growing'} ${hasLeaf ? 'is-clickable' : ''}`
  card.dataset.id = escapeHtml(sprout.id)
  if (hasLeaf) {
    card.dataset.leafId = escapeHtml(sprout.leafId || '')
  }

  const footer = ready
    ? (showActions ? buildReadyFooter() : '')
    : buildGrowingFooter(sprout, showActions)

  card.innerHTML = `
    <div class="sprout-card-header">
      <span class="sprout-card-season">${getSeasonLabel(sprout.season)}</span>
      <button type="button" class="sprout-delete-btn" aria-label="Uproot">x</button>
    </div>
    <p class="sprout-card-title">${escapeHtml(sprout.title)}</p>
    ${bloomHtml}
    ${footer}
  `

  return card
}

/**
 * Builds a card for a completed sprout (history view).
 */
function buildHistoryCard(sprout: Sprout): HTMLDivElement {
  const hasLeaf = !!sprout.leafId
  const bloomHtml = buildBloomHtml(sprout)
  const resultSection = buildResultSection(sprout)

  const card = document.createElement('div')
  card.className = `sprout-card sprout-history-card is-completed ${hasLeaf ? 'is-clickable' : ''}`
  card.dataset.id = escapeHtml(sprout.id)
  if (hasLeaf) {
    card.dataset.leafId = escapeHtml(sprout.leafId || '')
  }

  card.innerHTML = `
    <div class="sprout-card-header">
      <span class="sprout-card-season">${getSeasonLabel(sprout.season)}</span>
      <button type="button" class="sprout-delete-btn" aria-label="Uproot">x</button>
    </div>
    <p class="sprout-card-title">${escapeHtml(sprout.title)}</p>
    ${bloomHtml}
    ${resultSection}
    ${sprout.reflection ? `<p class="sprout-card-reflection">${escapeHtml(sprout.reflection)}</p>` : ''}
  `

  return card
}

/**
 * Builds a sprout card element based on sprout state.
 * Returns an active card for 'active' sprouts and a history card for 'completed' sprouts.
 */
export function buildSproutCard(options: SproutCardOptions): HTMLDivElement {
  const { sprout, showActions } = options

  if (sprout.state === 'completed') {
    return buildHistoryCard(sprout)
  }

  return buildActiveCard(sprout, showActions)
}
