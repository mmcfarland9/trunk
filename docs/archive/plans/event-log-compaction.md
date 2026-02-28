# Event Log Compaction Design

## Overview

As users accumulate events over months and years, the event log grows unbounded. Every state derivation replays all events from scratch. Compaction introduces **snapshot checkpoints** — a serialized DerivedState at a point in time — so derivation replays only recent events on top of a snapshot.

### Scale Estimate

A daily user generates ~4 events/day (3 waters + occasional plant/harvest/sun). Over 5 years that's ~7,300 events. While `deriveState()` is O(n) and fast today, compaction provides:

1. **Faster cold starts** — snapshot + 50 tail events vs. 7,300 full replay
2. **Reduced localStorage pressure** — compacted events don't consume quota
3. **Bounded derivation cost** — performance stays constant regardless of history length

---

## 1. Snapshot Format

### What's Included

The snapshot captures the **full DerivedState** at a point in time, minus the computed indexes (which are cheap to rebuild from entity maps).

```json
{
  "version": 1,
  "createdAt": "2026-02-27T10:00:00.000Z",
  "eventCutoff": "2026-02-20T10:00:00.000Z",
  "compactedEventCount": 843,

  "state": {
    "soilCapacity": 45.20,
    "soilAvailable": 12.50,
    "sprouts": {
      "sprout-abc123": {
        "id": "sprout-abc123",
        "twigId": "branch-0-twig-3",
        "title": "Run 3x per week",
        "season": "3m",
        "environment": "firm",
        "soilCost": 8,
        "leafId": "leaf-xyz",
        "bloomWither": "Ran less than once a week",
        "bloomBudding": "Ran 2x most weeks",
        "bloomFlourish": "Ran 3x every week",
        "state": "active",
        "plantedAt": "2026-01-15T09:00:00.000Z",
        "waterEntries": [
          { "timestamp": "2026-01-16T08:00:00Z", "content": "Morning run", "prompt": "..." }
        ]
      }
    },
    "leaves": {
      "leaf-xyz": {
        "id": "leaf-xyz",
        "twigId": "branch-0-twig-3",
        "name": "Fitness Journey",
        "createdAt": "2026-01-15T09:00:00.000Z"
      }
    },
    "sunEntries": [
      {
        "timestamp": "2026-01-20T10:00:00Z",
        "content": "Reflected on movement habits",
        "prompt": "...",
        "context": { "twigId": "branch-0-twig-0", "twigLabel": "movement" }
      }
    ]
  },

  "waterDayKeys": ["2026-01-15", "2026-01-16", "2026-01-17"]
}
```

### Field Rationale

| Field | Purpose |
|-------|---------|
| `version` | Schema versioning for future migrations |
| `createdAt` | When this snapshot was produced |
| `eventCutoff` | Events with `timestamp <= eventCutoff` are captured in the snapshot |
| `compactedEventCount` | Number of events baked into snapshot (diagnostic) |
| `state.soilCapacity` | Running total, not re-derivable without full replay |
| `state.soilAvailable` | Running balance, not re-derivable without full replay |
| `state.sprouts` | All sprouts (active, completed, uprooted) with full data including `waterEntries` |
| `state.leaves` | All leaves |
| `state.sunEntries` | Full sun entry history (needed for display in Sun Ledge dialog) |
| `waterDayKeys` | Set of unique "YYYY-MM-DD" watering day keys (for streak calculation) |

### What's NOT Included

**Computed indexes** (`activeSproutsByTwig`, `sproutsByTwig`, `sproutsByLeaf`, `leavesByTwig`) are rebuilt from entity maps during the modified derivation step. They are O(n) over entities (not events) and negligible cost.

### Handling Time-Window Queries

Time-window queries (`deriveWaterAvailable`, `deriveSunAvailable`, `wasSproutWateredThisWeek`, `wasSproutWateredToday`) currently scan the raw event log for events within a rolling window.

After compaction, these queries work from two sources:

1. **Tail events** (raw events after `eventCutoff`) — scanned directly as today
2. **Sprout waterEntries in the snapshot** — contain all water timestamps, so time-window checks can filter these just as they currently filter events

