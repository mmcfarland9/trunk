/**
 * Radar chart data computation.
 *
 * Derives per-branch engagement scores from the event log for the
 * life-balance radar chart. Each branch gets a normalized 0-1 score
 * based on total activity (planted, watered, sun reflections, harvested).
 */

import type { TrunkEvent } from './types'
import { BRANCH_COUNT } from '../constants'
import { parseTwigId } from '../utils/twig-id'
import { getPresetLabel } from '../state'

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
  // Per-branch counters
  const planted = new Array<number>(BRANCH_COUNT).fill(0)
  const watered = new Array<number>(BRANCH_COUNT).fill(0)
  const sunReflections = new Array<number>(BRANCH_COUNT).fill(0)
  const harvested = new Array<number>(BRANCH_COUNT).fill(0)

  // Map sproutId -> twigId so we can resolve branch for watered/harvested events
  const sproutTwig = new Map<string, string>()

  for (const event of events) {
    switch (event.type) {
      case 'sprout_planted': {
        sproutTwig.set(event.sproutId, event.twigId)
        const parsed = parseTwigId(event.twigId)
        if (parsed && parsed.branchIndex < BRANCH_COUNT) {
          planted[parsed.branchIndex]++
        }
        break
      }

      case 'sprout_watered': {
        const twigId = sproutTwig.get(event.sproutId)
        if (twigId) {
          const parsed = parseTwigId(twigId)
          if (parsed && parsed.branchIndex < BRANCH_COUNT) {
            watered[parsed.branchIndex]++
          }
        }
        break
      }

      case 'sun_shone': {
        const parsed = parseTwigId(event.twigId)
        if (parsed && parsed.branchIndex < BRANCH_COUNT) {
          sunReflections[parsed.branchIndex]++
        }
        break
      }

      case 'sprout_harvested': {
        const twigId = sproutTwig.get(event.sproutId)
        if (twigId) {
          const parsed = parseTwigId(twigId)
          if (parsed && parsed.branchIndex < BRANCH_COUNT) {
            harvested[parsed.branchIndex]++
          }
        }
        break
      }
    }
  }

  // Compute raw totals
  const rawTotals = Array.from(
    { length: BRANCH_COUNT },
    (_, i) => planted[i] + watered[i] + sunReflections[i] + harvested[i],
  )

  const maxRaw = Math.max(...rawTotals)

  return Array.from(
    { length: BRANCH_COUNT },
    (_, i): BranchEngagement => ({
      branchIndex: i,
      branchName: getPresetLabel(`branch-${i}`) || `Branch ${i + 1}`,
      score: maxRaw > 0 ? rawTotals[i] / maxRaw : 0,
      rawTotal: rawTotals[i],
      planted: planted[i],
      watered: watered[i],
      sunReflections: sunReflections[i],
      harvested: harvested[i],
    }),
  )
}
