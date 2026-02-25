# Trunk Architecture

## High-Level Structure

```
┌─────────────────────────────────────────────────────────┐
│                      MONOREPO                           │
├─────────────┬─────────────┬─────────────────────────────┤
│   web/      │   ios/      │         shared/             │
│  (Vite+TS)  │ (SwiftUI)   │  (constants, schemas)       │
├─────────────┴─────────────┴─────────────────────────────┤
│     localStorage (web) / JSON file cache (iOS)           │
│           ↕ Supabase (optional cloud sync)               │
└─────────────────────────────────────────────────────────┘
```

Both platforms implement the same progression system using shared specifications.
Local-first architecture with optional Supabase cloud sync for multi-device access. App works fully offline.

## Core Abstraction: The Tree

```
TRUNK (1)
  └── BRANCH (8) — major life domains
        └── TWIG (64) — specific facets
              ├── SPROUT — active goals
              └── LEAF — sagas (chains of related goals)
```

Node IDs: `trunk`, `branch-0` through `branch-7`, `branch-{b}-twig-{t}`

---

## Event-Sourced Architecture (Web)

State is never stored directly. Actions are logged, state is derived:

```
User Action → append(event) → localStorage → derive() → UI Update
                   │
                   ▼
            Immutable Log
         ┌─────────────────┐
         │ { type: 'plant' │
         │   sproutId: ... │
         │   timestamp: ...}│
         │ { type: 'water' │
         │   ... }         │
         └─────────────────┘
```

**Why this matters:**
- Anti-cheat: Resources derived from logs, not editable counters
- Full history: Export includes complete audit trail
- Reproducible: Same events → same state

### Event Types

| Event | Triggered By | Affects |
|-------|--------------|---------|
| `sprout_planted` | Planting a sprout | Soil spent, sprout active |
| `sprout_watered` | Daily watering | Water log, sprout progress |
| `sprout_harvested` | Completing a goal | Soil capacity gained |
| `sprout_uprooted` | Abandoning a goal | Sprout removed (partial refund) |
| `sun_shone` | Weekly reflection | Sun log, twig note |
| `leaf_created` | Starting a saga | Leaf added to twig |

### Derived State

```typescript
// Resources derived from logs, not stored
getWaterAvailable() = capacity - countWaterEntriesSince(todayReset)
getSunAvailable()   = capacity - countSunEntriesSince(weekReset)
getSoilCapacity()   = startingCapacity + sumAllCapacityRewards()
```

---

## Web App Module Graph

```
bootstrap/ (app initialization - split from main.ts)
    ├── auth.ts ──► Authentication setup
    ├── events.ts ──► Event listener wiring
    ├── sync.ts ──► Sync initialization
    └── ui.ts ──► DOM construction & feature setup
         │
         ├── ui/dom-builder/ ──► Returns elements{} + branchGroups[]
         │   ├── index.ts ──► Main builder orchestration
         │   ├── build-dialogs.ts ──► All dialog modals
         │   ├── build-header.ts ──► Header & sync badge
         │   ├── build-sidebar.ts ──► Sidebar container
         │   └── build-tree-nodes.ts ──► Trunk/branch/twig nodes
         │
         ├── state/ / events/ ──► State management
         │   ├── state/index.ts ──► Legacy view state
         │   └── events/ ──► Event sourcing core
         │       ├── store.ts ──► Event log persistence
         │       ├── derive.ts ──► Computes current state
         │       ├── soil-charting.ts ──► Capacity tracking
         │       └── radar-charting.ts ──► Per-branch engagement scores
         │
         ├── services/ ──► Cloud services (auth, sync)
         │   ├── auth-service.ts ──► Authentication logic
         │   ├── sync-types.ts ──► Sync event data models
         │   └── sync/ ──► Cloud sync (split from sync-service.ts)
         │       ├── index.ts ──► Public API
         │       ├── operations.ts ──► Push/pull logic
         │       ├── cache.ts ──► Local cache management
         │       ├── pending-uploads.ts ──► Retry queue
         │       ├── realtime.ts ──► Supabase subscriptions
         │       └── status.ts ──► Sync status tracking
         │
         ├── lib/
         │   └── supabase.ts ──► Supabase client configuration
         │
         ├── constants.ts ──► UI constants + re-exports from generated
         │
         ├── features/
         │   ├── navigation.ts ──► View transitions
         │   ├── progress.ts ──► Stats calculation
         │   ├── water-dialog.ts ──► Watering modal
         │   ├── harvest-dialog.ts ──► Harvest modal
         │   ├── shine-dialog.ts ──► Sun reflection modal
         │   ├── log-dialogs.ts ──► History views
         │   ├── account-dialog.ts ──► Account settings
         │   └── hover-branch.ts ──► Branch hover detection
         │
         ├── utils/ ──► Pure utility functions (no dependencies)
         │   ├── calculations.ts ──► Soil, water, sun math
         │   ├── safe-storage.ts ──► localStorage wrapper
         │   ├── debounce.ts ──► Debounce helper
         │   ├── dom-helpers.ts ──► DOM utility functions
         │   ├── date-formatting.ts ──► Date display formatting
         │   ├── twig-id.ts ──► Twig ID parsing
         │   ├── sprout-labels.ts ──► Sprout display labels
         │   ├── validate-import.ts ──► Import data validation
         │   ├── escape-html.ts ──► HTML escaping (XSS prevention)
         │   ├── presets.ts ──► Preset label/note helpers
         │   └── wind.ts ──► Seeded wind sway animation for branches and radar
         │
         └── ui/
             ├── layout.ts ──► Node positioning, SVG guides
             ├── node-ui.ts ──► Node state sync
             ├── progress-panel.ts ──► Sidebar sprout cards & grouping
             ├── twig-view/ ──► Sprout CRUD panel (split from twig-view.ts)
             │   ├── index.ts ──► Main orchestration
             │   ├── sprout-cards.ts ──► Card rendering
             │   ├── event-handlers.ts ──► User interactions
             │   ├── form-validation.ts ──► Input validation
             │   ├── build-panel.ts ──► Panel construction
             │   └── sprout-form.ts ──► Form state
             ├── leaf-view.ts ──► Saga history view
             ├── login-view.ts ──► Authentication UI
             ├── soil-chart.ts ──► SVG soil capacity chart in sidebar
             └── radar-chart.ts ──► SVG radar/spider chart overlaid on tree map
```

