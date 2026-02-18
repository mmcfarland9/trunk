# Data Model

## Event-Sourced Architecture

Trunk uses **event sourcing** as its primary data model. All state is derived by replaying an immutable event log. There is no stored mutable state—everything is computed from events.

```
Event Log (immutable) → deriveState() → DerivedState (ephemeral)
```

---

## Event Types

All events are stored in the `trunk-events-v1` log with a `type` discriminator and `timestamp`:

| Event Type | Key Fields | Description |
|------------|-----------|-------------|
| `sprout_planted` | sproutId, twigId, title, season, environment, soilCost, leafId?, bloom* | User plants a new sprout (goal) |
| `sprout_watered` | sproutId, content, prompt? | Daily engagement with an active sprout |
| `sprout_harvested` | sproutId, result (1-5), reflection?, capacityGained | Sprout completed, capacity gained |
| `sprout_uprooted` | sproutId, soilReturned | Sprout abandoned, partial soil returned |
| `sun_shone` | twigId, twigLabel, content, prompt? | Weekly reflection on a twig |
| `leaf_created` | leafId, twigId, name | New saga (leaf) started |

---

## Derived State Shape

The `deriveState()` function replays all events to produce the current state:

```typescript
DerivedState {
  // Resources (computed from events)
  soilCapacity: number       // Grows over lifetime (starts at 10, max 120)
  soilAvailable: number      // Currently available soil

  // Entities (maps for O(1) lookup)
  sprouts: Map<string, DerivedSprout>
  leaves: Map<string, DerivedLeaf>

  // Logs (for display)
  sunEntries: SunEntry[]

  // Indexes (built during derivation for fast queries)
  activeSproutsByTwig: Map<string, DerivedSprout[]>  // Active sprouts per twig
  sproutsByTwig: Map<string, DerivedSprout[]>        // All sprouts per twig
  sproutsByLeaf: Map<string, DerivedSprout[]>        // Sprouts per leaf saga
  leavesByTwig: Map<string, DerivedLeaf[]>           // Leaves per twig
}
```

### DerivedSprout

```typescript
DerivedSprout {
  id: string
  twigId: string
  title: string
  season: '2w' | '1m' | '3m' | '6m' | '1y'
  environment: 'fertile' | 'firm' | 'barren'
  soilCost: number
  leafId?: string              // Optional link to leaf saga
  bloomWither?: string         // 1/5 outcome description
  bloomBudding?: string        // 3/5 outcome description
  bloomFlourish?: string       // 5/5 outcome description

  // Derived state
  state: 'active' | 'completed' | 'uprooted'  // Simplified lifecycle
  plantedAt: string            // ISO8601 timestamp
  harvestedAt?: string         // ISO8601 when completed
  result?: number              // 1-5 when harvested
  reflection?: string          // Harvest reflection
  uprootedAt?: string          // ISO8601 when uprooted
  waterEntries: WaterEntry[]   // All water journal entries
}
```

### DerivedLeaf

```typescript
DerivedLeaf {
  id: string
  twigId: string
  name: string        // User-provided saga name
  createdAt: string   // ISO8601 timestamp
}
```

---

## Sprout Lifecycle

```
active ──► completed
  │
  └──► uprooted
```

**No draft or failed states** — sprouts are planted immediately (active), then either harvested (completed) or abandoned (uprooted). The result (1-5) indicates outcome quality, so "showing up counts" — all harvests are completions.

| State | Soil Status | Can Water | Can Harvest |
|-------|------------|-----------|-------------|
| active | Spent at plant | Yes | Yes (when ready) |
| completed | Returned + capacity gained | No | — |
| uprooted | Partial return (25%) | No | — |

---

## Storage Keys

### Web (localStorage)

| Key | Contents | Type |
|-----|----------|------|
| `trunk-events-v1` | Event log (source of truth) | TrunkEvent[] |
| `trunk-last-sync` | Most recent server timestamp | ISO8601 string |
| `trunk-cache-version` | Cache schema version | "1" |
| `trunk-pending-uploads` | Events awaiting server sync | string[] (client_ids) |
| `trunk-last-export` | Last export timestamp | number (ms) |

