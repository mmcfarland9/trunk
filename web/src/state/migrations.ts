/**
 * Schema migrations for state data.
 *
 * The _version field tracks schema version for safe migrations over time.
 * When you need to change the data structure:
 * 1. Increment CURRENT_SCHEMA_VERSION
 * 2. Add a migration function to MIGRATIONS
 * 3. The migration runs automatically on load
 */

import type { NodeData, SunEntry, SoilEntry } from '../types'

export const CURRENT_SCHEMA_VERSION = 2

export type StoredState = {
  _version: number
  nodes: Record<string, NodeData>
  sunLog?: SunEntry[]
  soilLog?: SoilEntry[]
}

type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>

/**
 * Migration functions: each transforms from version N to N+1
 */
const MIGRATIONS: Record<number, MigrationFn> = {
  // Version 1 -> 2: Remove 1w sprouts, add leaf names, remove leaf status
  2: (data) => {
    const nodes = data.nodes as Record<string, unknown>

    Object.values(nodes).forEach((node: unknown) => {
      const n = node as {
        sprouts?: Array<{ season: string; title: string; leafId?: string; createdAt?: string }>,
        leaves?: Array<{ id: string; name?: string; status?: string }>
      }

      // Convert 1w sprouts to 2w
      if (n.sprouts) {
        n.sprouts.forEach(sprout => {
          if (sprout.season === '1w') {
            sprout.season = '2w'
          }
        })
      }

      // Add name to leaves, remove status
      if (n.leaves) {
        n.leaves.forEach(leaf => {
          if (!leaf.name) {
            // Derive name from most recent sprout on this leaf (by createdAt)
            const leafSprouts = n.sprouts?.filter(s => s.leafId === leaf.id) || []
            const sorted = leafSprouts.sort((a, b) =>
              new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            )
            const mostRecent = sorted[0]
            leaf.name = mostRecent?.title || 'Unnamed Saga'
          }
          delete leaf.status
        })
      }
    })

    return data
  },
}

/**
 * Run schema migrations on raw data from import or localStorage.
 * Exported for use by import-export.ts.
 */
export function runMigrations(raw: Record<string, unknown>): StoredState {
  let version = typeof raw._version === 'number' ? raw._version : 0
  let data = raw

  // Legacy data (no _version field) gets version 0
  // We normalize it to version 1 structure
  if (version === 0) {
    // Old format: { trunk: {...}, branch-0: {...}, ... }
    // New format: { _version: 1, nodes: { trunk: {...}, ... } }
    const nodes: Record<string, unknown> = {}
    Object.entries(data).forEach(([key, value]) => {
      if (key !== '_version' && value && typeof value === 'object') {
        nodes[key] = value
      }
    })
    data = { _version: 1, nodes }
    version = 1
  }

  // Run any pending migrations
  while (version < CURRENT_SCHEMA_VERSION) {
    const migration = MIGRATIONS[version + 1]
    if (migration) {
      data = migration(data)
    }
    version++
  }

  return {
    _version: CURRENT_SCHEMA_VERSION,
    nodes: (data.nodes || {}) as Record<string, NodeData>,
  }
}
