/**
 * Rebuild nodeState from events for import.
 *
 * Events contain the source of truth for sprouts, leaves, and water entries.
 * Labels and notes come from the circles field (not event-sourced).
 */

import type { NodeData, Sprout, Leaf, SunEntry } from '../types'
import type { TrunkEvent } from './types'
import { deriveState, toSprout } from './derive'

/**
 * Rebuild nodeState from events and circles.
 *
 * @param events - The event log from the import
 * @param circles - Labels and notes from the import (not event-sourced)
 * @returns Rebuilt nodeState with sprouts/leaves from events, labels/notes from circles
 */
export function rebuildFromEvents(
  events: TrunkEvent[],
  circles: Record<string, { label?: string; note?: string }> = {}
): { nodes: Record<string, NodeData>; sunLog: SunEntry[] } {
  // Derive state from events
  const derived = deriveState(events)

  // Group sprouts by twigId
  const sproutsByTwig = new Map<string, Sprout[]>()
  for (const derivedSprout of derived.sprouts.values()) {
    const twigId = derivedSprout.twigId
    if (!sproutsByTwig.has(twigId)) {
      sproutsByTwig.set(twigId, [])
    }
    sproutsByTwig.get(twigId)!.push(toSprout(derivedSprout))
  }

  // Group leaves by twigId
  const leavesByTwig = new Map<string, Leaf[]>()
  for (const derivedLeaf of derived.leaves.values()) {
    const twigId = derivedLeaf.twigId
    if (!leavesByTwig.has(twigId)) {
      leavesByTwig.set(twigId, [])
    }
    leavesByTwig.get(twigId)!.push({
      id: derivedLeaf.id,
      name: derivedLeaf.name,
      createdAt: derivedLeaf.createdAt,
    })
  }

  // Build nodeState
  const nodes: Record<string, NodeData> = {}

  // First, add all twigs that have sprouts or leaves
  const allTwigIds = new Set([
    ...sproutsByTwig.keys(),
    ...leavesByTwig.keys(),
  ])

  for (const twigId of allTwigIds) {
    const circleData = circles[twigId]
    const sprouts = sproutsByTwig.get(twigId)
    const leaves = leavesByTwig.get(twigId)

    nodes[twigId] = {
      label: circleData?.label || '',
      note: circleData?.note || '',
      ...(sprouts && sprouts.length > 0 ? { sprouts } : {}),
      ...(leaves && leaves.length > 0 ? { leaves } : {}),
    }
  }

  // Then, add any circles that have labels/notes but no sprouts/leaves
  for (const [nodeId, data] of Object.entries(circles)) {
    if (!nodes[nodeId] && (data.label || data.note)) {
      nodes[nodeId] = {
        label: data.label || '',
        note: data.note || '',
      }
    }
  }

  return {
    nodes,
    sunLog: derived.sunEntries,
  }
}

/**
 * Validate that events can be rebuilt correctly.
 * Compares event counts to ensure nothing is lost.
 */
export function validateRebuild(
  events: TrunkEvent[],
  rebuilt: { nodes: Record<string, NodeData>; sunLog: SunEntry[] }
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Count events
  const eventCounts = {
    planted: events.filter(e => e.type === 'sprout_planted').length,
    harvested: events.filter(e => e.type === 'sprout_harvested').length,
    watered: events.filter(e => e.type === 'sprout_watered').length,
    uprooted: events.filter(e => e.type === 'sprout_uprooted').length,
    leaves: events.filter(e => e.type === 'leaf_created').length,
    sun: events.filter(e => e.type === 'sun_shone').length,
  }

  // Count rebuilt state
  let sproutCount = 0
  let completedCount = 0
  let waterCount = 0
  let leafCount = 0

  for (const data of Object.values(rebuilt.nodes)) {
    if (data.sprouts) {
      sproutCount += data.sprouts.length
      completedCount += data.sprouts.filter(s => s.state === 'completed').length
      waterCount += data.sprouts.reduce((sum, s) => sum + (s.waterEntries?.length || 0), 0)
    }
    if (data.leaves) {
      leafCount += data.leaves.length
    }
  }

  // Uprooted sprouts are removed, so count should be planted - uprooted
  const expectedSprouts = eventCounts.planted - eventCounts.uprooted
  if (sproutCount !== expectedSprouts) {
    errors.push(`Sprouts: expected ${expectedSprouts}, got ${sproutCount}`)
  }

  if (completedCount !== eventCounts.harvested) {
    errors.push(`Completed: expected ${eventCounts.harvested}, got ${completedCount}`)
  }

  if (waterCount !== eventCounts.watered) {
    errors.push(`Water entries: expected ${eventCounts.watered}, got ${waterCount}`)
  }

  if (leafCount !== eventCounts.leaves) {
    errors.push(`Leaves: expected ${eventCounts.leaves}, got ${leafCount}`)
  }

  if (rebuilt.sunLog.length !== eventCounts.sun) {
    errors.push(`Sun entries: expected ${eventCounts.sun}, got ${rebuilt.sunLog.length}`)
  }

  return { valid: errors.length === 0, errors }
}
