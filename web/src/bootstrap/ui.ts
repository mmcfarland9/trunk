import type { AppContext, AppElements } from '../types'
import { setEventStoreErrorCallbacks, getState } from '../events/store'
import {
  getSoilAvailable,
  getSoilCapacity,
  getWaterAvailable,
  getPresetLabel,
  setViewModeState,
  getActiveBranchIndex,
  getActiveTwigId,
} from '../state'
import constants from '../../../shared/constants.json'
import { updateFocus, setFocusedNode } from '../ui/node-ui'
import { buildTwigView } from '../ui/twig-view'
import { buildLeafView } from '../ui/leaf-view'
import { updateStats, initSidebarSprouts } from '../features/progress'
import { initWaterDialog } from '../features/water-dialog'
import { initHarvestDialog } from '../features/harvest-dialog'
import { initShine } from '../features/shine-dialog'
import { initSunLogDialog, initSoilBagDialog, initWaterCanDialog } from '../features/log-dialogs'
import { initAccountDialog } from '../features/account-dialog'
import { buildSoilChart } from '../ui/soil-chart'
import { buildRadarChart } from '../ui/radar-chart'
import {
  returnToBranchView,
  enterBranchView,
  returnToOverview,
  enterTwigView,
} from '../features/navigation'

export type NavCallbacks = {
  onPositionNodes: () => void
  onUpdateStats: () => void
}

export type DialogAPIs = {
  waterDialog: {
    isOpen: () => boolean
    close: () => void
    open: () => void
  }
  harvestDialog: {
    isOpen: () => boolean
    close: () => void
    openReady: () => boolean
  }
  sunLog: {
    isOpen: () => boolean
    close: () => void
    open: () => void
  }
  soilBag: {
    isOpen: () => boolean
    close: () => void
  }
  waterCan: {
    isOpen: () => boolean
    close: () => void
  }
  account: {
    isOpen: () => boolean
    close: () => void
  }
  shine: {
    updateSunMeter: () => void
  }
  charts: {
    updateRadar: () => void
    updateSoil: () => void
  }
}

// Soil meter update function
function updateSoilMeter(elements: AppElements): void {
  const available = getSoilAvailable()
  const capacity = getSoilCapacity()
  const pct = capacity > 0 ? (available / capacity) * 100 : 0
  elements.soilMeterFill.style.width = `${pct}%`
  elements.soilMeterValue.textContent = `${available.toFixed(2)}/${capacity.toFixed(2)}`
}

// Water meter update function - toggle circle fill states
function updateWaterMeter(elements: AppElements): void {
  const available = getWaterAvailable()
  elements.waterCircles.forEach((circle: HTMLElement, i: number) => {
    circle.classList.toggle('is-filled', i < available)
  })
}

// Celebration animation — brief pulse on meter after action
function celebrateMeter(meter: HTMLElement): void {
  meter.classList.remove('is-celebrating')
  void meter.offsetWidth
  meter.classList.add('is-celebrating')
  meter.addEventListener(
    'animationend',
    () => {
      meter.classList.remove('is-celebrating')
    },
    { once: true },
  )
}

