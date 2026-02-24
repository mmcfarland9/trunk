/**
 * Progress panel DOM construction.
 * Creates sidebar sprout cards, branch/twig folders, and leaf-grouped layouts.
 * Pure rendering — all data comes via parameters.
 */

import type { Sprout } from '../types'
import type { DerivedState } from '../events'
import { getLeafById, checkSproutWateredToday } from '../events'
import { getPresetLabel } from '../state'

// --- Types ---

export type SproutWithLocation = Sprout & { twigId: string; twigLabel: string; branchIndex: number }

export type SidebarHarvestCallback = (sprout: SproutWithLocation) => void

// --- Helpers ---

function formatEndDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  if (date <= now) return 'READY'
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = String(date.getFullYear()).slice(-2)
  return `${month}/${day}/${year}`
}

export function getTwigLabel(twigId: string): string {
  const presetLabel = getPresetLabel(twigId)
  if (presetLabel) return presetLabel
  const match = twigId.match(/twig-(\d+)$/)
  return match ? `Twig ${parseInt(match[1], 10) + 1}` : twigId
}

export function getBranchLabel(branchNode: HTMLButtonElement, index: number): string {
  const nodeId = branchNode.dataset.nodeId || ''
  const presetLabel = getPresetLabel(nodeId)
  return presetLabel || `Branch ${index + 1}`
}

function groupByLeaf(sprouts: SproutWithLocation[]): {
  standalone: SproutWithLocation[]
  byLeaf: Map<string, SproutWithLocation[]>
} {
  const standalone: SproutWithLocation[] = []
  const byLeaf = new Map<string, SproutWithLocation[]>()
  sprouts.forEach((sprout) => {
    if (!sprout.leafId) {
      standalone.push(sprout)
    } else {
      const list = byLeaf.get(sprout.leafId) || []
      list.push(sprout)
      byLeaf.set(sprout.leafId, list)
    }
  })
  return { standalone, byLeaf }
}

// --- DOM Constructors ---

export function createBranchFolder(
  branchIndex: number,
  branchLabel: string,
  count: number,
): HTMLDivElement {
  const folder = document.createElement('div')
  folder.className = 'branch-folder'
  folder.dataset.branchIndex = String(branchIndex)

  const header = document.createElement('button')
  header.type = 'button'
  header.className = 'branch-folder-header'

  const arrow = document.createElement('span')
  arrow.className = 'branch-folder-arrow'
  arrow.textContent = '▼'

  const label = document.createElement('span')
  label.className = 'branch-folder-label'
  label.textContent = branchLabel

  const countEl = document.createElement('span')
  countEl.className = 'branch-folder-count'
  countEl.textContent = `(${count})`

  header.append(arrow, label, countEl)
  folder.append(header)

  header.addEventListener('click', () => {
    folder.classList.toggle('is-collapsed')
  })

  return folder
}

export function createTwigFolder(twigId: string, twigLabel: string, count: number): HTMLDivElement {
  const folder = document.createElement('div')
  folder.className = 'twig-folder'
  folder.dataset.twigId = twigId

  const header = document.createElement('button')
  header.type = 'button'
  header.className = 'twig-folder-header'

  const arrow = document.createElement('span')
  arrow.className = 'twig-folder-arrow'
  arrow.textContent = '▼'

  const label = document.createElement('span')
  label.className = 'twig-folder-label'
  label.textContent = twigLabel

  const countEl = document.createElement('span')
  countEl.className = 'twig-folder-count'
  countEl.textContent = `(${count})`

  header.append(arrow, label, countEl)
  folder.append(header)

  header.addEventListener('click', () => {
    folder.classList.toggle('is-collapsed')
  })

  return folder
}

export function createStackedLeafCard(
  leafName: string,
  sprouts: SproutWithLocation[],
  onWaterClick?: (sprout: SproutWithLocation) => void,
  onHarvestClick?: SidebarHarvestCallback,
): HTMLDivElement {
  const card = document.createElement('div')
  card.className = 'sidebar-stacked-card'

  const header = document.createElement('button')
  header.type = 'button'
  header.className = 'sidebar-stacked-header'

  const arrow = document.createElement('span')
  arrow.className = 'sidebar-stacked-arrow'
  arrow.textContent = '▼'

  const headerLabel = document.createElement('span')
  headerLabel.textContent = leafName

  header.append(arrow, headerLabel)
  header.addEventListener('click', () => {
    card.classList.toggle('is-collapsed')
  })
  card.append(header)

  const rows = document.createElement('div')
  rows.className = 'sidebar-stacked-rows'

  sprouts.forEach((sprout) => {
    const row = document.createElement('div')
    row.className = 'sidebar-stacked-row'

    const title = document.createElement('span')
    title.className = 'sidebar-stacked-title'
    title.textContent = sprout.title || 'Untitled'

    const isReady = sprout.endDate ? new Date(sprout.endDate) <= new Date() : false
    if (isReady) {
      row.classList.add('is-ready')
    }

    if (isReady && onHarvestClick) {
      const harvestBtn = document.createElement('button')
      harvestBtn.type = 'button'
      harvestBtn.className =
        'action-btn action-btn-progress action-btn-harvest sidebar-stacked-action'
      harvestBtn.textContent = 'harvest'
      harvestBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        onHarvestClick(sprout)
      })
      row.append(title, harvestBtn)
    } else if (onWaterClick) {
      const wateredToday = checkSproutWateredToday(sprout.id)
      if (wateredToday) {
        const badge = document.createElement('span')
        badge.className = 'action-btn action-btn-progress sidebar-stacked-action is-watered-badge'
        badge.textContent = 'watered'
        row.append(title, badge)
      } else {
        const waterBtn = document.createElement('button')
        waterBtn.type = 'button'
        waterBtn.className =
          'action-btn action-btn-progress action-btn-water sidebar-stacked-action'
        waterBtn.textContent = 'water'
        waterBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          onWaterClick(sprout)
        })
        row.append(title, waterBtn)
      }
    } else {
      row.append(title)
    }

    const meta = document.createElement('span')
    meta.className = 'sidebar-stacked-meta'
    meta.textContent = sprout.endDate ? formatEndDate(sprout.endDate) : sprout.season
    row.append(meta)

    rows.append(row)
  })

  card.append(rows)
  return card
}

export function renderLeafGroupedSprouts(
  state: DerivedState,
  sprouts: SproutWithLocation[],
  container: HTMLElement,
  isActive: boolean,
  onWaterClick?: (sprout: SproutWithLocation) => void,
  onHarvestClick?: SidebarHarvestCallback,
): void {
  const { standalone, byLeaf } = groupByLeaf(sprouts)

  byLeaf.forEach((leafSprouts, leafId) => {
    const twigId = leafSprouts[0]?.twigId
    if (!twigId) return
    const leaf = getLeafById(state, leafId)
    const leafName = leaf?.name || 'Unnamed Leaf'
    const card = createStackedLeafCard(
      leafName,
      leafSprouts,
      isActive ? onWaterClick : undefined,
      isActive ? onHarvestClick : undefined,
    )
    container.append(card)
  })

  if (standalone.length > 0) {
    console.warn(
      `[progress-panel] ${standalone.length} sprout(s) without leafId — this should not happen`,
    )
  }
}