The `waterDayKeys` array stores every unique watering day ever recorded (one string per day, ~365/year). This allows `deriveWateringStreak()` to:
- Merge `waterDayKeys` from the snapshot with new day keys from tail events
- Run the existing streak algorithm on the merged set

This is ~1.5KB per year of daily use — negligible.

---

## 2. Compaction Trigger

### Strategy: Automatic at N Events, with Manual Override

```
COMPACTION_THRESHOLD = 500  // events before compaction runs
```

**Automatic trigger:** After `deriveState()` completes, if `events.length >= COMPACTION_THRESHOLD`, run compaction. This happens:
- On app startup (after initial load/sync)
- After a full sync replaces events

**Why 500?** At ~4 events/day, this triggers roughly every 4 months. The threshold is generous enough that compaction is rare, but ensures performance stays bounded.

**Manual trigger:** Expose a "Compact Now" action in the account/data dialog for users who want to reclaim storage immediately.

**NOT on export:** Export always produces the full event history (see section 4). Compaction is an internal optimization, not visible in exports.

### Where to Add the Threshold

Add to `shared/constants.json`:

```json
{
  "compaction": {
    "eventThreshold": 500
  }
}
```

Both platforms read from shared constants for identical behavior.

---

## 3. Sync Interaction

### Core Principle: Snapshots Are Local-Only

The server always maintains the **complete, uncompacted event log**. Snapshots never leave the device. This means:

```
Server (Supabase):  [event_1, event_2, ..., event_N]  (complete log, always)
Client (local):     snapshot + [event_501, ..., event_N]  (compacted)
```

### Full Sync (Cache Invalid)

When the client performs a full sync (`smartSync()` with invalid cache):

1. Server returns ALL events
2. Client receives full event list
3. **Discard existing snapshot** — it's stale
4. `replaceEvents(serverEvents)` stores full log locally
5. On next `deriveState()`, if `events.length >= threshold`, compact again

This is safe because the server is the source of truth. The snapshot is purely a local performance optimization.

### Incremental Sync

When pulling new events incrementally:

1. New events are appended to the local tail
2. Existing snapshot remains valid
3. `deriveState()` starts from snapshot, replays snapshot tail + new events
4. If total events (compacted + tail) exceed threshold, re-compact

### Realtime Events

Real-time broadcast events from other devices are appended to the tail. The snapshot is not affected.

### Pending Uploads

Pending events (not yet confirmed by server) are always in the tail, never in the snapshot. Compaction only compacts confirmed events.

### Pseudocode: Sync + Compaction Interaction

```typescript
// After full sync:
function onFullSyncComplete(serverEvents: TrunkEvent[]): void {
  clearSnapshot()                    // discard stale snapshot
  replaceEvents(serverEvents)        // store full log
  // Next getState() call will trigger compaction check
}

// After incremental sync:
function onIncrementalPull(newEvents: TrunkEvent[]): void {
  appendEvents(newEvents)            // add to tail
  invalidateCache()                  // re-derive on next read
  // Compaction check happens in getState()
}
```

---

## 4. Import/Export

### Export: Always Full Event History

An export must be **portable and self-contained**. It should work on any device, including one that has never seen this data before. Therefore:

**Export = snapshot replay + tail events → flat event list**

```typescript
function exportEvents(): TrunkEvent[] {
  // If no snapshot, just return current events (existing behavior)
  if (!hasSnapshot()) {
    return [...getEvents()]
  }

  // Reconstruct full event list from snapshot
  const snapshotEvents = snapshotToEventList(getSnapshot())
  const tailEvents = getEvents()  // events after cutoff

  // Deduplicate (tail events may overlap with snapshot boundary)
  return deduplicateEvents([...snapshotEvents, ...tailEvents])
}
```

### Reconstructing Events from Snapshot

The snapshot contains enough data to synthesize the original events:

