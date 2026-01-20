import type { AppContext, Sprout } from '../types'
import { TWIG_COUNT } from '../constants'
import { nodeState, getHoveredBranchIndex, getHoveredTwigId, getActiveBranchIndex, getActiveTwigId, getViewMode, getActiveSprouts, getHistorySprouts, getDebugDate, getPresetLabel, getSoilRecoveryRate, wasWateredThisWeek, getLeafById } from '../state'

export function updateStats(ctx: AppContext): void {
  updateScopedProgress(ctx) // Also handles back-to-trunk button visibility
  updateSidebarSprouts(ctx)
}

function countActiveSproutsForTwigs(twigs: HTMLButtonElement[]): number {
  return twigs.reduce((sum, twig) => {
    const data = nodeState[twig.dataset.nodeId || '']
    const sprouts = data?.sprouts || []
    return sum + getActiveSprouts(sprouts).length
  }, 0)
}

export function updateScopedProgress(ctx: AppContext): void {
  const { progressCount, progressFill, backToTrunkButton, backToBranchButton } = ctx.elements
  const { branchGroups } = ctx
  const viewMode = getViewMode()
  const hoveredIndex = getHoveredBranchIndex()

  // In branch view OR when hovering a branch, show scoped progress for that branch
  const activeBranchIndex = viewMode === 'branch'
    ? getActiveBranchIndex()
    : hoveredIndex

  // Show "Back to trunk" only in actual branch view (not when hovering or in twig view)
  backToTrunkButton.style.display = viewMode === 'branch' ? '' : 'none'
  // Show "Back to branch" only in twig view
  backToBranchButton.style.display = viewMode === 'twig' ? '' : 'none'

  if (activeBranchIndex !== null) {
    const branchGroup = branchGroups[activeBranchIndex]
    if (branchGroup) {
      const filledTwigs = branchGroup.twigs.filter((twig) => twig.dataset.filled === 'true').length
      const activeSprouts = countActiveSproutsForTwigs(branchGroup.twigs)

      progressCount.innerHTML = `<br>${filledTwigs} of ${TWIG_COUNT} twigs filled<br>${activeSprouts} growing sprouts`
      const progress = Math.round((filledTwigs / TWIG_COUNT) * 100)
      progressFill.style.width = `${progress}%`
      return
    }
  }

  // In overview: show all three counts
  const filledBranches = branchGroups.filter((bg) => bg.branch.dataset.filled === 'true').length
  const totalTwigs = branchGroups.reduce((sum, bg) => sum + bg.twigs.length, 0)
  const filledTwigs = branchGroups.reduce(
    (sum, bg) => sum + bg.twigs.filter((twig) => twig.dataset.filled === 'true').length,
    0
  )
  const activeSprouts = branchGroups.reduce(
    (sum, bg) => sum + countActiveSproutsForTwigs(bg.twigs),
    0
  )

  progressCount.innerHTML = `${filledBranches} of ${branchGroups.length} branches filled<br>${filledTwigs} of ${totalTwigs} twigs filled<br>${activeSprouts} growing sprouts`
  const progress = totalTwigs ? Math.round((filledTwigs / totalTwigs) * 100) : 0
  progressFill.style.width = `${progress}%`
}

// --- Sidebar Sprout Sections ---

type SproutWithLocation = Sprout & { twigId: string, twigLabel: string, branchIndex: number }

export type SidebarBranchCallbacks = {
  onClick: (index: number) => void
}

export type SidebarTwigCallback = (twigId: string, branchIndex: number) => void
export type SidebarLeafCallback = (leafId: string, twigId: string, branchIndex: number) => void

// Store callbacks so they persist across updateSidebarSprouts calls
let storedWaterClick: ((sprout: SproutWithLocation) => void) | undefined
let storedBranchCallbacks: SidebarBranchCallbacks | undefined
let storedTwigClick: SidebarTwigCallback | undefined
let storedLeafClick: SidebarLeafCallback | undefined

function parseBranchIndex(twigId: string): number {
  // Parse "branch-X-twig-Y" to get X
  const match = twigId.match(/^branch-(\d+)-twig-\d+$/)
  return match ? parseInt(match[1], 10) : -1
}

function formatEndDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = getDebugDate()

  // If on or past due date, show READY
  if (date <= now) {
    return 'READY'
  }

  // Format as MM/DD/YY
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = String(date.getFullYear()).slice(-2)
  return `${month}/${day}/${year}`
}