export function initializeUI(ctx: AppContext, navCallbacks: NavCallbacks): DialogAPIs {
  // Set up storage error callbacks
  setEventStoreErrorCallbacks(
    () => {},
    () => {},
  )

  // Initialize dialogs
  const waterDialogApi = initWaterDialog(ctx, {
    onWaterMeterChange: () => updateWaterMeter(ctx.elements),
    onSoilMeterChange: () => updateSoilMeter(ctx.elements),
    onWaterComplete: () => {
      navCallbacks.onUpdateStats()
      ctx.twigView?.refresh()
      celebrateMeter(ctx.elements.waterMeter)
      celebrateMeter(ctx.elements.soilMeter)
      soilChart.update()
      radarChart.update()
    },
    getActiveSprouts: () => {
      const state = getState()
      return [...state.sprouts.values()]
        .filter((s) => s.state === 'active')
        .map((s) => ({ id: s.id, title: s.title, waterEntries: s.waterEntries }))
    },
  })

  const harvestDialogApi = initHarvestDialog(ctx, {
    onSoilMeterChange: () => updateSoilMeter(ctx.elements),
    onHarvestComplete: () => {
      navCallbacks.onUpdateStats()
      celebrateMeter(ctx.elements.soilMeter)
      soilChart.update()
      radarChart.update()
    },
  })

  // Late-binding container for sun log populate function
  let sunLogPopulate: (() => void) | null = null

  const shineApi = initShine(ctx, {
    onSunMeterChange: () => shineApi.updateSunMeter(),
    onSoilMeterChange: () => updateSoilMeter(ctx.elements),
    onShineComplete: () => {
      sunLogPopulate?.()
      celebrateMeter(ctx.elements.sunMeter)
      celebrateMeter(ctx.elements.soilMeter)
      soilChart.update()
      radarChart.update()
    },
  })

  // Initialize log dialogs
  const sunLogApi = initSunLogDialog(ctx.elements, {
    onPopulateSunLogShine: () => shineApi.populateSunLogShine(),
  })
  sunLogPopulate = sunLogApi.populate

  const soilBagApi = initSoilBagDialog(ctx.elements)
  const waterCanApi = initWaterCanDialog(ctx.elements)
  const accountApi = initAccountDialog(ctx.elements)

  // Build views
  const mapPanel = ctx.elements.canvas.parentElement as HTMLElement
  const twigView = buildTwigView(mapPanel, {
    onClose: () => returnToBranchView(ctx, navCallbacks),
    onSave: navCallbacks.onUpdateStats,
    onSoilChange: () => {
      updateSoilMeter(ctx.elements)
      soilChart.update()
      radarChart.update()
    },
    onOpenLeaf: (leafId, twigId, branchIndex) => {
      setViewModeState('leaf', branchIndex, twigId)
      ctx.leafView?.open(leafId, twigId, branchIndex)
    },
    onNavigate: (direction) => {
      const activeBranchIndex = getActiveBranchIndex()
      const activeTwigId = getActiveTwigId()
      if (activeBranchIndex === null || !activeTwigId) return null

      const branchGroup = ctx.branchGroups[activeBranchIndex]
      if (!branchGroup) return null

      const currentIndex = branchGroup.twigs.findIndex((t) => t.dataset.nodeId === activeTwigId)
      if (currentIndex === -1) return null

      const newIndex =
        direction === 'prev'
          ? (currentIndex - 1 + branchGroup.twigs.length) % branchGroup.twigs.length
          : (currentIndex + 1) % branchGroup.twigs.length

      const newTwig = branchGroup.twigs[newIndex]
      if (newTwig) {
        const newTwigId = newTwig.dataset.nodeId
        if (newTwigId) {
          setViewModeState('twig', activeBranchIndex, newTwigId)
          setFocusedNode(newTwig, ctx, (target) => updateFocus(target, ctx))
        }
      }
      return newTwig ?? null
    },
    onWaterClick: (sprout) => waterDialogApi.openWaterDialog(sprout),
    onHarvestClick: (sprout) => harvestDialogApi.openHarvestDialog(sprout),
  })

  const leafView = buildLeafView(mapPanel, {
    onClose: () => {
      leafView.close()
      // Return to twig view
      const activeBranchIndex = getActiveBranchIndex()
      const activeTwigId = getActiveTwigId()
      if (activeBranchIndex !== null && activeTwigId) {
        const twig = ctx.nodeLookup.get(activeTwigId)
        if (twig) {
          setViewModeState('twig', activeBranchIndex, activeTwigId)
          ctx.twigView?.open(twig)
        }
      }
      navCallbacks.onUpdateStats()
    },
    onSave: navCallbacks.onUpdateStats,
    onSoilChange: () => {
      updateSoilMeter(ctx.elements)
      soilChart.update()
      radarChart.update()
    },
  })

  // Complete the context with twig and leaf views
  ctx.twigView = twigView
  ctx.leafView = leafView

  // Button event listeners
  ctx.elements.backToTrunkButton.addEventListener('click', () => {
    returnToOverview(ctx, navCallbacks)
  })

  ctx.elements.backToBranchButton.addEventListener('click', () => {
    returnToBranchView(ctx, navCallbacks)
  })

  // Initialize sidebar sprout sections with branch hover/click callbacks
  initSidebarSprouts(
    ctx,
    (sprout) => waterDialogApi.openWaterDialog(sprout),
    {
      onClick: (index) => enterBranchView(index, ctx, navCallbacks),
    },
    (twigId, branchIndex) => {
      // Navigate to twig view
      const twig = ctx.nodeLookup.get(twigId)
      if (twig) {
        enterTwigView(twig, branchIndex, ctx, navCallbacks)
      }
    },
    (leafId, twigId, branchIndex) => {
      // Navigate to leaf view
      const twig = ctx.nodeLookup.get(twigId)
      if (twig) {
        // Enter twig view first, then open leaf view
        enterTwigView(twig, branchIndex, ctx, navCallbacks)
        setViewModeState('leaf', branchIndex, twigId)
        ctx.leafView?.open(leafId, twigId, branchIndex)
      }
    },
    (sprout) => {
      // Open harvest dialog
      harvestDialogApi.openHarvestDialog({
        id: sprout.id,
        title: sprout.title,
        twigId: sprout.twigId,
        twigLabel: sprout.twigLabel,
        season: sprout.season,
        environment: sprout.environment,
        soilCost: sprout.soilCost,
        bloomWither: sprout.bloomWither,
        bloomBudding: sprout.bloomBudding,
        bloomFlourish: sprout.bloomFlourish,
      })
    },
  )

  // Soil chart
  const soilChart = buildSoilChart()
  ctx.elements.soilChartSection.appendChild(soilChart.container)

  // Radar chart — SVG overlay on the tree canvas
  const radarChart = buildRadarChart()
  ctx.elements.canvas.appendChild(radarChart.svg)
  ctx.radarTick = radarChart.tick

  // Initial view setup
  updateStats(ctx)
  updateFocus(null, ctx)
  updateSoilMeter(ctx.elements)
  updateWaterMeter(ctx.elements)
  shineApi.updateSunMeter()

  return {
    waterDialog: {
      isOpen: () => waterDialogApi.isOpen(),
      close: () => waterDialogApi.closeWaterDialog(),
      open: () => waterDialogApi.openWaterDialog(),
    },
    harvestDialog: {
      isOpen: () => harvestDialogApi.isOpen(),
      close: () => harvestDialogApi.closeHarvestDialog(),
      openReady: () => {
        const state = getState()
        const now = Date.now()
        const ready = [...state.sprouts.values()]
          .filter((s) => s.state === 'active')
          .find((s) => {
            const durationMs = constants.seasons[s.season].durationMs
            return new Date(s.plantedAt).getTime() + durationMs <= now
          })
        if (!ready) return false
        harvestDialogApi.openHarvestDialog({
          id: ready.id,
          title: ready.title,
          twigId: ready.twigId,
          twigLabel: getPresetLabel(ready.twigId) || '',
          season: ready.season,
          environment: ready.environment,
          soilCost: ready.soilCost,
          bloomWither: ready.bloomWither,
          bloomBudding: ready.bloomBudding,
          bloomFlourish: ready.bloomFlourish,
        })
        return true
      },
    },
    sunLog: {
      isOpen: () => sunLogApi.isOpen(),
      close: () => sunLogApi.close(),
      open: () => sunLogApi.open(),
    },
    soilBag: {
      isOpen: () => soilBagApi.isOpen(),
      close: () => soilBagApi.close(),
    },
    waterCan: {
      isOpen: () => waterCanApi.isOpen(),
      close: () => waterCanApi.close(),
    },
    account: {
      isOpen: () => accountApi.isOpen(),
      close: () => accountApi.close(),
    },
    shine: {
      updateSunMeter: () => shineApi.updateSunMeter(),
    },
    charts: {
      updateRadar: () => radarChart.update(),
      updateSoil: () => soilChart.update(),
    },
  }
}

export { updateSoilMeter, updateWaterMeter, celebrateMeter }
