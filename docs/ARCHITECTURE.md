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

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) — Detailed codebase guide
- [ONBOARDING.md](./ONBOARDING.md) — Quick start and common tasks
- [DATA_MODEL.md](./DATA_MODEL.md) — Entity relationships and storage
- [INTERFACES.md](./INTERFACES.md) — Module APIs and extension points