function getAllSproutsFromState(): { active: SproutWithLocation[], cultivated: SproutWithLocation[] } {
  const active: SproutWithLocation[] = []
  const cultivated: SproutWithLocation[] = []

  Object.entries(nodeState).forEach(([nodeId, data]) => {
    if (!data.sprouts) return
    const twigLabel = getPresetLabel(nodeId) || nodeId
    const branchIndex = parseBranchIndex(nodeId)

    getActiveSprouts(data.sprouts).forEach(s => {
      active.push({ ...s, twigId: nodeId, twigLabel, branchIndex })
    })
    getHistorySprouts(data.sprouts).forEach(s => {
      cultivated.push({ ...s, twigId: nodeId, twigLabel, branchIndex })
    })
  })

  return { active, cultivated }
}

function groupByBranch(sprouts: SproutWithLocation[]): Map<number, SproutWithLocation[]> {
  const grouped = new Map<number, SproutWithLocation[]>()
  sprouts.forEach(sprout => {
    if (sprout.branchIndex < 0) return // Skip invalid
    const list = grouped.get(sprout.branchIndex) || []
    list.push(sprout)
    grouped.set(sprout.branchIndex, list)
  })
  return grouped
}

function groupByTwig(sprouts: SproutWithLocation[]): Map<string, SproutWithLocation[]> {
  const grouped = new Map<string, SproutWithLocation[]>()
  sprouts.forEach(sprout => {
    const list = grouped.get(sprout.twigId) || []
    list.push(sprout)
    grouped.set(sprout.twigId, list)
  })
  return grouped
}