**Legacy keys** (deprecated, for migration only):
- `trunk-notes-v1` — Old node data, sun log, soil log
- `trunk-resources-v1` — Old resource counters

### iOS (UserDefaults + File)

**UserDefaults:**
- `trunk-last-sync` → ISO8601 string
- `trunk-cache-version` → Int (1)

**File:** `ApplicationSupport/Trunk/events-cache.json`

```json
{
  "events": [...],
  "pendingUploadClientIds": ["2024-01-15T10:30:00Z-abc123", ...],
  "lastSyncTimestamp": "2024-01-15T10:30:00Z",
  "cacheVersion": 1,
  "lastWrittenAt": "2024-01-15T10:30:05Z"
}
```

---

## Log Entry Types

### WaterEntry

```typescript
{
  timestamp: string,    // ISO8601
  content: string,      // Journal entry
  prompt?: string       // AI prompt used (if any)
}
```

### SunEntry

```typescript
{
  timestamp: string,    // ISO8601
  content: string,      // Reflection text
  prompt?: string,      // AI prompt used (if any)
  context: {
    twigId: string,
    twigLabel: string
  }
}
```

---

## iOS SyncEvent Model (ios/Trunk/Services/SyncEvent.swift)

The iOS counterpart of web's `TrunkEvent`. Defines the event structure used for Supabase sync:

```swift
struct SyncEvent: Codable, Identifiable {
  let id: Int?                         // Server-assigned ID
  let userId: String
  let type: String                     // Event type (e.g. "sprout_planted")
  let payload: [String: AnyCodable]    // Event-specific data
  let clientTimestamp: String           // ISO8601 creation time
  let clientId: String                 // Unique client-generated ID
  let serverTimestamp: String?         // Set by Supabase on insert
}

struct SyncEventInsert: Codable {
  let type: String
  let payload: [String: AnyCodable]
  let clientTimestamp: String
  let clientId: String
}
```

`AnyCodable` is a hand-rolled type-erased wrapper for JSON payload values, supporting `String`, `Int`, `Double`, and `Bool` types. Decode order matters (String → Int → Double → Bool) to preserve type fidelity.

---

## Enums

### Season
```typescript
'2w' | '1m' | '3m' | '6m' | '1y'
```

### Environment
```typescript
'fertile' | 'firm' | 'barren'
```

### Sprout State
```typescript
'active' | 'completed' | 'uprooted'
```

---

## Constants Reference (from shared/constants.json)

### Tree Structure
- Branches: 8
- Twigs per branch: 8
- Total twigs: 64

### Soil

| Property | Value |
|----------|-------|
| Starting capacity | 10 |
| Max capacity | 120 |
| Recovery per water | 0.05 |
| Recovery per sun | 0.35 |
| Uproot refund rate | 0.25 (25%) |

### Planting Costs (soil)

| Season | Fertile | Firm | Barren |
|--------|---------|------|--------|
| 2w | 2 | 3 | 4 |
| 1m | 3 | 5 | 6 |
| 3m | 5 | 8 | 10 |
| 6m | 8 | 12 | 16 |
| 1y | 12 | 18 | 24 |

### Environment Multipliers (reward)
- Fertile: 1.1×
- Firm: 1.75×
- Barren: 2.4×

### Result Multipliers (reward)
- 1 → 0.4× (showed up but minimal progress)
- 2 → 0.55× (partial progress)
- 3 → 0.7× (met expectations)
- 4 → 0.85× (exceeded expectations)
- 5 → 1.0× (exceptional outcome)

### Resource Resets
- Water: 3/day, resets 6:00 AM local time
- Sun: 1/week, resets 6:00 AM Monday local time

---

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) — Codebase guide (system prompt)
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System diagrams, event sourcing, sync architecture
- [ONBOARDING.md](./ONBOARDING.md) — Quick start, common tasks, contributing
- [INTERFACES.md](./INTERFACES.md) — Module APIs, extension points
- [RUNBOOK.md](./RUNBOOK.md) — Deployment, common issues
- [VERSIONING.md](./VERSIONING.md) — Version strategy, release process
