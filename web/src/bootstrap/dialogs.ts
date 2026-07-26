import constants from '../../../shared/constants.json'
import { checkSproutWateredToday, getSoilAvailable, getSoilCapacity, getState } from '../events'
import { initAccountDialog } from '../features/account-dialog'
import { initHarvestDialog } from '../features/harvest-dialog'
import { pushView, replaceView } from '../features/history'
import { enterTwigView, returnToBranchView, returnToOverview } from '../features/navigation'
import { initSidebarSprouts, updateStats } from '../features/progress'
import { initShine } from '../features/shine-dialog'
import { initSoilBagDialog } from '../features/soilbag-dialog'
import { initSunLogDialog } from '../features/sunlog-dialog'
import { initWaterDialog } from '../features/water-dialog'
import { initWaterCanDialog } from '../features/watercan-dialog'
import { getActiveBranchIndex, getActiveTwigId, getPresetLabel, setViewModeState } from '../state'
import type { AppContext, SproutSeason } from '../types'
import { buildLeafView } from '../ui/leaf-view'
import { setFocusedNode, updateFocus } from '../ui/node-ui'
import { buildTwigView } from '../ui/twig-view'
import type { ChartOps } from './charts'
import { celebrateMeter, updateSoilMeter, updateWaterMeter, updateWaterStreak } from './meters'
import type { DialogAPIs, NavCallbacks } from './ui'

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

  const getActiveSprouts = () =>
    [...getState().sprouts.values()].filter((s) => s.state === 'active')

  const isReadyToHarvest = (sprout: { season: SproutSeason; plantedAt: string }) =>
    new Date(sprout.plantedAt).getTime() + constants.seasons[sprout.season].durationMs <= Date.now()

  const soilBagApi = initSoilBagDialog(ctx.elements, {
    getSoilStatus: () => {
      const active = getActiveSprouts()
      return {
        available: getSoilAvailable(),
        capacity: getSoilCapacity(),
        committed: active.reduce((sum, s) => sum + s.soilCost, 0),
        growing: active.length,
      }
    },
    getHarvestableSprouts: () =>
      getActiveSprouts()
        .filter(isReadyToHarvest)
        .sort((a, b) => (a.plantedAt < b.plantedAt ? -1 : a.plantedAt > b.plantedAt ? 1 : 0))
        .map((s) => ({
          id: s.id,
          title: s.title,
          twigLabel: getPresetLabel(s.twigId) || '',
          soilCost: s.soilCost,
        })),
    onHarvestSprout: (sproutId) => {
      const sprout = getState().sprouts.get(sproutId)
      if (!sprout) return
      harvestDialogApi.openHarvestDialog({
        id: sprout.id,
        title: sprout.title,
        twigId: sprout.twigId,
        twigLabel: getPresetLabel(sprout.twigId) || '',
        season: sprout.season,
        environment: sprout.environment,
        soilCost: sprout.soilCost,
        bloomWither: sprout.bloomWither,
        bloomBudding: sprout.bloomBudding,
        bloomFlourish: sprout.bloomFlourish,
      })
    },
  })

  const waterCanApi = initWaterCanDialog(ctx.elements, {
    hasActiveSprouts: () => getActiveSprouts().length > 0,
    // Same selection rule as the water dialog and iOS's daily sheet: unwatered
    // active sprouts, thirstiest (least recently watered) first, capped at 3.
    getReadySprouts: () =>
      getActiveSprouts()
        .filter((s) => !checkSproutWateredToday(s.id))
        .map((s) => ({
          id: s.id,
          title: s.title,
          twigLabel: getPresetLabel(s.twigId) || '',
          lastWateredAt:
            s.waterEntries
              ?.map((e) => e.timestamp)
              .sort()
              .pop() ?? null,
        }))
        .sort((a, b) => (a.lastWateredAt ?? '').localeCompare(b.lastWateredAt ?? ''))
        .slice(0, 3),
    onWaterSprout: (sproutId) => {
      const sprout = getState().sprouts.get(sproutId)
      if (!sprout) return
      waterDialogApi.openWaterDialog({
        id: sprout.id,
        title: sprout.title,
        waterEntries: sprout.waterEntries,
      })
    },
    onWaterAll: () => {
      waterDialogApi.openWaterDialog()
    },
  })

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
    (seedling) => {
      const twig = ctx.nodeLookup.get(seedling.twigId)
      if (!twig || seedling.branchIndex < 0) return
      enterTwigView(twig, seedling.branchIndex, ctx, navCallbacks)
      ctx.twigView?.prefillPlantFromSeedling(seedling.id)
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