function groupByLeaf(sprouts: SproutWithLocation[]): { standalone: SproutWithLocation[], byLeaf: Map<string, SproutWithLocation[]> } {
  const standalone: SproutWithLocation[] = []
  const byLeaf = new Map<string, SproutWithLocation[]>()

  sprouts.forEach(sprout => {
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

function getTwigLabel(twigId: string): string {
  const presetLabel = getPresetLabel(twigId)
  if (presetLabel) {
    return presetLabel
  }
  // Fallback: parse twig number from ID like "branch-0-twig-3"
  const match = twigId.match(/twig-(\d+)$/)
  return match ? `Twig ${parseInt(match[1], 10) + 1}` : twigId
}

export function initSidebarSprouts(
  ctx: AppContext,
  onWaterClick?: (sprout: SproutWithLocation) => void,
  branchCallbacks?: SidebarBranchCallbacks,
  onTwigClick?: SidebarTwigCallback,
  onLeafClick?: SidebarLeafCallback
): void {
  const { activeSproutsToggle, cultivatedSproutsToggle, activeSproutsList, cultivatedSproutsList } = ctx.elements

  // Store callbacks for future updates
  storedWaterClick = onWaterClick
  storedBranchCallbacks = branchCallbacks
  storedTwigClick = onTwigClick
  storedLeafClick = onLeafClick

  // Set default states: Both sections expanded
  activeSproutsToggle.classList.add('is-expanded')
  activeSproutsList.classList.remove('is-collapsed')
  cultivatedSproutsToggle.classList.add('is-expanded')
  cultivatedSproutsList.classList.remove('is-collapsed')

  // Set up collapsible toggles
  activeSproutsToggle.addEventListener('click', () => {
    const isExpanded = activeSproutsToggle.classList.toggle('is-expanded')
    activeSproutsList.classList.toggle('is-collapsed', !isExpanded)
  })

  cultivatedSproutsToggle.addEventListener('click', () => {
    const isExpanded = cultivatedSproutsToggle.classList.toggle('is-expanded')
    cultivatedSproutsList.classList.toggle('is-collapsed', !isExpanded)
  })

  // Initial render
  updateSidebarSprouts(ctx)
}

export function updateSidebarSprouts(ctx: AppContext): void {
  const { activeSproutsToggle, cultivatedSproutsToggle, activeSproutsList, cultivatedSproutsList } = ctx.elements
  const { branchGroups } = ctx
  const { active, cultivated } = getAllSproutsFromState()

  // Use stored callbacks
  const onWaterClick = storedWaterClick
  const branchCallbacks = storedBranchCallbacks
  const onTwigClick = storedTwigClick
  const onLeafClick = storedLeafClick

  const viewMode = getViewMode()
  const activeBranchIndex = getActiveBranchIndex()
  const activeTwigId = getActiveTwigId()
  const hoveredBranchIndex = getHoveredBranchIndex()
  const hoveredTwigId = getHoveredTwigId()

  // Filter based on current view or hover state
  let filteredActive = active
  let filteredCultivated = cultivated
  // Effective branch index: hovered (in overview) or active (in branch view)
  const effectiveBranchIndex = viewMode === 'overview' ? hoveredBranchIndex : activeBranchIndex
  // Effective twig: active (in twig view) or hovered (in branch view)
  const effectiveTwigId = viewMode === 'twig' ? activeTwigId : (viewMode === 'branch' ? hoveredTwigId : null)

  if (effectiveTwigId) {
    // Twig view OR hovering twig in branch view: only show sprouts from this twig
    filteredActive = active.filter(s => s.twigId === effectiveTwigId)
    filteredCultivated = cultivated.filter(s => s.twigId === effectiveTwigId)
  } else if ((viewMode === 'branch' && activeBranchIndex !== null) || (viewMode === 'overview' && hoveredBranchIndex !== null)) {
    // Branch view OR hovering a branch: only show sprouts from this branch
    const branchIdx = effectiveBranchIndex!
    filteredActive = active.filter(s => s.branchIndex === branchIdx)
    filteredCultivated = cultivated.filter(s => s.branchIndex === branchIdx)
  }

  // Update counts
  const activeCount = activeSproutsToggle.querySelector('.sprouts-toggle-count')
  const cultivatedCount = cultivatedSproutsToggle.querySelector('.sprouts-toggle-count')
  if (activeCount) activeCount.textContent = `(${filteredActive.length})`
  if (cultivatedCount) cultivatedCount.textContent = `(${filteredCultivated.length})`

  activeSproutsList.replaceChildren()
  cultivatedSproutsList.replaceChildren()

  // Determine display mode: twig view (or hovering twig), branch view (or hovering branch), or overview
  const isHoveringBranch = viewMode === 'overview' && hoveredBranchIndex !== null
  const isHoveringTwig = viewMode === 'branch' && hoveredTwigId !== null
  const showFlatList = viewMode === 'twig' || isHoveringTwig
  const showTwigGrouping = (viewMode === 'branch' && !isHoveringTwig) || isHoveringBranch
  const branchIdxForTwigFolders = isHoveringBranch ? hoveredBranchIndex : activeBranchIndex

  if (showFlatList) {
    // Twig view OR hovering twig: group active by leaf, show standalone separately
    const { standalone, byLeaf } = groupByLeaf(filteredActive)

    // Render leaf groups (stacked if multiple sprouts)
    byLeaf.forEach((sprouts, leafId) => {
      const twigId = sprouts[0]?.twigId
      if (!twigId) return
      const leaf = getLeafById(twigId, leafId)
      const leafName = leaf?.name || 'Unnamed Leaf'

      if (sprouts.length === 1) {
        // Single sprout in leaf: render normally
        const item = createSproutItem(sprouts[0], true, onWaterClick, onTwigClick, onLeafClick)
        activeSproutsList.append(item)
      } else {
        // Multiple sprouts: render stacked card
        const card = createStackedLeafCard(leafName, leafId, sprouts, onWaterClick, onLeafClick)
        activeSproutsList.append(card)
      }
    })

    // Render standalone sprouts
    standalone.forEach(sprout => {
      const item = createSproutItem(sprout, true, onWaterClick, onTwigClick, onLeafClick)
      activeSproutsList.append(item)
    })

    // Cultivated stays flat (historical)
    filteredCultivated.forEach(sprout => {
      const item = createSproutItem(sprout, false, undefined, onTwigClick, onLeafClick)
      cultivatedSproutsList.append(item)
    })
  } else if (showTwigGrouping && branchIdxForTwigFolders !== null) {
    // Branch view OR hovering branch: group by twig
    const activeByTwig = groupByTwig(filteredActive)
    const cultivatedByTwig = groupByTwig(filteredCultivated)

    activeByTwig.forEach((sprouts, twigId) => {
      const twigLabel = getTwigLabel(twigId)
      const folder = createTwigFolder(twigId, twigLabel, sprouts.length, onTwigClick, branchIdxForTwigFolders)
      sprouts.forEach(sprout => {
        const item = createSproutItem(sprout, true, onWaterClick, onTwigClick, onLeafClick)
        folder.append(item)
      })
      activeSproutsList.append(folder)
    })

    cultivatedByTwig.forEach((sprouts, twigId) => {
      const twigLabel = getTwigLabel(twigId)
      const folder = createTwigFolder(twigId, twigLabel, sprouts.length, onTwigClick, branchIdxForTwigFolders)
      sprouts.forEach(sprout => {
        const item = createSproutItem(sprout, false, undefined, onTwigClick, onLeafClick)
        folder.append(item)
      })
      cultivatedSproutsList.append(folder)
    })
  } else {
    // Overview (not hovering): group by branch
    const activeByBranch = groupByBranch(filteredActive)
    const cultivatedByBranch = groupByBranch(filteredCultivated)

    activeByBranch.forEach((sprouts, branchIndex) => {
      const branchLabel = getBranchLabel(branchGroups[branchIndex]?.branch, branchIndex)
      const folder = createBranchFolder(branchIndex, branchLabel, sprouts.length, branchCallbacks)
      sprouts.forEach(sprout => {
        const item = createSproutItem(sprout, true, onWaterClick, onTwigClick, onLeafClick)
        folder.append(item)
      })
      activeSproutsList.append(folder)
    })

    cultivatedByBranch.forEach((sprouts, branchIndex) => {
      const branchLabel = getBranchLabel(branchGroups[branchIndex]?.branch, branchIndex)
      const folder = createBranchFolder(branchIndex, branchLabel, sprouts.length, branchCallbacks)
      sprouts.forEach(sprout => {
        const item = createSproutItem(sprout, false, undefined, onTwigClick, onLeafClick)
        folder.append(item)
      })
      cultivatedSproutsList.append(folder)
    })
  }
}

function createBranchFolder(
  branchIndex: number,
  branchLabel: string,
  count: number,
  callbacks?: SidebarBranchCallbacks
): HTMLDivElement {
  const folder = document.createElement('div')
  folder.className = 'branch-folder'
  folder.dataset.branchIndex = String(branchIndex)

  const header = document.createElement('button')
  header.type = 'button'
  header.className = 'branch-folder-header'

  const label = document.createElement('span')
  label.className = 'branch-folder-label'
  label.textContent = branchLabel

  const countEl = document.createElement('span')
  countEl.className = 'branch-folder-count'
  countEl.textContent = `(${count})`

  header.append(label, countEl)
  folder.append(header)

  // Click navigates to branch view
  if (callbacks) {
    header.addEventListener('click', () => callbacks.onClick(branchIndex))
  }

  return folder
}

function createTwigFolder(
  twigId: string,
  twigLabel: string,
  count: number,
  onTwigClick?: SidebarTwigCallback,
  branchIndex?: number
): HTMLDivElement {
  const folder = document.createElement('div')
  folder.className = 'twig-folder'
  folder.dataset.twigId = twigId

  const header = document.createElement('button')
  header.type = 'button'
  header.className = 'twig-folder-header'

  const label = document.createElement('span')
  label.className = 'twig-folder-label'
  label.textContent = twigLabel

  const countEl = document.createElement('span')
  countEl.className = 'twig-folder-count'
  countEl.textContent = `(${count})`

  header.append(label, countEl)
  folder.append(header)

  // Click navigates to twig view
  if (onTwigClick && branchIndex !== undefined) {
    header.addEventListener('click', () => onTwigClick(twigId, branchIndex))
  }

  return folder
}

function createStackedLeafCard(
  leafName: string,
  leafId: string,
  sprouts: SproutWithLocation[],
  onWaterClick?: (sprout: SproutWithLocation) => void,
  onLeafClick?: SidebarLeafCallback
): HTMLDivElement {
  const card = document.createElement('div')
  card.className = 'sidebar-stacked-card'

  // Leaf header (clickable to open leaf view)
  const header = document.createElement('button')
  header.type = 'button'
  header.className = 'sidebar-stacked-header'
  header.textContent = leafName
  if (onLeafClick && sprouts[0]) {
    header.addEventListener('click', () => {
      onLeafClick(leafId, sprouts[0].twigId, sprouts[0].branchIndex)
    })
  }
  card.append(header)

  // Sprout rows
  const rows = document.createElement('div')
  rows.className = 'sidebar-stacked-rows'

  sprouts.forEach(sprout => {
    const row = document.createElement('div')
    row.className = 'sidebar-stacked-row'

    const title = document.createElement('span')
    title.className = 'sidebar-stacked-title'
    title.textContent = sprout.title || 'Untitled'

    const meta = document.createElement('span')
    meta.className = 'sidebar-stacked-meta'
    const isReady = sprout.endDate ? new Date(sprout.endDate) <= getDebugDate() : false
    meta.textContent = sprout.endDate ? formatEndDate(sprout.endDate) : sprout.season

    row.append(title, meta)

    // Water button
    if (onWaterClick) {
      const watered = wasWateredThisWeek(sprout)
      const waterBtn = document.createElement('button')
      waterBtn.type = 'button'

      if (isReady) {
        waterBtn.className = 'action-btn action-btn-passive action-btn-twig sidebar-stacked-action'
        waterBtn.textContent = '🌾'
      } else if (watered) {
        waterBtn.className = 'action-btn action-btn-passive action-btn-water sidebar-stacked-action'
        waterBtn.textContent = '✓'
        waterBtn.disabled = true
      } else {
        waterBtn.className = 'action-btn action-btn-progress action-btn-water sidebar-stacked-action'
        waterBtn.textContent = 'water'
      }

      waterBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        onWaterClick(sprout)
      })
      row.append(waterBtn)
    }

    rows.append(row)
  })

  card.append(rows)
  return card
}

function createSproutItem(
  sprout: SproutWithLocation,
  isActive: boolean,
  onWaterClick?: (sprout: SproutWithLocation) => void,
  _onTwigClick?: SidebarTwigCallback,
  onLeafClick?: SidebarLeafCallback
): HTMLDivElement {
  const item = document.createElement('div')
  item.className = 'sprout-item'
  if (!isActive) {
    item.classList.add(sprout.state === 'completed' ? 'is-completed' : 'is-failed')
  }

  const info = document.createElement('div')
  info.className = 'sprout-item-info'

  // Make title clickable if sprout has a leaf
  if (sprout.leafId && onLeafClick) {
    const titleBtn = document.createElement('button')
    titleBtn.type = 'button'
    titleBtn.className = 'sprout-item-title sprout-item-title-link'
    titleBtn.textContent = sprout.title || 'Untitled'
    titleBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      onLeafClick(sprout.leafId!, sprout.twigId, sprout.branchIndex)
    })
    info.append(titleBtn)
  } else {
    const title = document.createElement('span')
    title.className = 'sprout-item-title'
    title.textContent = sprout.title || 'Untitled'
    info.append(title)
  }

  const meta = document.createElement('span')
  meta.className = 'sprout-item-meta'
  const endDateStr = sprout.endDate ? formatEndDate(sprout.endDate) : sprout.season

  meta.textContent = endDateStr

  info.append(meta)
  item.append(info)

  // Water/Harvest action for growing sprouts (appears on hover)
  if (isActive && onWaterClick) {
    const waterBtn = document.createElement('button')
    waterBtn.type = 'button'

    // Check if sprout is ready (on or past due date)
    const isReady = sprout.endDate ? new Date(sprout.endDate) <= getDebugDate() : false
    // Check if already watered this week (per-sprout weekly cooldown)
    const watered = wasWateredThisWeek(sprout)

    if (isReady) {
      waterBtn.className = 'action-btn action-btn-passive action-btn-twig sidebar-action-btn'
      waterBtn.textContent = 'Harvest'
    } else if (watered) {
      waterBtn.className = 'action-btn action-btn-passive action-btn-water sidebar-action-btn'
      waterBtn.textContent = 'Watered'
      waterBtn.disabled = true
    } else {
      waterBtn.className = 'action-btn action-btn-progress action-btn-water sidebar-action-btn'
      waterBtn.innerHTML = `Water <span class="btn-soil-gain">(+${getSoilRecoveryRate().toFixed(2)})</span>`
    }

    waterBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      onWaterClick(sprout)
    })
    item.append(waterBtn)
  }

  return item
}

export function getBranchLabel(branchNode: HTMLButtonElement, index: number): string {
  const defaultLabel = branchNode.dataset.defaultLabel || ''
  const stored = nodeState[branchNode.dataset.nodeId || '']
  const storedLabel = stored?.label?.trim() || ''
  if (storedLabel && storedLabel !== defaultLabel) {
    return storedLabel
  }
  return `Branch ${index + 1}`
}
