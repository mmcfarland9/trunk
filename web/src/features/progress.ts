/**
 * Progress orchestration.
 * Manages sidebar sprout display and scoped progress bar.
 * DOM construction delegated to ui/progress-panel.ts.
 */

import type { AppContext } from '../types'
import { TWIG_COUNT } from '../constants'
import {
  getHoveredBranchIndex,
  getHoveredTwigId,
  getActiveBranchIndex,
  getActiveTwigId,
  getViewMode,
  getPresetLabel,
} from '../state'
import type { DerivedState } from '../events'
import {
  getState,
  toSprout,
  getActiveSprouts as getActiveDerivedSprouts,
  getCompletedSprouts,
} from '../events'
import {
  createBranchFolder,
  createTwigFolder,
  renderLeafGroupedSprouts,
  getTwigLabel,
  getBranchLabel,
} from '../ui/progress-panel'
import type { SproutWithLocation, SidebarHarvestCallback } from '../ui/progress-panel'

export function updateStats(ctx: AppContext): void {
  updateScopedProgress(ctx) // Also handles back-to-trunk button visibility
  updateSidebarSprouts(ctx)
}

function countActiveSproutsForTwigs(twigs: HTMLButtonElement[]): number {
  const state = getState()
  return twigs.reduce((sum, twig) => {
    const nodeId = twig.dataset.nodeId || ''
    return sum + (state.activeSproutsByTwig.get(nodeId)?.length ?? 0)
  }, 0)
}

export function updateScopedProgress(ctx: AppContext): void {
  const { progressCount, progressFill, backToTrunkButton, backToBranchButton } = ctx.elements
  const { branchGroups } = ctx
  const viewMode = getViewMode()
  const hoveredIndex = getHoveredBranchIndex()

  // In branch view OR when hovering a branch, show scoped progress for that branch
  const activeBranchIndex = viewMode === 'branch' ? getActiveBranchIndex() : hoveredIndex

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
    0,
  )
  const activeSprouts = branchGroups.reduce(
    (sum, bg) => sum + countActiveSproutsForTwigs(bg.twigs),
    0,
  )

  progressCount.innerHTML = `${filledBranches} of ${branchGroups.length} branches filled<br>${filledTwigs} of ${totalTwigs} twigs filled<br>${activeSprouts} growing sprouts`
  const progress = totalTwigs ? Math.round((filledTwigs / totalTwigs) * 100) : 0
  progressFill.style.width = `${progress}%`
}

// --- Sidebar Sprout Sections ---

// Store callbacks so they persist across updateSidebarSprouts calls
let storedWaterClick: ((sprout: SproutWithLocation) => void) | undefined
let storedHarvestClick: SidebarHarvestCallback | undefined

function parseBranchIndex(twigId: string): number {
  // Parse "branch-X-twig-Y" to get X
  const match = twigId.match(/^branch-(\d+)-twig-\d+$/)
  return match ? parseInt(match[1], 10) : -1
}

function getAllSproutsFromState(state: DerivedState): {
  active: SproutWithLocation[]
  cultivated: SproutWithLocation[]
} {
  const active: SproutWithLocation[] = []
  const cultivated: SproutWithLocation[] = []

  // Get all sprouts from derived state
  getActiveDerivedSprouts(state).forEach((derived) => {
    const sprout = toSprout(derived)
    const twigLabel = getPresetLabel(derived.twigId) || derived.twigId
    const branchIndex = parseBranchIndex(derived.twigId)
    active.push({ ...sprout, twigId: derived.twigId, twigLabel, branchIndex })
  })

  getCompletedSprouts(state).forEach((derived) => {
    const sprout = toSprout(derived)
    const twigLabel = getPresetLabel(derived.twigId) || derived.twigId
    const branchIndex = parseBranchIndex(derived.twigId)
    cultivated.push({ ...sprout, twigId: derived.twigId, twigLabel, branchIndex })
  })

  return { active, cultivated }
}

function groupByBranch(sprouts: SproutWithLocation[]): Map<number, SproutWithLocation[]> {
  const grouped = new Map<number, SproutWithLocation[]>()
  sprouts.forEach((sprout) => {
    if (sprout.branchIndex < 0) return // Skip invalid
    const list = grouped.get(sprout.branchIndex) || []
    list.push(sprout)
    grouped.set(sprout.branchIndex, list)
  })
  return grouped
}

function groupByTwig(sprouts: SproutWithLocation[]): Map<string, SproutWithLocation[]> {
  const grouped = new Map<string, SproutWithLocation[]>()
  sprouts.forEach((sprout) => {
    const list = grouped.get(sprout.twigId) || []
    list.push(sprout)
    grouped.set(sprout.twigId, list)
  })
  return grouped
}