```typescript
function snapshotToEventList(snapshot: Snapshot): TrunkEvent[] {
  const events: TrunkEvent[] = []

  // Reconstruct leaf_created events
  for (const leaf of Object.values(snapshot.state.leaves)) {
    events.push({
      type: 'leaf_created',
      leafId: leaf.id,
      twigId: leaf.twigId,
      name: leaf.name,
      timestamp: leaf.createdAt,
    })
  }

  // Reconstruct sprout events
  for (const sprout of Object.values(snapshot.state.sprouts)) {
    // sprout_planted
    events.push({
      type: 'sprout_planted',
      sproutId: sprout.id,
      twigId: sprout.twigId,
      title: sprout.title,
      season: sprout.season,
      environment: sprout.environment,
      soilCost: sprout.soilCost,
      leafId: sprout.leafId,
      bloomWither: sprout.bloomWither,
      bloomBudding: sprout.bloomBudding,
      bloomFlourish: sprout.bloomFlourish,
      timestamp: sprout.plantedAt,
    })

    // sprout_watered (from waterEntries)
    for (const entry of sprout.waterEntries) {
      events.push({
        type: 'sprout_watered',
        sproutId: sprout.id,
        content: entry.content,
        prompt: entry.prompt,
        timestamp: entry.timestamp,
      })
    }

    // sprout_harvested or sprout_uprooted
    if (sprout.state === 'completed' && sprout.harvestedAt) {
      events.push({
        type: 'sprout_harvested',
        sproutId: sprout.id,
        result: sprout.result!,
        reflection: sprout.reflection,
        capacityGained: 0,  // See note below
        timestamp: sprout.harvestedAt,
      })
    } else if (sprout.state === 'uprooted' && sprout.uprootedAt) {
      events.push({
        type: 'sprout_uprooted',
        sproutId: sprout.id,
        soilReturned: 0,  // See note below
        timestamp: sprout.uprootedAt,
      })
    }
  }

  // Reconstruct sun_shone events
  for (const entry of snapshot.state.sunEntries) {
    events.push({
      type: 'sun_shone',
      twigId: entry.context.twigId,
      twigLabel: entry.context.twigLabel,
      content: entry.content,
      prompt: entry.prompt,
      timestamp: entry.timestamp,
    })
  }

  return events
}
```

**Note on `capacityGained` and `soilReturned`:** These values are not preserved in DerivedSprout. Two options:

- **Option A (recommended):** Store `capacityGained` and `soilReturned` in DerivedSprout during derivation. Minimal change — just two extra fields on completed/uprooted sprouts.
- **Option B:** Accept that reconstructed exports lose these values (soil math from the snapshot is already baked into `soilCapacity`/`soilAvailable`). The export would replay correctly but with zero-value harvest/uproot soil effects, since the snapshot's soil totals are the starting point.

**Recommendation:** Option A. Add `capacityGained?: number` to DerivedSprout (set during `SPROUT_HARVESTED`) and `soilReturned?: number` (set during `SPROUT_UPROOTED`). This preserves full event fidelity in exports.

### Import

Import replaces all local data (existing behavior unchanged):

```typescript
function importEvents(events: TrunkEvent[]): void {
  clearSnapshot()        // discard any local snapshot
  replaceEvents(events)  // store imported events
  // Compaction will run automatically if threshold exceeded
}
```

### Export Format

The export JSON format does **not** change. It remains a flat array of TrunkEvent objects. Snapshots are an internal implementation detail.

---

## 5. Cross-Platform Parity

### Snapshot Schema: Add to Shared Spec

Create `shared/schemas/snapshot.schema.json` with the snapshot format. Both platforms must produce and consume identical snapshots.

### Shared Constants

Add compaction constants to `shared/constants.json`:

```json
{
  "compaction": {
    "eventThreshold": 500,
    "snapshotVersion": 1
  }
}
```

### Storage Locations

| Platform | Snapshot Storage | Tail Events Storage |
|----------|-----------------|---------------------|
| Web | `localStorage["trunk-snapshot-v1"]` | `localStorage["trunk-events-v1"]` (tail only) |
| iOS | `events-cache.json` (add snapshot field) | `events-cache.json` (events field, tail only) |

### Platform-Specific Notes

**Web:** Snapshot stored as a separate localStorage key. This is important because localStorage has per-key size limits in some browsers, and separating snapshot from events distributes the load.

**iOS:** The existing `CachedEventStore` struct gains a `snapshot` field:

