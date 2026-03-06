# Trunk iOS App

Native iOS application for Trunk personal growth tracking.

**Status:** Fully implemented with feature parity to web app

---

## Structure

```
ios/
├── Trunk.xcodeproj/            # Xcode project
├── Trunk/                      # App source code
│   ├── TrunkApp.swift          # App entry point
│   │
│   ├── Models/                 # (Inline in types)
│   │
│   ├── Views/                  # SwiftUI views
│   │   ├── ContentView.swift
│   │   ├── LoginView.swift
│   │   ├── MainTabView.swift
│   │   ├── OverviewView.swift
│   │   ├── BranchView.swift
│   │   ├── TwigDetailView.swift
│   │   ├── TreeCanvasView.swift
│   │   ├── TodayView.swift
│   │   ├── SproutsView.swift
│   │   │
│   │   ├── SettingsView.swift
│   │   │
│   │   ├── Dialogs/            # Modal views
│   │   │   ├── CreateSproutView.swift
│   │   │   ├── EditSproutView.swift
│   │   │   ├── WaterSproutView.swift
│   │   │   ├── WaterDailySproutsView.swift
│   │   │   ├── HarvestSproutView.swift
│   │   │   ├── ShineView.swift
│   │   │   └── SproutActionsView.swift
│   │   │
│   │   ├── Sprouts/            # Sprout list views
│   │   │   ├── SproutsListView.swift
│   │   │   ├── SproutListRow.swift
│   │   │   ├── SproutDetailView.swift
│   │   │   ├── SproutFilterBar.swift
│   │   │   ├── LeafsListView.swift
│   │   │   ├── LeafListRow.swift
│   │   │   └── LeafDetailView.swift
│   │   │
│   │   └── Today/              # Today tab components
│   │       ├── WaterSectionView.swift
│   │       ├── ShineSectionView.swift
│   │       ├── NextHarvestView.swift
│   │       ├── UpcomingHarvestsView.swift
│   │       └── SoilChartView.swift
│   │
│   ├── ViewModels/             # MVVM view models
│   │   ├── ProgressionViewModel.swift
│   │   └── SproutsViewModel.swift
│   │
│   ├── Services/               # Business logic
│   │   ├── AuthService.swift
│   │   ├── EventStore.swift
│   │   ├── EventDerivation.swift
│   │   ├── ProgressionService.swift
│   │   ├── SoilHistoryService.swift
│   │   ├── DataExportService.swift
│   │   ├── SupabaseClient.swift
│   │   ├── SyncEvent.swift
│   │   ├── SyncService.swift
│   │   │
│   │   └── Sync/               # Sync module (split)
│   │       ├── SyncCache.swift
│   │       ├── SyncOperations.swift
│   │       ├── SyncRealtime.swift
│   │       ├── SyncStatus.swift
│   │       └── PendingUploads.swift
│   │
│   ├── Components/             # Reusable components
│   │   ├── BloomDescriptionsView.swift
│   │   ├── GreetingHeader.swift
│   │   ├── SyncIndicatorView.swift
│   │   ├── DataInfoSheet.swift
│   │   └── HapticManager.swift
│   │
│   ├── Extensions/             # Swift extensions
│   │   ├── View+SwipeBack.swift
│   │   ├── View+Animations.swift
│   │   └── DateFormatting.swift
│   │
│   ├── Resources/              # Assets, constants
│   │   └── Theme.swift
│   │
│   ├── Generated/              # Auto-generated code
│   │   └── SharedConstants.swift
│   │
│   ├── Config/                 # Configuration
│   │   └── Secrets.swift
│   │
│   └── Utils/                  # Utilities
│       ├── PayloadHelpers.swift
│       ├── Timeout.swift
│       ├── TreeGeometry.swift
│       ├── TwigIdParser.swift
│       └── Wind.swift
│
├── TrunkTests/                 # Unit tests
└── TrunkUITests/               # UI tests
```

---

## Tech Stack

- **Language:** Swift 5.9+
- **UI Framework:** SwiftUI
- **Architecture:** MVVM
- **Storage:** UserDefaults + JSON files (event-sourced)
- **Networking:** Supabase Swift SDK (realtime + auth)
- **Minimum iOS:** 17.0

---

## Shared Dependencies

The iOS app uses shared specifications from `../shared/`:

- `constants.json` — Numeric constants, formulas (parsed to Swift)
- `schemas/*.schema.json` — Data structure contracts
- `formulas.md` — Progression system formulas

Constants are generated as Swift code in `Trunk/Generated/SharedConstants.swift`.

---

## Design Principles

**Touch-first:** No hover effects, large tap targets, swipe gestures for navigation

**Feature parity:** Matches web app features with mobile-optimized UX:
- Tree navigation optimized for smaller screens
- Swipe gestures for back navigation
- Native iOS patterns (sheets, navigation stacks, etc.)
- Pull-to-refresh for sync

**Event-sourced:** Fully implements event sourcing with Supabase sync parity

**Offline-first:** All data stored locally, optimistic updates, resilient sync

---

## Key Services

### EventStore
Manages the event log and derived state cache. Implements event sourcing with caching and persistence.

### EventDerivation
Replays events to compute current state (soil, sprouts, leaves). Matches web's `derive.ts` logic exactly.

### ProgressionService
Soil cost calculations, capacity rewards, diminishing returns. Implements `shared/formulas.md`.

### SyncService
Supabase sync: optimistic push, incremental pull, realtime subscription, pending upload retry.

### AuthService
Supabase authentication with email OTP.

---

## Development

### Prerequisites

- Xcode 15+
- iOS 17+ device or simulator
- Supabase account (for sync features)

### Setup

1. Open `Trunk.xcodeproj` in Xcode
2. Configure secrets in `Config/Secrets.swift`:
   ```swift
   enum Secrets {
       static let supabaseURL = "https://your-project.supabase.co"
       static let supabaseAnonKey = "your-anon-key"
   }
   ```
3. Build and run (⌘R)

---

## Testing

Cross-platform validation tests ensure iOS matches web behavior:

```
Input: 3m season, firm environment, result=4, currentCapacity=50
Expected: soilCost=8, capacityReward=2.975
```

Both platforms must produce identical results for all formulas.

---

## Cross-Platform Parity

The iOS app implements the same event-sourced architecture as the web app:

| Feature | Web | iOS | Status |
|---------|-----|-----|--------|
| Event sourcing | ✅ | ✅ | Complete |
| Supabase sync | ✅ | ✅ | Complete |
| Realtime updates | ✅ | ✅ | Complete |
| Offline mode | ✅ | ✅ | Complete |
| Tree navigation | ✅ | ✅ | Complete |
| Sprout CRUD | ✅ | ✅ | Complete |
| Water/Sun/Harvest | ✅ | ✅ | Complete |
| Soil charting | ✅ | ✅ | Complete |
| Authentication | ✅ | ✅ | Complete |

---

## Related Documentation

- [../CLAUDE.md](../CLAUDE.md) — Codebase guide
- [../ARCHITECTURE.md](../ARCHITECTURE.md) — System design, data model, sync
- [../RELEASE.md](../RELEASE.md) — Branching, versioning, release process
- [../shared/formulas.md](../shared/formulas.md) — Progression formulas