export function initSidebarSprouts(
  ctx: AppContext,
  onWaterClick?: (sprout: SproutWithLocation) => void,
  onHarvestClick?: SidebarHarvestCallback,
): void {
  const { activeSproutsToggle, cultivatedSproutsToggle, activeSproutsList, cultivatedSproutsList } =
    ctx.elements

  // Store callbacks for future updates
  storedWaterClick = onWaterClick
  storedHarvestClick = onHarvestClick

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
  const { activeSproutsToggle, cultivatedSproutsToggle, activeSproutsList, cultivatedSproutsList } =
    ctx.elements
  const { branchGroups } = ctx
  const state = getState()
  const { active, cultivated } = getAllSproutsFromState(state)

  // Use stored callbacks
  const onWaterClick = storedWaterClick
  const onHarvestClick = storedHarvestClick

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
  const effectiveTwigId =
    viewMode === 'twig' ? activeTwigId : viewMode === 'branch' ? hoveredTwigId : null

  if (effectiveTwigId) {
    // Twig view OR hovering twig in branch view: only show sprouts from this twig
    filteredActive = active.filter((s) => s.twigId === effectiveTwigId)
    filteredCultivated = cultivated.filter((s) => s.twigId === effectiveTwigId)
  } else if (
    (viewMode === 'branch' && activeBranchIndex !== null) ||
    (viewMode === 'overview' && hoveredBranchIndex !== null)
  ) {
    // Branch view OR hovering a branch: only show sprouts from this branch
    const branchIdx = effectiveBranchIndex!
    filteredActive = active.filter((s) => s.branchIndex === branchIdx)
    filteredCultivated = cultivated.filter((s) => s.branchIndex === branchIdx)
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
    // Twig view OR hovering twig: group by leaf
    renderLeafGroupedSprouts(
      state,
      filteredActive,
      activeSproutsList,
      true,
      onWaterClick,
      onHarvestClick,
    )
    renderLeafGroupedSprouts(state, filteredCultivated, cultivatedSproutsList, false)
  } else if (showTwigGrouping && branchIdxForTwigFolders !== null) {
    // Branch view OR hovering branch: group by twig, then by leaf within each twig
    const activeByTwig = groupByTwig(filteredActive)
    const cultivatedByTwig = groupByTwig(filteredCultivated)

    activeByTwig.forEach((sprouts, twigId) => {
      const twigLabel = getTwigLabel(twigId)
      const folder = createTwigFolder(twigId, twigLabel, sprouts.length)
      renderLeafGroupedSprouts(state, sprouts, folder, true, onWaterClick, onHarvestClick)
      activeSproutsList.append(folder)
    })

    cultivatedByTwig.forEach((sprouts, twigId) => {
      const twigLabel = getTwigLabel(twigId)
      const folder = createTwigFolder(twigId, twigLabel, sprouts.length)
      renderLeafGroupedSprouts(state, sprouts, folder, false)
      cultivatedSproutsList.append(folder)
    })
  } else {
    // Overview (not hovering): group by branch > twig > leaf
    const activeByBranch = groupByBranch(filteredActive)
    const cultivatedByBranch = groupByBranch(filteredCultivated)

    activeByBranch.forEach((branchSprouts, branchIndex) => {
      const branchLabel = getBranchLabel(branchGroups[branchIndex]?.branch, branchIndex)
      const branchFolder = createBranchFolder(branchIndex, branchLabel, branchSprouts.length)

      // Group by twig within this branch
      const byTwig = groupByTwig(branchSprouts)
      byTwig.forEach((twigSprouts, twigId) => {
        const twigLabel = getTwigLabel(twigId)
        const twigFolder = createTwigFolder(twigId, twigLabel, twigSprouts.length)
        renderLeafGroupedSprouts(state, twigSprouts, twigFolder, true, onWaterClick, onHarvestClick)
        branchFolder.append(twigFolder)
      })

      activeSproutsList.append(branchFolder)
    })

    cultivatedByBranch.forEach((branchSprouts, branchIndex) => {
      const branchLabel = getBranchLabel(branchGroups[branchIndex]?.branch, branchIndex)
      const branchFolder = createBranchFolder(branchIndex, branchLabel, branchSprouts.length)

      // Group by twig within this branch
      const byTwig = groupByTwig(branchSprouts)
      byTwig.forEach((twigSprouts, twigId) => {
        const twigLabel = getTwigLabel(twigId)
        const twigFolder = createTwigFolder(twigId, twigLabel, twigSprouts.length)
        renderLeafGroupedSprouts(state, twigSprouts, twigFolder, false)
        branchFolder.append(twigFolder)
      })

      cultivatedSproutsList.append(branchFolder)
    })
  }
}