```swift
struct CachedEventStore: Codable, Sendable {
  let events: [SyncEvent]               // tail events only
  let pendingUploadClientIds: [String]
  let lastSyncTimestamp: String?
  let cacheVersion: Int
  let lastWrittenAt: String
  let snapshot: CompactionSnapshot?      // NEW
}
```

### Parity Requirements

Both platforms MUST:
1. Use the same `eventThreshold` from shared constants
2. Produce byte-identical snapshot JSON for the same input events (deterministic serialization: sorted keys, 2-decimal soil rounding)
3. Handle the same edge cases (empty sprout map, zero waterEntries, etc.)

Add a cross-platform test fixture in `shared/test-fixtures/` that verifies: given N events, both platforms produce the same snapshot and the same derived state from that snapshot + tail events.

---

## 6. Migration

### Existing Users

Existing users have no snapshot and a complete event log. This is the **default state** — no migration needed. The system works identically to today until the first compaction triggers.

### First Compaction

On the first `getState()` call after an app update, if `events.length >= threshold`:

1. Full replay produces DerivedState (same as today)
2. Snapshot is created from that DerivedState
3. Events before cutoff are removed from local storage
4. Only tail events remain

This is seamless — the user sees no change in behavior, just faster subsequent loads.

### Version Field

The snapshot contains `"version": 1`. If the snapshot format changes in the future:

```typescript
function loadSnapshot(): Snapshot | null {
  const raw = localStorage.getItem(SNAPSHOT_KEY)
  if (!raw) return null

  const snapshot = JSON.parse(raw)

  if (snapshot.version === 1) {
    return snapshot  // current format
  }

  // Future: migrate older snapshot versions
  // if (snapshot.version === 1) return migrateV1toV2(snapshot)

  // Unknown version — discard and force full replay
  console.warn(`Unknown snapshot version ${snapshot.version}, discarding`)
  localStorage.removeItem(SNAPSHOT_KEY)
  return null
}
```

If the snapshot version is unrecognized, it is **safely discarded**. The system falls back to full replay from the event log (which the server provides via full sync). This makes snapshot format changes non-breaking.

### DerivedState Version Coupling

If `DerivedState` itself changes (new fields, changed semantics), the snapshot version must be bumped. A snapshot created under v1 derivation logic cannot be used with v2 derivation logic — the snapshot would be discarded and rebuilt from full replay.

---

## 7. Rollback

### Safety Net: Server Has Full Log

If compaction introduces a bug (incorrect snapshot, data loss, wrong soil totals):

1. **Force full sync** (`forceFullSync()`) — clears local snapshot, pulls all events from server, rebuilds from scratch
2. The server event log is **never compacted** — it always has the complete history
3. Both platforms already have a "force sync" mechanism (web: account dialog; iOS: sync settings)

### What Could Go Wrong

| Failure Mode | Recovery |
|-------------|----------|
| Snapshot has wrong soil values | Force full sync → re-derive from server events |
| Snapshot missing a sprout | Force full sync → sprout restored from server events |
| Snapshot format corrupted | Version check fails → discarded → full replay |
| Export from compacted state is incomplete | `snapshotToEventList()` bug → fix code, re-export from full sync |

### Defensive Measures

1. **Checksum field** (optional, future): Hash of all compacted event client_ids. On full sync, verify the server's first N events match. If not, discard snapshot.
2. **Never compact pending events**: Events not yet confirmed by the server are always in the tail, never baked into a snapshot.
3. **Snapshot validation**: On load, validate that snapshot.state has required fields before using it. Fall back to full replay on any validation failure.

---

## Pseudocode: Compaction Algorithm

