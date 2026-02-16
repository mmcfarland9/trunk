# Trunk Architecture

## High-Level Structure

```
┌─────────────────────────────────────────────────────────┐
│                      MONOREPO                           │
├─────────────┬─────────────┬─────────────────────────────┤
│   web/      │   ios/      │         shared/             │
│  (Vite+TS)  │ (SwiftUI)   │  (constants, schemas)       │
├─────────────┴─────────────┴─────────────────────────────┤
│              localStorage / SwiftData                    │
│                  (no backend)                           │
└─────────────────────────────────────────────────────────┘
```

Both platforms implement the same progression system using shared specifications.
No server—all data stays on-device.

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
main.ts (entry)
    │
    ├── dom-builder.ts ──► Returns elements{} + branchGroups[]
    │
    ├── state.ts / events/ ──► State management
    │       │
    │       └── derive.ts ──► Computes current state from logs
    │
    ├── features/
    │   ├── navigation.ts ──► View transitions
    │   ├── progress.ts ──► Stats calculation
    │   ├── water-dialog.ts ──► Watering modal
    │   ├── harvest-dialog.ts ──► Harvest modal
    │   ├── shine-dialog.ts ──► Sun reflection modal
    │   └── import-export.ts ──► Backup/restore
    │
    └── ui/
        ├── layout.ts ──► Node positioning, SVG guides
        ├── node-ui.ts ──► Node state sync
        ├── twig-view.ts ──► Sprout CRUD panel
        └── leaf-view.ts ──► Saga history view
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

---

## iOS App Architecture (MVVM)

```
TrunkApp.swift (entry)
    │
    ├── Models/
    │   ├── Sprout.swift, Leaf.swift, NodeData.swift
    │   └── ResourceState.swift, WaterEntry.swift, SunEntry.swift
    │
    ├── ViewModels/
    │   └── ProgressionViewModel.swift ──► All state computation
    │
    ├── Views/
    │   ├── MainTabView.swift ──► Tab navigation
    │   ├── OverviewView / BranchView / TwigDetailView
    │   ├── TodayView ──► Daily focus (unique to iOS)
    │   └── Dialogs/ ──► Create, Water, Harvest, Shine
    │
    └── Services/
        ├── ProgressionService.swift ──► Formulas from shared/
        └── DataExportService.swift ──► JSON export/import
```

Storage: SwiftData (on-device, mirrors web's event model)

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
         │  trunk-map-preset.json│
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

3. **Idempotent pushes**: Each event has a unique `client_id` (content-based hash). Duplicate pushes are safely ignored via database constraint.

4. **Incremental pulls**: Only fetch events since `last_sync` timestamp. Full pulls only when cache is invalidated.

5. **Realtime subscription**: Supabase broadcasts INSERT events to all connected devices. Deduplication prevents echoing our own pushes.

6. **Pending retry queue**: Failed pushes are tracked in `pendingUploadIds` and retried on next sync. Events are never lost during network failures.

7. **Cache fallback**: On network error during full sync, existing cache remains intact. App continues functioning offline.

8. **Visibility sync**: Re-sync when tab/app becomes visible to catch up on events from other devices.

### Deduplication Strategy

Events are deduplicated at multiple levels:

- **Server**: Unique constraint on `client_id` prevents duplicate inserts (Postgres error 23505)
- **Pull**: Filter out events whose `client_timestamp` already exists locally
- **Realtime**: Check for existing `client_timestamp` before appending broadcast events

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

Both platforms use a shared error code registry to ensure consistent user-facing messages across web and iOS.

### Error Code Registry

**Location:** `shared/error-codes.json`

**Structure:**
```json
{
  "auth": {
    "NOT_CONFIGURED": {
      "code": "AUTH_001",
      "defaultMessage": "...",
      "userMessage": "..."
    }
  },
  "sync": { ... },
  "validation": { ... }
}
```

### Categories

| Category | Purpose | Example Codes |
|----------|---------|---------------|
| **auth** | Authentication errors | `NOT_CONFIGURED`, `INVALID_CODE`, `CODE_EXPIRED`, `RATE_LIMITED` |
| **sync** | Cloud sync errors | `NOT_CONFIGURED`, `NOT_AUTHENTICATED`, `NETWORK_ERROR`, `CONFLICT` |
| **validation** | Input/business logic validation | `TITLE_TOO_LONG`, `INSUFFICIENT_SOIL`, `NO_WATER`, `NO_SUN` |

### Usage Examples

**Web (TypeScript):**
```typescript
import { getUserMessage, getErrorInfo } from '@/utils/error-codes'

// Get user-facing message
const message = getUserMessage('auth', 'NOT_CONFIGURED')

// Get full error info
const info = getErrorInfo('sync', 'NOT_AUTHENTICATED')
console.log(info.code)           // 'SYNC_002'
console.log(info.userMessage)     // User-friendly message
console.log(info.defaultMessage)  // Technical message
```

**iOS (Swift):**
```swift
import Foundation

// Get user-facing message
let message = ErrorCodes.getUserMessage(category: "auth", errorKey: "NOT_CONFIGURED")

// Get full error info
let info = ErrorCodes.shared.getErrorInfo(category: "sync", errorKey: "NOT_AUTHENTICATED")
print(info.code)           // "SYNC_002"
print(info.userMessage)     // User-friendly message
print(info.defaultMessage)  // Technical message
```

### Design Principles

1. **User messages are non-technical** — Explain what happened in plain language
2. **Default messages are technical** — Used for logging and debugging
3. **Codes are unique** — Each code maps to exactly one error condition
4. **Categories are domain-aligned** — Matches service boundaries (auth, sync, validation)

### Future Work

Error code utilities are infrastructure-only. Existing error handling call sites (auth-service, sync-service) will be migrated incrementally to use the shared registry.

---

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) — Detailed codebase guide
- [ONBOARDING.md](./ONBOARDING.md) — Quick start and common tasks
- [DATA_MODEL.md](./DATA_MODEL.md) — Entity relationships and storage
- [INTERFACES.md](./INTERFACES.md) — Module APIs and extension points
