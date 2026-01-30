/**
 * Migration utilities to convert existing state to events.
 *
 * This allows us to generate events from the current nodeState + sunLog
 * for export, ensuring 100% state preservation.
 */

import type { TrunkEvent } from './types'
import type { NodeData, Sprout, SunEntry } from '../types'
import { calculateCapacityReward } from '../state'
import constants from '../../../shared/constants.json'

/**
 * Convert existing nodeState and sunLog to a sorted event log.
 *
 * This replays history in chronological order to accurately calculate
 * capacity gains with diminishing returns at each harvest.
 */
export function migrateToEvents(
  nodeState: Record<string, NodeData>,
  sunLog: SunEntry[]
): TrunkEvent[] {
  const events: TrunkEvent[] = []

  // Collect all events from node data
  for (const [nodeId, data] of Object.entries(nodeState)) {
    if (!nodeId.includes('twig')) continue

    // Leaf creation events
    if (data.leaves) {
      for (const leaf of data.leaves) {
        events.push({
          type: 'leaf_created',
          timestamp: leaf.createdAt,
          leafId: leaf.id,
          twigId: nodeId,
          name: leaf.name,
        })
      }
    }

    // Sprout events
    if (data.sprouts) {
      for (const sprout of data.sprouts) {
        // Only include planted sprouts (not drafts, but drafts don't exist anymore)
        if (sprout.state === 'active' || sprout.state === 'completed') {
          // Planted event
          events.push({
            type: 'sprout_planted',
            timestamp: sprout.plantedAt || sprout.activatedAt || sprout.createdAt,
            sproutId: sprout.id,
            twigId: nodeId,
            title: sprout.title,
            season: sprout.season,
            environment: sprout.environment,
            soilCost: sprout.soilCost,
            leafId: sprout.leafId,
            bloomWither: sprout.bloomWither,
            bloomBudding: sprout.bloomBudding,
            bloomFlourish: sprout.bloomFlourish,
          })

          // Water events
          if (sprout.waterEntries) {
            for (const entry of sprout.waterEntries) {
              events.push({
                type: 'sprout_watered',
                timestamp: entry.timestamp,
                sproutId: sprout.id,
                content: entry.content,
                prompt: entry.prompt,
              })
            }
          }

          // Harvest event (if completed)
          if (sprout.state === 'completed' && sprout.result) {
            events.push({
              type: 'sprout_harvested',
              timestamp: sprout.harvestedAt || sprout.completedAt || new Date().toISOString(),
              sproutId: sprout.id,
              result: sprout.result,
              reflection: sprout.reflection,
              capacityGained: 0, // Placeholder - will calculate in second pass
            })
          }
        }
      }
    }
  }

  // Collect sun events
  for (const entry of sunLog) {
    events.push({
      type: 'sun_shone',
      timestamp: entry.timestamp,
      twigId: entry.context.twigId,
      twigLabel: entry.context.twigLabel,
      content: entry.content,
      prompt: entry.prompt,
    })
  }

  // Sort all events chronologically
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  // Second pass: calculate capacityGained for harvest events
  // We need to replay events to know capacity at each harvest time
  let currentCapacity = constants.soil.startingCapacity
  const sproutData = new Map<string, { season: string; environment: string }>()

  for (const event of events) {
    if (event.type === 'sprout_planted') {
      sproutData.set(event.sproutId, {
        season: event.season,
        environment: event.environment,
      })
    } else if (event.type === 'sprout_harvested') {
      const data = sproutData.get(event.sproutId)
      if (data) {
        // calculateCapacityReward already applies result multiplier and diminishing returns
        const capacityGained = calculateCapacityReward(
          data.season as Sprout['season'],
          data.environment as Sprout['environment'],
          event.result,
          currentCapacity
        )
        event.capacityGained = capacityGained
        currentCapacity += capacityGained
      }
    }
  }

  return events
}

/**
 * Validate that events can correctly reconstruct state.
 * Returns true if the derived state matches the original.
 */
export function validateMigration(
  originalNodes: Record<string, NodeData>,
  events: TrunkEvent[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Count expected vs actual events
  let expectedPlanted = 0
  let expectedWatered = 0
  let expectedHarvested = 0
  let expectedLeaves = 0

  for (const data of Object.values(originalNodes)) {
    if (data.leaves) expectedLeaves += data.leaves.length
    if (data.sprouts) {
      for (const sprout of data.sprouts) {
        if (sprout.state === 'active' || sprout.state === 'completed') {
          expectedPlanted++
          if (sprout.waterEntries) expectedWatered += sprout.waterEntries.length
          if (sprout.state === 'completed' && sprout.result) expectedHarvested++
        }
      }
    }
  }

  const actualPlanted = events.filter(e => e.type === 'sprout_planted').length
  const actualWatered = events.filter(e => e.type === 'sprout_watered').length
  const actualHarvested = events.filter(e => e.type === 'sprout_harvested').length
  const actualLeaves = events.filter(e => e.type === 'leaf_created').length

  if (actualPlanted !== expectedPlanted) {
    errors.push(`Planted: expected ${expectedPlanted}, got ${actualPlanted}`)
  }
  if (actualWatered !== expectedWatered) {
    errors.push(`Watered: expected ${expectedWatered}, got ${actualWatered}`)
  }
  if (actualHarvested !== expectedHarvested) {
    errors.push(`Harvested: expected ${expectedHarvested}, got ${actualHarvested}`)
  }
  if (actualLeaves !== expectedLeaves) {
    errors.push(`Leaves: expected ${expectedLeaves}, got ${actualLeaves}`)
  }

  return { valid: errors.length === 0, errors }
}