```typescript
const SNAPSHOT_KEY = 'trunk-snapshot-v1'

interface CompactionSnapshot {
  version: number
  createdAt: string
  eventCutoff: string
  compactedEventCount: number
  state: {
    soilCapacity: number
    soilAvailable: number
    sprouts: Record<string, DerivedSprout>
    leaves: Record<string, DerivedLeaf>
    sunEntries: SunEntry[]
  }
  waterDayKeys: string[]
}

/**
 * Run compaction if threshold exceeded.
 * Called after deriveState() when event count is high.
 */
function maybeCompact(
  events: readonly TrunkEvent[],
  state: DerivedState,
  threshold: number
): void {
  if (events.length < threshold) return

  // Cutoff: compact all but the most recent week of events.
  // This ensures time-window queries (water today, sun this week)
  // always have raw events to scan, even without snapshot awareness.
  const cutoffDate = getWeekResetTime(new Date())
  cutoffDate.setDate(cutoffDate.getDate() - 7) // extra week buffer
  const cutoffIso = cutoffDate.toISOString()

  // Partition events
  const compactedEvents = events.filter(e => e.timestamp <= cutoffIso)
  const tailEvents = events.filter(e => e.timestamp > cutoffIso)

  // Don't compact if most events are recent
  if (compactedEvents.length < threshold / 2) return

  // Don't compact pending uploads (not yet confirmed by server)
  const pendingIds = new Set(getPendingIds())
  const hasPendingInCompacted = compactedEvents.some(
    e => e.client_id && pendingIds.has(e.client_id)
  )
  if (hasPendingInCompacted) return

  // Build water day keys from ALL events (for streak)
  const waterDayKeys = buildWaterDayKeys(events)

  // Create snapshot
  const snapshot: CompactionSnapshot = {
    version: 1,
    createdAt: new Date().toISOString(),
    eventCutoff: cutoffIso,
    compactedEventCount: compactedEvents.length,
    state: {
      soilCapacity: state.soilCapacity,
      soilAvailable: deriveStateFromEvents(compactedEvents).soilAvailable,
      sprouts: serializeSprouts(deriveStateFromEvents(compactedEvents).sprouts),
      leaves: serializeLeaves(deriveStateFromEvents(compactedEvents).leaves),
      sunEntries: deriveStateFromEvents(compactedEvents).sunEntries,
    },
    waterDayKeys,
  }

  // Atomic write: snapshot first, then trim events
  saveSnapshot(snapshot)
  replaceEvents(tailEvents)
}

/**
 * Build the set of unique watering day keys from all events.
 */
function buildWaterDayKeys(events: readonly TrunkEvent[]): string[] {
  const daySet = new Set<string>()
  for (const e of events) {
    if (e.type === 'sprout_watered') {
      const resetTime = getTodayResetTime(new Date(e.timestamp))
      daySet.add(getResetDayKey(resetTime))
    }
  }
  return [...daySet].sort()
}
```

**Correction to the above:** The snapshot's `state` should be derived from only the compacted events (not all events). Here's the corrected core:

```typescript
function maybeCompact(
  allEvents: readonly TrunkEvent[],
  threshold: number
): void {
  if (allEvents.length < threshold) return

  const cutoffDate = getWeekResetTime(new Date())
  cutoffDate.setDate(cutoffDate.getDate() - 7)
  const cutoffIso = cutoffDate.toISOString()

  const compactedEvents = allEvents.filter(e => e.timestamp <= cutoffIso)
  const tailEvents = allEvents.filter(e => e.timestamp > cutoffIso)

  if (compactedEvents.length < threshold / 2) return

  // Derive state from ONLY the compacted events
  const compactedState = deriveState(compactedEvents)

  // Build ALL water day keys (for streak history)
  const waterDayKeys = buildWaterDayKeys(allEvents)

  const snapshot: CompactionSnapshot = {
    version: 1,
    createdAt: new Date().toISOString(),
    eventCutoff: cutoffIso,
    compactedEventCount: compactedEvents.length,
    state: {
      soilCapacity: compactedState.soilCapacity,
      soilAvailable: compactedState.soilAvailable,
      sprouts: serializeSproutMap(compactedState.sprouts),
      leaves: serializeLeafMap(compactedState.leaves),
      sunEntries: [...compactedState.sunEntries],
    },
    waterDayKeys,
  }

  saveSnapshot(snapshot)
  replaceEvents(tailEvents)
}
```

---

## Pseudocode: Modified Derivation Flow