### Callback Pattern

Features don't import each other. They receive callbacks:

```typescript
setupWaterDialog(ctx, {
  onWaterUsed: () => updateStats(ctx),
  onSproutUpdated: () => refreshTwigView(ctx),
})
```

This keeps modules decoupled and testable.

### Module Boundary Conventions

Each top-level directory in `web/src/` has a specific responsibility:

| Directory | Responsibility | Imports From | Exports |
|-----------|---------------|--------------|---------|
| **bootstrap/** | App initialization and wiring | All modules | Initialization functions |
| **ui/** | DOM construction, rendering, layout | state/, utils/ | Element references, render functions |
| **features/** | Orchestration and dialog management | ui/, state/, events/, services/ | Feature setup functions |
| **events/** | Event sourcing core | utils/, types | Event types, derivation, store |
| **services/** | Cloud services (auth, sync) | events/, lib/ | Service APIs |
| **state/** | Legacy view state (in-memory) | types | View mode, navigation state |
| **utils/** | Pure utility functions | None (leaf nodes) | Helper functions |

**Key principles:**
- **features/** orchestrates but doesn't render—calls ui/ modules for DOM updates
- **ui/** renders but doesn't orchestrate—receives callbacks for coordination
- **events/** is the source of truth—never imports from features/ or ui/
- **services/** only depends on events/ and lib/—never imports features/
- **utils/** has zero dependencies—pure functions only

---

## iOS App Architecture (MVVM)

```
TrunkApp.swift (entry)
    │
    ├── ViewModels/
    │   ├── ProgressionViewModel.swift ──► Soil/resource state for views
    │   └── SproutsViewModel.swift ──► Sprout list state for views
    │
    ├── Views/
    │   ├── ContentView.swift ──► Root view
    │   ├── LoginView.swift ──► Authentication UI
    │   ├── MainTabView.swift ──► Tab navigation
    │   ├── OverviewView.swift / BranchView.swift / TwigDetailView.swift
    │   ├── TreeCanvasView.swift ──► Tree visualization
    │   ├── SproutsView.swift ──► Sprout management
    │   ├── TodayView.swift ──► Daily focus (unique to iOS)
    │   ├── Today/ ──► Today sub-views
    │   │   ├── WaterSectionView.swift
    │   │   ├── ShineSectionView.swift
    │   │   ├── NextHarvestView.swift
    │   │   └── SoilChartView.swift
    │   ├── Sprouts/ ──► Sprout sub-views
    │   │   ├── SproutsListView.swift
    │   │   ├── SproutListRow.swift
    │   │   ├── SproutDetailView.swift
    │   │   └── SproutFilterBar.swift
    │   └── Dialogs/ ──► Modal dialogs
    │       ├── CreateSproutView.swift
    │       ├── WaterSproutView.swift
    │       ├── WaterDailySproutsView.swift
    │       ├── HarvestSproutView.swift
    │       ├── ShineView.swift
    │       └── SproutActionsView.swift
    │
    ├── Components/ ──► Reusable UI components
    │   ├── GreetingHeader.swift
    │   ├── SyncIndicatorView.swift
    │   ├── DataInfoSheet.swift
    │   ├── HapticManager.swift
    │   └── BloomDescriptionsView.swift
    │
    ├── Extensions/ ──► Swift extensions
    │   ├── View+SwipeBack.swift
    │   ├── View+Animations.swift
    │   └── DateFormatting.swift
    │
    ├── Utils/ ──► Utility types
    │   ├── ErrorCodes.swift
    │   ├── PayloadHelpers.swift
    │   └── TwigIdParser.swift
    │
    ├── Config/
    │   └── Secrets.swift ──► API keys (gitignored)
    │
    ├── Resources/
    │   └── Theme.swift ──► Color/style constants
    │
    └── Services/
        ├── EventDerivation.swift ──► Derived types + state derivation
        ├── EventStore.swift ──► Event persistence & cache
        ├── ProgressionService.swift ──► Formulas from shared/
        ├── SoilHistoryService.swift ──► Soil charting
        ├── SyncEvent.swift ──► Sync event data model
        ├── DataExportService.swift ──► JSON export/import
        ├── AuthService.swift ──► Authentication
        ├── SupabaseClient.swift ──► Supabase configuration
        └── SyncService.swift (thin facade)
            └── Sync/ ──► Sync implementation (mirrors web's services/sync/)
                ├── SyncCache.swift ──► Local cache management
                ├── PendingUploads.swift ──► Retry queue
                ├── SyncOperations.swift ──► Push/pull logic
                ├── SyncRealtime.swift ──► Supabase subscriptions
                └── SyncStatus.swift ──► Sync status tracking
```

Storage: JSON file cache (ApplicationSupport/Trunk/events-cache.json) + UserDefaults (mirrors web's event model)

---

## Cross-Platform Parity

```
┌──────────┐     export JSON      ┌──────────┐
│   Web    │ ◄──────────────────► │   iOS    │
└──────────┘     import JSON      └──────────┘
        │                               │
        └───────── shared/ ─────────────┘
                     │
         ┌───────────┴───────────┐
         │  constants.json       │
         │  formulas.md          │
         │  schemas/*.json       │
         │  protocols.md         │
         └───────────────────────┘
```

Both platforms MUST produce identical results for:
- Soil costs (planting)
- Capacity rewards (harvesting)
- Resource availability (water/sun resets)

Test fixtures in `shared/test-fixtures/` verify round-trip parity.

---

## Sync Architecture

**Philosophy**: Local-first with optimistic sync via Supabase

Trunk uses event sourcing with cloud backup. All user actions are immediately reflected locally, then synchronized to Supabase for multi-device access.

### Sync Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Action                              │
│                  (plant, water, harvest, etc.)                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │  Append to Local │
                  │   Event Store    │
                  │  (optimistic)    │
                  └─────────┬────────┘
                            │
                            ├──► Update UI (immediate)
                            │
                            ▼
                  ┌──────────────────┐
                  │   Push Event to  │
                  │    Supabase      │
                  │  (background)    │
                  └─────────┬────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
           SUCCESS                   FAILURE
                │                       │
                ▼                       ▼
        Remove from Pending    Keep in Pending
        Mark as Confirmed      Retry on Next Sync
                │                       │
                └───────────┬───────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │  Realtime        │
                  │  Broadcast       │
                  │  (Supabase)      │
                  └─────────┬────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │  Other Devices   │
                  │  Receive Event   │
                  │  via Realtime    │
                  └──────────────────┘
```

### Smart Sync Strategy

```
                    App Launch / Tab Visible
                            │
                            ▼
                  ┌──────────────────┐
                  │ Is Cache Valid?  │
                  │ (check version)  │
                  └─────────┬────────┘
                            │
                ┌───────────┴───────────┐
              YES                      NO
                │                       │
                ▼                       ▼
      ┌──────────────────┐    ┌──────────────────┐
      │ Incremental Sync │    │    Full Sync     │
      │                  │    │                  │
      │ 1. Retry pending │    │ 1. Retry pending │
      │ 2. Pull since    │    │ 2. Fetch ALL     │
      │    last_sync     │    │    events        │
      │ 3. Deduplicate   │    │ 3. Replace cache │
      │ 4. Append new    │    │ 4. Update version│
      └─────────┬────────┘    └─────────┬────────┘
                │                       │
                └───────────┬───────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │  Network Error?  │
                  └─────────┬────────┘
                            │
                ┌───────────┴───────────┐
              YES                      NO
                │                       │
                ▼                       ▼
      ┌──────────────────┐    ┌──────────────────┐
      │ Keep Cached Data │    │  Update Cache &  │
      │ Show "offline"   │    │  Sync Timestamp  │
      │ Status Badge     │    │  Show "synced"   │
      └──────────────────┘    └──────────────────┘
```

### Key Design Decisions

1. **Local-first**: User actions never wait for network. Events are applied to local state immediately, then synced in the background.

2. **Optimistic updates**: UI reflects changes before server confirmation. Failed pushes are queued for retry instead of being rolled back.

3. **Idempotent pushes**: Each event has a unique `client_id` (UUID-based). Duplicate pushes are safely ignored via database constraint.

4. **Incremental pulls**: Only fetch events since `last_sync` timestamp. Full pulls only when cache is invalidated.

5. **Realtime subscription**: Supabase broadcasts INSERT events to all connected devices. Deduplication prevents echoing our own pushes.

6. **Pending retry queue**: Failed pushes are tracked in `pendingUploadIds` and retried on next sync. Events are never lost during network failures.

7. **Cache fallback**: On network error during full sync, existing cache remains intact. App continues functioning offline.

8. **Visibility sync**: Re-sync when tab/app becomes visible to catch up on events from other devices.

9. **Visibility cache invalidation**: Separate from sync's `startVisibilitySync()` — `startVisibilityCacheInvalidation()` (in `events/store.ts`) invalidates cached water/sun availability when the tab becomes visible, preventing stale resource counts after crossing a 6am reset boundary.

### Deduplication Strategy

Events are deduplicated at multiple levels:

- **Server**: Unique constraint on `client_id` prevents duplicate inserts (Postgres error 23505)
- **Derivation**: `deriveState()` deduplicates using `client_id` if present, else a composite key of `type|entityId|timestamp`
- **Pull**: Filter out events whose `client_id` already exists locally
- **Realtime**: Check for existing `client_id` before appending broadcast events

This ensures eventual consistency across devices without duplicate events.

### Storage Keys

**Web** (localStorage):
- `trunk-events-v1`: Event log (array of TrunkEvent)
- `trunk-last-sync`: ISO8601 timestamp of most recent server event
- `trunk-cache-version`: Schema version (currently `1`)
- `trunk-pending-uploads`: Array of client_id strings awaiting server confirmation

**iOS** (UserDefaults + File):
- `ApplicationSupport/Trunk/events-cache.json`: Full cache (events + pending + metadata)
- `trunk-last-sync` (UserDefaults): ISO8601 timestamp
- `trunk-cache-version` (UserDefaults): Schema version (Int)

### Sync Status

UI displays sync state via detailed status:
- `synced`: All events confirmed, no pending uploads
- `syncing`: Pull or push in progress
- `pendingUpload`: Local events awaiting server confirmation (shown as amber badge)
- `offline`: Last sync failed, using cached data (shown as gray badge)
- `loading`: First sync in progress, no cache yet

See [shared/sync-protocol.md](../shared/sync-protocol.md) for complete specification including algorithms, error recovery, and platform parity requirements.

---

## Error Handling

A shared error code registry exists at `shared/error-codes.json` for consistent user-facing messages. iOS has `ErrorCodes.swift` for reading these codes. The web utility module (`error-codes.ts`) was removed as dead code — it was never wired into call sites. Error handling on web currently uses inline messages in auth-service and sync-service.

---

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) — Codebase guide (system prompt)
- [ONBOARDING.md](./ONBOARDING.md) — Quick start, common tasks, contributing
- [DATA_MODEL.md](./DATA_MODEL.md) — Entity relationships, event types, storage
- [INTERFACES.md](./INTERFACES.md) — Module APIs, extension points
- [RUNBOOK.md](./RUNBOOK.md) — Deployment, common issues
- [VERSIONING.md](./VERSIONING.md) — Version strategy, release process
