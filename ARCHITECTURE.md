# Trunk Architecture

## Event-Sourced Core

All state is derived by replaying an immutable event log. No mutable stored state.

```
Event Log (immutable) -> deriveState() -> DerivedState (ephemeral)
```

### Event Types

| Event | Key Fields |
|-------|------------|
| `sprout_planted` | sproutId, twigId, title, season, environment, soilCost, leafId?, bloom* |
| `sprout_watered` | sproutId, content, prompt? |
| `sprout_harvested` | sproutId, result (1-5), reflection?, capacityGained |
| `sprout_uprooted` | sproutId, soilReturned |
| `sprout_edited` | sproutId, then any mutable field (sparse merge) |
| `sun_shone` | twigId, twigLabel, content, prompt? |
| `leaf_created` | leafId, twigId, name |

### Derived State

```typescript
DerivedState {
  soilCapacity: number       // 10 -> 120 over ~20 years
  soilAvailable: number

  sprouts: Map<string, DerivedSprout>
  leaves: Map<string, DerivedLeaf>
  sunEntries: SunEntry[]

  // Indexes (built during derivation)
  activeSproutsByTwig: Map<string, DerivedSprout[]>
  sproutsByTwig: Map<string, DerivedSprout[]>
  sproutsByLeaf: Map<string, DerivedSprout[]>
  leavesByTwig: Map<string, DerivedLeaf[]>
}
```

### DerivedSprout

```typescript
DerivedSprout {
  id, twigId, title, season, environment, soilCost, leafId?
  bloomWither?, bloomBudding?, bloomFlourish?
  state: 'active' | 'completed' | 'uprooted'
  plantedAt, harvestedAt?, result?, reflection?, uprootedAt?
  waterEntries: WaterEntry[]
}
```

### Sprout Lifecycle

```
active --> completed (harvested, capacity gained)
  |
  \--> uprooted (partial soil refund)
```

---

## Tree Structure

```
TRUNK (1)
  -> BRANCH (8) — life domains
       -> TWIG (64) — specific facets
             -> SPROUT — active goals
             -> LEAF — sagas (chains of related goals)
```

---

## Web Module Graph

```
bootstrap/          App initialization
  auth.ts           Authentication setup
  events.ts         Event listener wiring
  sync.ts           Sync initialization
  ui.ts             DOM construction & feature setup

ui/dom-builder/     DOM construction -> elements{} + branchGroups[]
ui/twig-view/       Sprout CRUD panel (6 modules)
ui/                 layout, node-ui, progress-panel, radar-chart, soil-chart, login-view, leaf-view

features/           Business logic (navigation, progress, dialogs, hover)
events/             Event sourcing (store, derive, soil-charting, radar-charting)
services/           Auth + sync (sync/ has 7 modules incl dedup)
utils/              Pure functions (zero dependencies)
state/              In-memory view state
```

**Module rules:** features/ orchestrates, ui/ renders via callbacks, events/ is source of truth, utils/ has zero deps.

---

## iOS Module Graph

```
TrunkApp.swift                Entry point

ViewModels/
  ProgressionViewModel        Soil/resource state
  SproutsViewModel            Sprout list state

Views/                        SwiftUI views (ContentView, MainTabView, Today/, Sprouts/, Dialogs/)
Components/                   Reusable UI (GreetingHeader, SyncIndicator, HapticManager)
Extensions/                   SwipeBack, Animations, DateFormatting

Services/
  EventDerivation             Derived types + state derivation (free functions)
  EventStore                  @MainActor singleton, debounced disk writes
  ProgressionService          Formulas from shared/
  AuthService                 Authentication
  SyncService                 Thin facade -> Sync/ (5 extensions)
  DataExportService           JSON export/import
```

---

## Sync

Local-first, optimistic push to Supabase `events` table.

```
User Action -> Append Local -> Update UI (instant)
                    |
                    v
              Push to Supabase (background)
                    |
              Success: remove from pending
              Failure: retry on next sync
                    |
              Realtime broadcast -> other devices
```

- Incremental pull by `created_at`, full-sync fallback
- Dedup: server `UNIQUE(client_id)`, client-side by `client_id` + composite key
- Pending uploads tracked and retried
- Re-sync on tab/app visibility change

### Storage

**Web (localStorage):**
| Key | Contents |
|-----|----------|
| `trunk-events-v1` | Event log |
| `trunk-last-sync` | ISO8601 timestamp |
| `trunk-cache-version` | `"1"` |
| `trunk-pending-uploads` | client_id strings |

**iOS (UserDefaults + File):**
| Location | Contents |
|----------|----------|
| `ApplicationSupport/Trunk/events-cache.json` | events + pending + metadata |
| `trunk-last-sync` (UserDefaults) | ISO8601 timestamp |
| `trunk-cache-version` (UserDefaults) | Int |

---

## Enums

| Type | Values |
|------|--------|
| Season | `2w`, `1m`, `3m`, `6m`, `1y` |
| Environment | `fertile`, `firm`, `barren` |
| Sprout State | `active`, `completed`, `uprooted` |

## Constants (from shared/constants.json)

- **Tree**: 8 branches, 8 twigs each, 64 total
- **Soil**: starts 10, max 120, water recovery +0.05, sun recovery +0.35, uproot refund 25%
- **Water**: 3/day, resets 6am local
- **Sun**: 1/week, resets 6am Monday local
- **Environment multipliers**: fertile 1.1x, firm 1.75x, barren 2.4x
- **Result multipliers**: 1->0.4x, 2->0.55x, 3->0.7x, 4->0.85x, 5->1.0x

See `shared/formulas.md` for full progression math.