```typescript
/**
 * Modified getState() — starts from snapshot if available.
 */
function getState(): DerivedState {
  if (cachedState) return cachedState

  const snapshot = loadSnapshot()
  const tailEvents = getEvents()

  if (snapshot) {
    // Start from snapshot, replay only tail events
    cachedState = deriveStateFromSnapshot(snapshot, tailEvents)
  } else {
    // No snapshot — full replay (existing behavior)
    cachedState = deriveState(tailEvents)
  }

  // Check if compaction should run
  const totalEvents = (snapshot?.compactedEventCount ?? 0) + tailEvents.length
  if (totalEvents >= COMPACTION_THRESHOLD && tailEvents.length >= COMPACTION_THRESHOLD) {
    // Tail has grown large enough to re-compact
    // (This means: derive full state, snapshot it, trim tail)
    scheduleCompaction()
  }

  return cachedState
}

/**
 * Derive state starting from a snapshot, replaying tail events.
 */
function deriveStateFromSnapshot(
  snapshot: CompactionSnapshot,
  tailEvents: readonly TrunkEvent[]
): DerivedState {
  // Initialize from snapshot (instead of starting constants)
  let soilCapacity = snapshot.state.soilCapacity
  let soilAvailable = snapshot.state.soilAvailable

  // Restore entity maps from snapshot
  const sprouts = deserializeSproutMap(snapshot.state.sprouts)
  const leaves = deserializeLeafMap(snapshot.state.leaves)
  const sunEntries = [...snapshot.state.sunEntries]

  // Sort and deduplicate tail events (same as current deriveState)
  const sortedTail = sortEventsByTimestamp(tailEvents)
  const seenKeys = new Set<string>()
  const dedupedTail = sortedTail.filter(event => {
    const key = getEventDedupeKey(event)
    if (seenKeys.has(key)) return false
    seenKeys.add(key)
    return true
  })

  // Replay tail events onto snapshot state
  // (Same switch/case logic as current deriveState, just different starting values)
  for (const event of dedupedTail) {
    switch (event.type) {
      case 'sprout_planted':
        soilAvailable = roundSoil(Math.max(0, soilAvailable - event.soilCost))
        sprouts.set(event.sproutId, { /* ... same as current ... */ })
        break

      case 'sprout_watered':
        // ... same as current ...
        break

      case 'sprout_harvested':
        // ... same as current ...
        break

      case 'sprout_uprooted':
        // ... same as current ...
        break

      case 'sun_shone':
        // ... same as current ...
        break

      case 'leaf_created':
        // ... same as current ...
        break
    }
  }

  // Build indexes (same as current)
  const sproutsByTwig = new Map<string, DerivedSprout[]>()
  const activeSproutsByTwig = new Map<string, DerivedSprout[]>()
  const sproutsByLeaf = new Map<string, DerivedSprout[]>()
  const leavesByTwig = new Map<string, DerivedLeaf[]>()
  // ... (existing index-building logic)

  return {
    soilCapacity,
    soilAvailable,
    sprouts,
    leaves,
    sunEntries,
    activeSproutsByTwig,
    sproutsByTwig,
    sproutsByLeaf,
    leavesByTwig,
  }
}
```

---

## Pseudocode: Modified Water/Sun/Streak Queries

```typescript
/**
 * Water available — unchanged API, scans tail events + snapshot sprout waterEntries.
 */
function deriveWaterAvailable(
  tailEvents: readonly TrunkEvent[],
  snapshot: CompactionSnapshot | null,
  now: Date = new Date()
): number {
  const resetMs = getTodayResetTime(now).getTime()

  // Count from tail events (same as today)
  let waterCount = tailEvents.filter(
    e => e.type === 'sprout_watered' && new Date(e.timestamp).getTime() >= resetMs
  ).length

  // Also count from snapshot sprout waterEntries (for entries within the window
  // that were compacted into the snapshot)
  if (snapshot) {
    for (const sprout of Object.values(snapshot.state.sprouts)) {
      for (const entry of sprout.waterEntries) {
        if (new Date(entry.timestamp).getTime() >= resetMs) {
          waterCount++
        }
      }
    }
  }

  return Math.max(0, WATER_DAILY_CAPACITY - waterCount)
}

/**
 * Watering streak — uses waterDayKeys from snapshot + tail events.
 */
function deriveWateringStreak(
  tailEvents: readonly TrunkEvent[],
  snapshot: CompactionSnapshot | null,
  now: Date = new Date()
): WateringStreak {
  // Merge day keys: snapshot history + new days from tail
  const waterDays = new Set<string>(snapshot?.waterDayKeys ?? [])

  for (const e of tailEvents) {
    if (e.type === 'sprout_watered') {
      waterDays.add(getResetDayKey(getTodayResetTime(new Date(e.timestamp))))
    }
  }

  // ... existing streak algorithm on merged waterDays set ...
}
```

