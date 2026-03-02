import type { AppContext } from '../types'
import type { NavCallbacks, DialogAPIs } from './ui'
import type { ChartOps } from './charts'
import { updateSoilMeter, updateWaterMeter, updateWaterStreak, celebrateMeter } from './meters'
import { getState } from '../events/store'
import { getPresetLabel, setViewModeState, getActiveBranchIndex, getActiveTwigId } from '../state'
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
import { returnToBranchView, returnToOverview } from '../features/navigation'
import { pushView, replaceView } from '../features/history'

export function initDialogs(
  ctx: AppContext,
  navCallbacks: NavCallbacks,
  charts: ChartOps,
): DialogAPIs {
  // Initialize dialogs
  const waterDialogApi = initWaterDialog(ctx, {
    onWaterMeterChange: () => updateWaterMeter(ctx.elements),
    onSoilMeterChange: () => updateSoilMeter(ctx.elements),
    onWaterComplete: () => {
      navCallbacks.onUpdateStats()
      ctx.twigView?.refresh()
      celebrateMeter(ctx.elements.waterMeter)
      celebrateMeter(ctx.elements.soilMeter)
      updateWaterStreak(ctx.elements)
      charts.updateSoil()
      charts.updateRadar()
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
      charts.updateSoil()
      charts.updateRadar()
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
      charts.updateSoil()
      charts.updateRadar()
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
      charts.updateSoil()
      charts.updateRadar()
    },
    onOpenLeaf: (leafId, twigId, branchIndex) => {
      setViewModeState('leaf', branchIndex, twigId)
      pushView('leaf', branchIndex, twigId, leafId)
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
          replaceView('twig', activeBranchIndex, newTwigId)
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
          pushView('twig', activeBranchIndex, activeTwigId)
          ctx.twigView?.open(twig)
        }
      }
      navCallbacks.onUpdateStats()
    },
    onSave: navCallbacks.onUpdateStats,
    onSoilChange: () => {
      updateSoilMeter(ctx.elements)
      charts.updateSoil()
      charts.updateRadar()
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

  // Initialize sidebar sprout sections
  initSidebarSprouts(
    ctx,
    (sprout) => waterDialogApi.openWaterDialog(sprout),
    (sprout) => {
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

  // Initial view setup
  updateStats(ctx)
  updateFocus(null, ctx)
  updateSoilMeter(ctx.elements)
  updateWaterMeter(ctx.elements)
  updateWaterStreak(ctx.elements)
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
      updateRadar: () => charts.updateRadar(),
      updateSoil: () => charts.updateSoil(),
    },
  }
}
