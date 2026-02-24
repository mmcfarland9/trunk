/**
 * Radar chart data computation.
 *
 * Derives per-branch engagement scores from the event log for the
 * life-balance radar chart. Each branch gets a normalized 0-1 score
 * based on weighted activity tied to the soil economy:
 *
 *   Water:   +0.05  (soil recovery rate per water)
 *   Sun:     +0.35  (soil recovery rate per reflection)
 *   Plant:   soilCost from the event (2-24, encodes season × environment)
 *   Harvest: soilCost × resultMultiplier (rewards quality outcomes)
 */

import type { TrunkEvent } from './types'
import { BRANCH_COUNT } from '../constants'
import { RESULT_MULTIPLIERS } from '../generated/constants'
import { parseTwigId } from '../utils/twig-id'
import { getPresetLabel } from '../state'

// Flat per-event weights from soil recovery rates (constants.json)
const W_WATER = 0.05
const W_SUN = 0.35

export type BranchEngagement = {
  branchIndex: number
  branchName: string
  score: number // normalized 0-1 (max branch = 1.0)
  rawTotal: number // raw event count
  planted: number
  watered: number
  sunReflections: number
  harvested: number
}

export function computeBranchEngagement(events: readonly TrunkEvent[]): BranchEngagement[] {
  // Per-branch event counts (for tooltip display)
  const planted = new Array<number>(BRANCH_COUNT).fill(0)
  const watered = new Array<number>(BRANCH_COUNT).fill(0)
  const sunReflections = new Array<number>(BRANCH_COUNT).fill(0)
  const harvested = new Array<number>(BRANCH_COUNT).fill(0)

  // Per-branch weighted accumulator
  const weighted = new Array<number>(BRANCH_COUNT).fill(0)

  // Map sproutId -> { twigId, soilCost } for harvest lookups
  const sproutInfo = new Map<string, { twigId: string; soilCost: number }>()

  for (const event of events) {
    switch (event.type) {
      case 'sprout_planted': {
        sproutInfo.set(event.sproutId, {
          twigId: event.twigId,
          soilCost: event.soilCost,
        })
        const parsed = parseTwigId(event.twigId)
        if (parsed && parsed.branchIndex < BRANCH_COUNT) {
          planted[parsed.branchIndex]++
          // Weight = soilCost (2-24, encodes season × environment)
          weighted[parsed.branchIndex] += event.soilCost
        }
        break
      }

      case 'sprout_watered': {
        const info = sproutInfo.get(event.sproutId)
        if (info) {
          const parsed = parseTwigId(info.twigId)
          if (parsed && parsed.branchIndex < BRANCH_COUNT) {
            watered[parsed.branchIndex]++
            weighted[parsed.branchIndex] += W_WATER
          }
        }
        break
      }

      case 'sun_shone': {
        const parsed = parseTwigId(event.twigId)
        if (parsed && parsed.branchIndex < BRANCH_COUNT) {
          sunReflections[parsed.branchIndex]++
          weighted[parsed.branchIndex] += W_SUN
        }
        break
      }

      case 'sprout_harvested': {
        const info = sproutInfo.get(event.sproutId)
        if (info) {
          const parsed = parseTwigId(info.twigId)
          if (parsed && parsed.branchIndex < BRANCH_COUNT) {
            harvested[parsed.branchIndex]++
            // Weight = soilCost × resultMultiplier (rewards quality outcomes)
            const rm =
              RESULT_MULTIPLIERS[event.result as keyof typeof RESULT_MULTIPLIERS] ??
              RESULT_MULTIPLIERS[3]
            weighted[parsed.branchIndex] += info.soilCost * rm
          }
        }
        break
      }
    }
  }

  // Raw (unweighted) totals for tooltip display
  const rawTotals = Array.from(
    { length: BRANCH_COUNT },
    (_, i) => planted[i] + watered[i] + sunReflections[i] + harvested[i],
  )

  const maxWeighted = Math.max(...weighted)

  return Array.from(
    { length: BRANCH_COUNT },
    (_, i): BranchEngagement => ({
      branchIndex: i,
      branchName: getPresetLabel(`branch-${i}`) || `Branch ${i + 1}`,
      score: maxWeighted > 0 ? weighted[i] / maxWeighted : 0,
      rawTotal: rawTotals[i],
      planted: planted[i],
      watered: watered[i],
      sunReflections: sunReflections[i],
      harvested: harvested[i],
    }),
  )
}