---

## Snapshot JSON Schema

For `shared/schemas/snapshot.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CompactionSnapshot",
  "type": "object",
  "required": ["version", "createdAt", "eventCutoff", "compactedEventCount", "state", "waterDayKeys"],
  "properties": {
    "version": { "type": "integer", "minimum": 1 },
    "createdAt": { "type": "string", "format": "date-time" },
    "eventCutoff": { "type": "string", "format": "date-time" },
    "compactedEventCount": { "type": "integer", "minimum": 0 },
    "state": {
      "type": "object",
      "required": ["soilCapacity", "soilAvailable", "sprouts", "leaves", "sunEntries"],
      "properties": {
        "soilCapacity": { "type": "number" },
        "soilAvailable": { "type": "number" },
        "sprouts": {
          "type": "object",
          "additionalProperties": { "$ref": "#/definitions/DerivedSprout" }
        },
        "leaves": {
          "type": "object",
          "additionalProperties": { "$ref": "#/definitions/DerivedLeaf" }
        },
        "sunEntries": {
          "type": "array",
          "items": { "$ref": "#/definitions/SunEntry" }
        }
      }
    },
    "waterDayKeys": {
      "type": "array",
      "items": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$" }
    }
  },
  "definitions": {
    "DerivedSprout": {
      "type": "object",
      "required": ["id", "twigId", "title", "season", "environment", "soilCost", "leafId", "state", "plantedAt", "waterEntries"],
      "properties": {
        "id": { "type": "string" },
        "twigId": { "type": "string" },
        "title": { "type": "string" },
        "season": { "type": "string", "enum": ["2w", "1m", "3m", "6m", "1y"] },
        "environment": { "type": "string", "enum": ["fertile", "firm", "barren"] },
        "soilCost": { "type": "number" },
        "leafId": { "type": "string" },
        "bloomWither": { "type": "string" },
        "bloomBudding": { "type": "string" },
        "bloomFlourish": { "type": "string" },
        "state": { "type": "string", "enum": ["active", "completed", "uprooted"] },
        "plantedAt": { "type": "string", "format": "date-time" },
        "harvestedAt": { "type": "string", "format": "date-time" },
        "result": { "type": "integer", "minimum": 1, "maximum": 5 },
        "reflection": { "type": "string" },
        "uprootedAt": { "type": "string", "format": "date-time" },
        "capacityGained": { "type": "number" },
        "soilReturned": { "type": "number" },
        "waterEntries": {
          "type": "array",
          "items": { "$ref": "#/definitions/WaterEntry" }
        }
      }
    },
    "DerivedLeaf": {
      "type": "object",
      "required": ["id", "twigId", "name", "createdAt"],
      "properties": {
        "id": { "type": "string" },
        "twigId": { "type": "string" },
        "name": { "type": "string" },
        "createdAt": { "type": "string", "format": "date-time" }
      }
    },
    "WaterEntry": {
      "type": "object",
      "required": ["timestamp", "content"],
      "properties": {
        "timestamp": { "type": "string", "format": "date-time" },
        "content": { "type": "string" },
        "prompt": { "type": "string" }
      }
    },
    "SunEntry": {
      "type": "object",
      "required": ["timestamp", "content", "context"],
      "properties": {
        "timestamp": { "type": "string", "format": "date-time" },
        "content": { "type": "string" },
        "prompt": { "type": "string" },
        "context": {
          "type": "object",
          "required": ["twigId", "twigLabel"],
          "properties": {
            "twigId": { "type": "string" },
            "twigLabel": { "type": "string" }
          }
        }
      }
    }
  }
}
```

---

## Implementation Checklist

### Phase 1: Shared Spec

- [ ] Add `compaction` section to `shared/constants.json`
- [ ] Create `shared/schemas/snapshot.schema.json`
- [ ] Add `capacityGained` and `soilReturned` fields to DerivedSprout (web + iOS)

### Phase 2: Web Compaction

- [ ] Add snapshot storage helpers (`saveSnapshot`, `loadSnapshot`, `clearSnapshot`)
- [ ] Implement `deriveStateFromSnapshot()` in `derive.ts`
- [ ] Implement `maybeCompact()` in `store.ts`
- [ ] Modify `getState()` to use snapshot when available
- [ ] Update `deriveWaterAvailable()` to check snapshot water entries
- [ ] Update `deriveSunAvailable()` to check snapshot sun entries
- [ ] Update `deriveWateringStreak()` to merge snapshot water day keys
- [ ] Update `replaceEvents()` (full sync) to clear snapshot
- [ ] Update `exportEvents()` to reconstruct full history from snapshot
- [ ] Update import to clear snapshot before replacing events
- [ ] Add compaction threshold constant to `generated/constants.ts`

### Phase 3: iOS Compaction

- [ ] Add `CompactionSnapshot` struct (matching web schema)
- [ ] Update `CachedEventStore` to include optional snapshot
- [ ] Implement `deriveStateFromSnapshot()` in `EventDerivation.swift`
- [ ] Implement `maybeCompact()` in `EventStore.swift`
- [ ] Update `getState()` to use snapshot when available
- [ ] Update water/sun/streak derivation for snapshot awareness
- [ ] Update sync operations to clear snapshot on full sync

### Phase 4: Cross-Platform Testing

- [ ] Create test fixture in `shared/test-fixtures/compaction/`
- [ ] Verify identical snapshots from same events (web vs iOS)
- [ ] Verify identical derived state from snapshot + tail (web vs iOS)
- [ ] Test export round-trip: compact → export → import → verify identical state

### Phase 5: UI

- [ ] Add "Compact Now" button to account/data dialog (web)
- [ ] Add "Compact Now" option to data info sheet (iOS)
- [ ] Show compaction stats (e.g., "843 events compacted" in diagnostic info)

---

## Files to Modify

### Web

| File | Changes |
|------|---------|
| `web/src/events/derive.ts` | Add `deriveStateFromSnapshot()`, add `capacityGained`/`soilReturned` to DerivedSprout |
| `web/src/events/store.ts` | Add snapshot load/save/clear, modify `getState()`, `maybeCompact()`, update `exportEvents()` |
| `web/src/events/types.ts` | (no change — snapshot is separate from events) |
| `web/src/services/sync/operations.ts` | Clear snapshot on full sync |
| `web/src/features/account-dialog.ts` | Add "Compact Now" button |
| `shared/constants.json` | Add `compaction` section |
| `shared/schemas/snapshot.schema.json` | New file |

### iOS

| File | Changes |
|------|---------|
| `ios/Trunk/Services/EventDerivation.swift` | Add `deriveStateFromSnapshot()`, add fields to DerivedSprout |
| `ios/Trunk/Services/EventStore.swift` | Add snapshot support, modify `getState()`, `maybeCompact()` |
| `ios/Trunk/Services/Sync/SyncOperations.swift` | Clear snapshot on full sync |
| `ios/Trunk/Components/DataInfoSheet.swift` | Add "Compact Now" option |

---

## Testing Scenarios

1. **Cold start with snapshot**: Load snapshot + 50 tail events → verify identical state to full 550-event replay
2. **Compaction trigger**: Append event #500 → verify snapshot created and events trimmed
3. **Full sync after compaction**: Force full sync → verify snapshot cleared, full log restored
4. **Export from compacted state**: Export → verify complete event history (no data loss)
5. **Import clears snapshot**: Import backup → verify snapshot cleared, clean state
6. **Streak across compaction boundary**: Water streaks spanning the cutoff point → verify correct count
7. **Pending events not compacted**: Events in pending queue remain in tail
8. **Corrupt snapshot**: Manually corrupt snapshot JSON → verify graceful fallback to full replay
9. **Version mismatch**: Set snapshot version to 99 → verify discarded and full replay
10. **Cross-platform parity**: Same 1000 events → same snapshot JSON (web vs iOS)
